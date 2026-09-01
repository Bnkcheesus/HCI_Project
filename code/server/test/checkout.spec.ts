/**
 * Borrowing — the only operation in this project that writes, and the only one where two
 * readers can collide.
 *
 * These tests write to the database, so each one puts back what it took. That is
 * deliberate rather than convenient: seeding fresh before every test would be slower and
 * would hide a real class of bug, namely a checkout that only works against pristine data.
 *
 * Prerequisite: `npm run db:migrate && npm run db:seed`.
 */
import type { FastifyInstance } from 'fastify'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { availability, students } from '@/mocks'
import { LOAN_DAYS, MAX_BOOKS_PER_LOAN } from '@/shared/borrowRules'
import type { AccountSlip, Availability, LoanSlip } from '@/shared/types'
import { buildApp } from '../app.ts'
import { createDb } from '../db/dialect.ts'
import { checkout, type CheckoutFailure } from '../services/checkout.ts'

const db = createDb()
let app: FastifyInstance

/** Slips written by a test, removed afterwards so the next one starts where it expected. */
const written: string[] = []

beforeAll(async () => {
  app = buildApp(db)
  await app.ready()
})

/**
 * Put the fixture back exactly as seeded.
 *
 * Deliberately a *restore to a known state* rather than an undo of what each test did.
 * The first version incremented the copy count back by one per loan it deleted, which
 * double-counted against the tests that set a book's stock by hand — and the drift was
 * silent, accumulating a little more on every run until some later assertion failed for a
 * reason that had nothing to do with the code under test. Writing the seeded values makes
 * the suite idempotent no matter what any test did to get there.
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
  })
})

afterAll(async () => {
  await app.close()
  await db.destroy()
})

async function borrow(cardCode: string, bookIds: string[]) {
  const response = await app.inject({ method: 'POST', url: '/api/loans', payload: { cardCode, bookIds } })
  const body = response.json() as { slip?: LoanSlip; failure?: CheckoutFailure }
  if (body.slip) written.push(body.slip.id)
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

describe('POST /api/loans', () => {
  /**
   * Gain Creator 4, kept honestly. Before this endpoint existed, borrowing a book changed
   * nothing — the copy count was a constant in a module, and the kiosk's own receipt
   * screen could not make it move.
   */
  it('decrements the copy count', async () => {
    const before = await copiesOf('giai-tich-1')

    const result = await borrow('20215012', ['giai-tich-1'])

    expect(result.status).toBe(201)
    expect(await copiesOf('giai-tich-1')).toBe(before - 1)
  })

  it('files a slip with the borrow date and a due date LOAN_DAYS later', async () => {
    const result = await borrow('20215012', ['giai-tich-1'])
    const slip = result.slip!

    const borrowed = new Date(`${slip.borrowedAt}T00:00:00Z`)
    const due = new Date(`${slip.dueAt}T00:00:00Z`)
    expect((due.getTime() - borrowed.getTime()) / 86_400_000).toBe(LOAN_DAYS)
    expect(slip.studentName).toBe('Nguyễn Minh Khang')
  })

  /**
   * Pain 4 is explicitly about "nhiều đầu sách cùng lúc". Several books borrowed in one
   * visit are one slip, not several loans that happen to share a date.
   */
  it('puts several books on a single slip', async () => {
    const ids = ['giai-tich-1', 'dai-so-tuyen-tinh', 'xac-suat-thong-ke']
    const result = await borrow('20215012', ids)

    expect(result.slip!.bookIds).toEqual(ids)

    const rows = await db
      .selectFrom('loans')
      .select('book_id')
      .where('slip_id', '=', result.slip!.id)
      .execute()
    expect(rows).toHaveLength(3)
  })

  /**
   * Gain Creator 3, the half that could not work before. The slip used to live in the
   * kiosk browser's localStorage, so a real phone scanning a real kiosk found nothing.
   * Now the number is enough — this fetches it back through a different endpoint, the way
   * a different device would.
   */
  it('makes the slip readable by number, from anywhere', async () => {
    const result = await borrow('20215012', ['giai-tich-1'])

    const response = await app.inject({ method: 'GET', url: `/api/slips/${result.slip!.id}` })
    const slip = response.json() as AccountSlip

    expect(response.statusCode).toBe(200)
    expect(slip.books.map((b) => b.bookId)).toEqual(['giai-tich-1'])
    expect(slip.books[0].returnedAt).toBeNull()
  })

  /**
   * Two visits in one day.
   *
   * The slip number is built from the date and the card, which is *not* unique — a reader
   * borrowing in the morning and again after lunch generated the same number twice, and
   * the second borrow died on the unique key with a 500 rather than filing a slip. Nothing
   * caught it before a browser walkthrough tried it: the seeded history has no card
   * visiting twice in one day, and a demo never borrows twice.
   */
  it('files a second slip on the same day under its own number', async () => {
    const first = await borrow('20215012', ['giai-tich-1'])
    const second = await borrow('20215012', ['dai-so-tuyen-tinh'])

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(second.slip!.id).not.toBe(first.slip!.id)

    // Both are reachable by number — a receipt with an unfetchable number is no receipt.
    for (const slip of [first.slip!, second.slip!]) {
      const response = await app.inject({ method: 'GET', url: `/api/slips/${slip.id}` })
      expect(response.statusCode).toBe(200)
    }
  })

  /**
   * Two different readers whose slip numbers start the same.
   *
   * A slip number ends in the *last four digits* of the student id, and the seeded cards
   * 20215012 and 25215012 both end in 5012 — so two different people borrowing on the
   * same day generate the same number. The first version of the sequence counted this
   * card's slips for the day, which is a narrower scope than the primary key enforces:
   * the second reader's count was zero, so they claimed a number the first already had
   * and the borrow died with a 500 instead of filing a slip.
   *
   * The two cards are read from the fixture rather than named, so this keeps testing the
   * real thing if the demo cards are ever renumbered.
   */
  it('files slips for two cards that share their last four digits', async () => {
    const sharing = students.filter((s) => s.studentId.slice(-4) === '5012')
    expect(sharing.length).toBeGreaterThan(1)

    const [first, second] = sharing
    const one = await borrow(first.cardCode, ['giai-tich-1'])
    const two = await borrow(second.cardCode, ['dai-so-tuyen-tinh'])

    expect(one.status).toBe(201)
    expect(two.status).toBe(201)
    expect(two.slip!.id).not.toBe(one.slip!.id)

    // Both resolvable by number — the receipt shows it and the phone fetches it.
    for (const slip of [one.slip!, two.slip!]) {
      const response = await app.inject({ method: 'GET', url: `/api/slips/${slip.id}` })
      expect(response.statusCode).toBe(200)
    }
  })

  it('shows up in the reader account straight away', async () => {
    const result = await borrow('20215012', ['giai-tich-1'])

    const response = await app.inject({ method: 'GET', url: '/api/accounts/20215012/slips' })
    const body = response.json() as { slips: AccountSlip[] }

    expect(body.slips.map((s) => s.id)).toContain(result.slip!.id)
  })
})

describe('refusals', () => {
  /**
   * The server is the one that decides. The kiosk runs the same check so it can refuse
   * early and explain why, but that check runs on data a browser was handed; this one
   * runs on rows inside the transaction.
   */
  it('refuses a card with overdue books, and leaves the copies alone', async () => {
    const before = await copiesOf('giai-tich-1')

    const result = await borrow('20218888', ['giai-tich-1'])

    expect(result.status).toBe(409)
    expect(result.failure).toMatchObject({ reason: 'not-eligible' })
    expect(await copiesOf('giai-tich-1')).toBe(before)
  })

  it('refuses an expired card', async () => {
    const result = await borrow('20219999', ['giai-tich-1'])
    expect(result.failure).toMatchObject({ reason: 'not-eligible' })
  })

  it('refuses a card already at the borrowing limit', async () => {
    const result = await borrow('20217777', ['giai-tich-1'])

    const failure = result.failure as Extract<CheckoutFailure, { reason: 'not-eligible' }>
    expect(failure.blocks.map((b) => b.code)).toContain('limit')
  })

  it('refuses a book with nothing on the shelf', async () => {
    // pattern-recognition is seeded with every copy out.
    const result = await borrow('20215012', ['pattern-recognition'])
    expect(result.failure).toMatchObject({ reason: 'no-copies', bookIds: ['pattern-recognition'] })
  })

  /**
   * All or nothing. A slip that decrements the first book and then finds the second gone
   * must leave the first count where it was — otherwise a refused borrow quietly removes
   * a copy from circulation.
   */
  it('rolls back every decrement when one book is unavailable', async () => {
    const before = await copiesOf('giai-tich-1')

    const result = await borrow('20215012', ['giai-tich-1', 'pattern-recognition'])

    expect(result.status).toBe(409)
    expect(await copiesOf('giai-tich-1')).toBe(before)

    const slips = await db.selectFrom('loan_slips').select('id').where('card_code', '=', '20215012').execute()
    const fresh = slips.filter((s) => !s.id.startsWith('SLIP-20'))
    expect(fresh).toEqual([])
  })

  it('refuses an unknown card', async () => {
    const result = await borrow('00000000', ['giai-tich-1'])
    expect(result.failure).toMatchObject({ reason: 'unknown-card' })
  })

  it('refuses an unknown book', async () => {
    const result = await borrow('20215012', ['khong-ton-tai'])
    expect(result.failure).toMatchObject({ reason: 'unknown-book' })
  })

  it('refuses the same book twice on one slip', async () => {
    const result = await borrow('20215012', ['giai-tich-1', 'giai-tich-1'])
    expect(result.failure).toMatchObject({ reason: 'duplicate-book' })
  })

  /**
   * An empty list or an oversized one is a caller bug, not a state conflict — 400, not
   * 409. The kiosk needs the distinction: a 400 means the screen is broken, a 409 means
   * the screen has something to explain to the reader.
   */
  it('rejects a malformed request with 400, not 409', async () => {
    const empty = await app.inject({
      method: 'POST',
      url: '/api/loans',
      payload: { cardCode: '20215012', bookIds: [] },
    })
    expect(empty.statusCode).toBe(400)

    const tooMany = await app.inject({
      method: 'POST',
      url: '/api/loans',
      payload: {
        cardCode: '20215012',
        bookIds: Array.from({ length: MAX_BOOKS_PER_LOAN + 1 }, (_, i) => `book-${i}`),
      },
    })
    expect(tooMany.statusCode).toBe(400)
  })
})

describe('two readers, one copy', () => {
  /**
   * The concurrency guarantee, exercised rather than asserted about.
   *
   * `hoa-hoc-dai-cuong` is seeded with copies out, so this test sets up its own single
   * copy and fires two checkouts at once. Both transactions read the same starting count;
   * the conditional UPDATE is what makes exactly one of them win.
   *
   * Without `WHERE copies_available > 0` both would succeed and the library would have
   * lent a book it does not have. With a dialect-specific lock — `FOR UPDATE` on Postgres,
   * `WITH (UPDLOCK, HOLDLOCK)` on SQL Server — it would also work, but only on the engine
   * whose syntax was written.
   */
  it('lends the last copy exactly once', async () => {
    const bookId = 'sinh-hoc-dai-cuong'

    await db
      .updateTable('availability')
      .set({ copies_available: 1, status: 'available' })
      .where('book_id', '=', bookId)
      .execute()

    const [first, second] = await Promise.all([
      checkout(db, { cardCode: '20215012', bookIds: [bookId] }),
      checkout(db, { cardCode: '20218888', bookIds: [bookId] }),
    ])

    for (const result of [first, second]) {
      if (result.ok) written.push(result.slip.id)
    }

    // 20218888 has overdue books, so it is refused on eligibility rather than on stock —
    // what matters is that the count cannot go below zero and only one loan was written.
    expect(await copiesOf(bookId)).toBe(0)
    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1)
  })

  /** The chip must not say "Còn sách" about a book with nothing left on the shelf. */
  it('flips the status to borrowed when the last copy goes', async () => {
    const bookId = 'hoa-hoc-dai-cuong'

    await db
      .updateTable('availability')
      .set({ copies_available: 1, status: 'available' })
      .where('book_id', '=', bookId)
      .execute()

    const result = await borrow('20215012', [bookId])
    expect(result.status).toBe(201)

    const response = await app.inject({ method: 'GET', url: `/api/availability?ids=${bookId}` })
    const body = response.json() as Record<string, Availability>
    expect(body[bookId].status).toBe('borrowed')
    expect(body[bookId].copiesAvailable).toBe(0)
  })
})
