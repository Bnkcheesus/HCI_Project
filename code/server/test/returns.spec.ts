/**
 * Giving a book back — the half of the loop borrowing cannot prove on its own.
 *
 * Like `checkout.spec.ts`, these tests write to the database and restore the fixture
 * afterwards rather than undoing what they did. Restoring to a known state is what keeps
 * the suite idempotent no matter what any test did to get there — an earlier version of
 * that hook incremented counts back per loan and drifted silently across runs.
 *
 * Prerequisite: `npm run db:migrate && npm run db:seed`.
 */
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { availability, loanHistory } from '@/mocks'
import type { AccountSlip, LoanSlip } from '@/shared/types'
import { buildApp } from '../app.ts'
import { createDb } from '../db/dialect.ts'
import {
  returnBook,
  type ReturnFailure,
  type ReturnResult,
  type ReturnedLoan,
} from '../services/returnBook.ts'

const db = createDb()
let app: FastifyInstance

/** Slips written by a test, removed afterwards so the next one starts where it expected. */
const written: string[] = []

beforeAll(async () => {
  app = buildApp(db)
  await app.ready()
})

/**
 * Put the fixture back exactly as seeded — both halves of it.
 *
 * A returns suite has to restore `loans.returned_at` as well as the copy counts, which
 * the checkout suite never touches. Without that, the first test to return a seeded loan
 * would leave it closed and every later test that expects that card to have books out
 * would fail for a reason unrelated to what it is testing.
 */
afterEach(async () => {
  for (const slipId of written.splice(0)) {
    await db.deleteFrom('loans').where('slip_id', '=', slipId).execute()
    await db.deleteFrom('loan_slips').where('id', '=', slipId).execute()
  }

  await db.transaction().execute(async (trx) => {
    for (const [bookId, record] of Object.entries(availability)) {
      await trx
        .updateTable('availability')
        .set({ copies_available: record.copiesAvailable, status: record.status })
        .where('book_id', '=', bookId)
        .execute()
    }

    for (const loan of loanHistory) {
      await trx
        .updateTable('loans')
        .set({ returned_at: loan.returnedAt })
        /*
         * `${slipId}::${bookId}`, not `loan.id`.
         *
         * The fixture's own ids are `loan-1`, `loan-limit-3` and so on, but the seeder
         * discards them and derives the primary key from the slip and the book (see
         * server/db/seed.ts). Matching on `loan.id` updates *zero rows* and fails silently
         * — every test then inherits whatever the previous one left behind, and the suite
         * slowly eats its own fixture. That is not hypothetical: it is how this file
         * behaved on its first run.
         */
        .where('id', '=', `${loan.slipId}::${loan.bookId}`)
        .execute()
    }
  })
})

afterAll(async () => {
  await app.close()
  await db.destroy()
})

async function borrow(cardCode: string, bookIds: string[]) {
  const response = await app.inject({ method: 'POST', url: '/api/loans', payload: { cardCode, bookIds } })
  const body = response.json() as { slip?: LoanSlip; failure?: unknown }
  if (body.slip) written.push(body.slip.id)
  return { status: response.statusCode, ...body }
}

async function giveBack(cardCode: string, bookId: string) {
  const response = await app.inject({ method: 'POST', url: '/api/returns', payload: { cardCode, bookId } })
  const body = response.json() as { loan?: ReturnedLoan; failure?: ReturnFailure }
  return { status: response.statusCode, ...body }
}

async function copiesOf(bookId: string): Promise<number> {
  const row = await db
    .selectFrom('availability')
    .select('copies_available')
    .where('book_id', '=', bookId)
    .executeTakeFirstOrThrow()
  return row.copies_available
}

async function openLoanCount(cardCode: string): Promise<number> {
  const rows = await db
    .selectFrom('loans')
    .select('id')
    .where('card_code', '=', cardCode)
    .where('returned_at', 'is', null)
    .execute()
  return rows.length
}

describe('POST /api/returns', () => {
  it('closes the loan and puts the copy back on the shelf', async () => {
    const before = await copiesOf('giai-tich-1')
    await borrow('20215012', ['giai-tich-1'])
    expect(await copiesOf('giai-tich-1')).toBe(before - 1)

    const result = await giveBack('20215012', 'giai-tich-1')

    expect(result.status).toBe(200)
    expect(result.loan!.returnedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(await copiesOf('giai-tich-1')).toBe(before)
  })

  /**
   * The whole reason this endpoint exists.
   *
   * Borrowing alone could only ever drive the copy count downwards, so a demo ran out of
   * stock and a card hit the five-book limit with no way back short of re-seeding.
   */
  it('completes the loop: borrow, return, borrow the same book again', async () => {
    const before = await copiesOf('giai-tich-1')

    const first = await borrow('20215012', ['giai-tich-1'])
    expect(first.status).toBe(201)

    const back = await giveBack('20215012', 'giai-tich-1')
    expect(back.status).toBe(200)

    const second = await borrow('20215012', ['giai-tich-1'])
    expect(second.status).toBe(201)
    expect(second.slip!.id).not.toBe(first.slip!.id)

    expect(await copiesOf('giai-tich-1')).toBe(before - 1)
  })

  /**
   * A returned book leaves the "Đang mượn" list — which is what the mobile account screen
   * splits on, without a line of its own having changed.
   */
  it('drops the book out of the account\'s open loans', async () => {
    /*
     * `cormen-algorithms` deliberately: the persona's seeded history has it *returned*, so
     * borrowing it here leaves exactly one open loan to assert about. Reaching for
     * `dai-so-tuyen-tinh` instead would borrow a book this card already has out, and the
     * return would close the older seeded loan rather than the one the test just made.
     */
    await borrow('20215012', ['cormen-algorithms'])
    const openBefore = await openLoanCount('20215012')

    await giveBack('20215012', 'cormen-algorithms')

    expect(await openLoanCount('20215012')).toBe(openBefore - 1)

    const response = await app.inject({ method: 'GET', url: '/api/accounts/20215012/slips' })
    const body = response.json() as { slips: AccountSlip[] }
    const entries = body.slips.flatMap((s) => s.books).filter((b) => b.bookId === 'cormen-algorithms')
    expect(entries.some((b) => b.returnedAt === null)).toBe(false)
  })

  it('frees a slot on a card that was at the borrowing limit', async () => {
    // 20217777 is seeded with MAX_BOOKS_PER_LOAN books out, so it cannot borrow at all.
    const blocked = await borrow('20217777', ['giai-tich-1'])
    expect(blocked.status).toBe(409)

    const held = await db
      .selectFrom('loans')
      .select('book_id')
      .where('card_code', '=', '20217777')
      .where('returned_at', 'is', null)
      .orderBy('book_id')
      .executeTakeFirstOrThrow()

    const back = await giveBack('20217777', held.book_id)
    expect(back.status).toBe(200)

    const allowed = await borrow('20217777', ['giai-tich-1'])
    expect(allowed.status).toBe(201)
  })

  /** `wasLate` is what makes the account screen say "Đã trả trễ" rather than "Đã trả". */
  it('reports an overdue return as late', async () => {
    // 20218888 is seeded with overdue books.
    const overdue = await db
      .selectFrom('loans')
      .select(['book_id', 'due_at'])
      .where('card_code', '=', '20218888')
      .where('returned_at', 'is', null)
      .orderBy('due_at')
      .executeTakeFirstOrThrow()

    const result = await giveBack('20218888', overdue.book_id)

    expect(result.status).toBe(200)
    expect(result.loan!.wasLate).toBe(true)
  })
})

describe('refusals', () => {
  /**
   * The guard that matters most.
   *
   * Two returns of one loan must not add two copies. Both layers are exercised at once:
   * `returned_at IS NULL` inside the UPDATE decides the winner, and
   * `copies_available < copies_total` on the availability write is the backstop if that
   * ever stops working. A demo tool is precisely the kind of thing an impatient click
   * calls twice.
   */
  it('refuses a second return, and does not inflate the stock', async () => {
    const before = await copiesOf('giai-tich-1')
    await borrow('20215012', ['giai-tich-1'])

    const first = await giveBack('20215012', 'giai-tich-1')
    const second = await giveBack('20215012', 'giai-tich-1')

    expect(first.status).toBe(200)
    expect(second.status).toBe(409)
    expect(second.failure).toMatchObject({ reason: 'no-open-loan' })
    expect(await copiesOf('giai-tich-1')).toBe(before)
  })

  /**
   * Two returns issued at once. An observable-contract test: exactly one wins and the
   * stock lands where it started.
   *
   * Note what this does *not* prove. Two `returnBook` calls complete in microseconds, so
   * in practice the second one's SELECT already sees the loan closed and it is refused
   * there — the conditional UPDATE never gets a chance to be the thing that separates
   * them. The test below is the one that pins that down.
   */
  it('closes a loan exactly once when two returns are issued together', async () => {
    const before = await copiesOf('xac-suat-thong-ke')
    await borrow('20215012', ['xac-suat-thong-ke'])

    const [first, second] = await Promise.all([
      returnBook(db, { cardCode: '20215012', bookId: 'xac-suat-thong-ke' }),
      returnBook(db, { cardCode: '20215012', bookId: 'xac-suat-thong-ke' }),
    ])

    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1)
    expect(await copiesOf('xac-suat-thong-ke')).toBe(before)
  })

  /**
   * The interleaving that makes the conditional UPDATE load-bearing, forced to happen.
   *
   * `returnBook` is started while another transaction has already closed the loan but has
   * **not committed**. Under READ COMMITTED its SELECT therefore still sees the loan open —
   * it walks straight past the `no-open-loan` check — and its UPDATE then blocks on the
   * uncommitted row. Once the other transaction commits, the UPDATE re-evaluates its WHERE
   * clause, finds `returned_at` set, and changes nothing.
   *
   * That last step is the whole point, and it is not theoretical: probing this
   * interleaving showed both transactions reading the loan as open, and with the
   * `returned_at IS NULL` predicate dropped from the UPDATE, *both* writes succeeding —
   * a copy conjured out of nothing. Delete that predicate and this test goes red, which is
   * the property the sequential and concurrent tests above cannot give.
   *
   * Postgres would spell the alternative `SELECT … FOR UPDATE` and SQL Server
   * `WITH (UPDLOCK, HOLDLOCK)`; needing neither is what keeps one implementation running
   * on both engines.
   */
  it('refuses a return whose loan is closed underneath it mid-flight', async () => {
    const borrowed = await borrow('20215012', ['xac-suat-thong-ke'])
    const loanId = `${borrowed.slip!.id}::xac-suat-thong-ke`

    let racer!: Promise<ReturnResult>

    await db.transaction().execute(async (held) => {
      await held
        .updateTable('loans')
        .set({ returned_at: '2026-01-01' })
        .where('id', '=', loanId)
        .where('returned_at', 'is', null)
        .execute()

      // Started, deliberately not awaited: its SELECT runs against the pre-commit state
      // and its UPDATE parks on the row this transaction holds.
      racer = returnBook(db, { cardCode: '20215012', bookId: 'xac-suat-thong-ke' })
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    const result = await racer

    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ failure: { reason: 'already-returned' } })
  })

  /** A real book, out on someone else's card — the card, not the catalogue, is the miss. */
  it('refuses a book the card does not have out', async () => {
    const result = await giveBack('20215012', 'vat-ly-dai-cuong')
    expect(result.status).toBe(409)
    expect(result.failure).toMatchObject({ reason: 'no-open-loan' })
  })

  it('refuses an unknown card', async () => {
    const result = await giveBack('00000000', 'giai-tich-1')
    expect(result.failure).toMatchObject({ reason: 'unknown-card' })
  })

  it('refuses an unknown book', async () => {
    const result = await giveBack('20215012', 'khong-ton-tai')
    expect(result.failure).toMatchObject({ reason: 'unknown-book' })
  })

  /** A missing field is a caller bug — 400, not 409. Same rule as the borrow endpoint. */
  it('rejects a malformed request with 400, not 409', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/returns',
      payload: { cardCode: '20215012' },
    })
    expect(response.statusCode).toBe(400)
  })
})
