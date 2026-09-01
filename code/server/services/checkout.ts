/**
 * Borrowing a book — Job 3 / Pain Reliever 3 / Gain Creator 3, and the reason this
 * backend exists at all.
 *
 * Everything else the server does is reading. This is the one operation that *decides*
 * something, and it is the only place in the project where two readers can collide: the
 * last copy of a book, two kiosks, the same second.
 *
 * Three properties it has to hold:
 *
 *   1. **The judgement is the server's.** A kiosk checks eligibility too, so it can
 *      refuse early and explain why — but that check runs on data the browser was handed
 *      and could be stale or edited. This one runs on rows inside the transaction.
 *   2. **All or nothing.** A five-book slip that decrements three counters and then finds
 *      the fourth book gone must leave nothing behind. The whole thing is one
 *      transaction, and any failure rolls the lot back.
 *   3. **No dialect-specific locking.** Reserving a copy is a single conditional UPDATE
 *      whose affected-row count is the answer — see `takeCopy` below. Postgres would
 *      spell a lock `SELECT … FOR UPDATE` and SQL Server `WITH (UPDLOCK, HOLDLOCK)`;
 *      needing neither is what keeps one implementation running on both.
 */
import type { Kysely } from 'kysely'
import { checkEligibility, dueDateFrom, isoDate, MAX_BOOKS_PER_LOAN, slipIdFor } from '@/shared/borrowRules'
import type { BorrowBlock, LoanSlip } from '@/shared/types'
import type { DB } from '../db/schema.ts'
import { asIsoDate } from '../db/dates.ts'

export type CheckoutFailure =
  | { reason: 'unknown-card' }
  | { reason: 'empty-cart' }
  | { reason: 'cart-too-large' }
  | { reason: 'unknown-book'; bookIds: string[] }
  | { reason: 'duplicate-book' }
  /** The card cannot borrow: expired, overdue books, or already at the limit. */
  | { reason: 'not-eligible'; blocks: BorrowBlock[] }
  /** Someone else took the last copy between the reader scanning it and confirming. */
  | { reason: 'no-copies'; bookIds: string[] }

export type CheckoutResult = { ok: true; slip: LoanSlip } | { ok: false; failure: CheckoutFailure }

export interface CheckoutRequest {
  cardCode: string
  bookIds: string[]
}

/**
 * A refusal, raised as an exception so the transaction unwinds with it.
 *
 * This is not stylistic. Kysely commits when the callback *returns* and rolls back only
 * when it *throws* — so returning a failure object from inside the transaction commits
 * whatever the attempt had already done. That is how a rejected five-book borrow managed
 * to decrement the first two copies and keep them decremented: the books were never lent,
 * and the library quietly had two fewer.
 */
class CheckoutRejection extends Error {
  failure: CheckoutFailure

  constructor(failure: CheckoutFailure) {
    super(`checkout rejected: ${failure.reason}`)
    this.failure = failure
  }
}

export async function checkout(
  db: Kysely<DB>,
  request: CheckoutRequest,
  now = new Date(),
): Promise<CheckoutResult> {
  const cardCode = request.cardCode.trim()
  const bookIds = request.bookIds

  // Checked before opening a transaction: these are malformed requests, not conflicts
  // with the state of the library, so there is nothing to read and nothing to undo.
  if (bookIds.length === 0) return fail({ reason: 'empty-cart' })
  if (bookIds.length > MAX_BOOKS_PER_LOAN) return fail({ reason: 'cart-too-large' })
  if (new Set(bookIds).size !== bookIds.length) return fail({ reason: 'duplicate-book' })

  try {
    return await runCheckout(db, cardCode, bookIds, now)
  } catch (error) {
    if (error instanceof CheckoutRejection) return { ok: false, failure: error.failure }
    throw error
  }
}

function runCheckout(
  db: Kysely<DB>,
  cardCode: string,
  bookIds: string[],
  now: Date,
): Promise<CheckoutResult> {
  return db.transaction().execute(async (trx) => {
    const student = await trx
      .selectFrom('students')
      .selectAll()
      .where('card_code', '=', cardCode)
      .executeTakeFirst()
    if (!student) throw new CheckoutRejection({ reason: 'unknown-card' })

    const found = await trx
      .selectFrom('books')
      .select(['id', 'title'])
      .where('id', 'in', bookIds)
      .execute()
    if (found.length !== bookIds.length) {
      const known = new Set(found.map((b) => b.id))
      throw new CheckoutRejection({
        reason: 'unknown-book',
        bookIds: bookIds.filter((id) => !known.has(id)),
      })
    }

    /*
     * Eligibility, on rows read inside the transaction.
     *
     * `titleOf` resolves against the books being borrowed *and* the ones already out,
     * because the overdue message names titles — and an overdue book is by definition not
     * in this cart.
     */
    const openLoans = await trx
      .selectFrom('loans')
      .selectAll()
      .where('card_code', '=', cardCode)
      .where('returned_at', 'is', null)
      .execute()

    const overdueTitles = await trx
      .selectFrom('books')
      .select(['id', 'title'])
      .where(
        'id',
        'in',
        // An empty IN () is a syntax error on SQL Server; a card with nothing out needs
        // no lookup anyway.
        openLoans.length > 0 ? openLoans.map((l) => l.book_id) : [''],
      )
      .execute()

    const titles = new Map([...found, ...overdueTitles].map((b) => [b.id, b.title]))

    const blocks = checkEligibility(
      {
        student: {
          cardCode: student.card_code,
          name: student.name,
          studentId: student.student_id,
          faculty: student.faculty,
          expiresAt: asIsoDate(student.expires_at),
        },
        cartSize: bookIds.length,
        openLoans: openLoans.map((l) => ({
          id: l.id,
          slipId: l.slip_id,
          studentId: l.card_code,
          bookId: l.book_id,
          borrowedAt: asIsoDate(l.borrowed_at),
          dueAt: asIsoDate(l.due_at),
          returnedAt: null,
        })),
        titleOf: (bookId) => titles.get(bookId) ?? bookId,
      },
      now,
    )
    if (blocks.length > 0) throw new CheckoutRejection({ reason: 'not-eligible', blocks })

    const taken: string[] = []
    for (const bookId of bookIds) {
      if (!(await takeCopy(trx, bookId))) taken.push(bookId)
    }
    /*
     * Thrown, not returned. By this point the loop has already decremented the copies it
     * managed to take, and only an exception makes Kysely roll those back — a plain
     * return would commit them and remove books from circulation that nobody borrowed.
     */
    if (taken.length > 0) throw new CheckoutRejection({ reason: 'no-copies', bookIds: taken })

    const borrowedAt = isoDate(now)
    const dueAt = dueDateFrom(now)

    /*
     * The next free slip number.
     *
     * Two readers can land on the same base, and it is not hypothetical: a slip number
     * ends in the *last four digits* of the student id, and cards 20215012 and 25215012
     * both end in 5012. So the number has to be checked against the ids that exist, not
     * counted per card — an earlier version counted this card's slips for the day, which
     * is a different scope from the one the primary key actually enforces, and the second
     * reader's borrow died on a duplicate key with a 500.
     *
     * Read inside the transaction, and the unique constraint on loan_slips.id remains the
     * backstop if two borrows somehow interleave between this read and the insert.
     */
    const base = slipIdFor(borrowedAt, student.student_id)
    const usedIds = new Set(
      (
        await trx
          .selectFrom('loan_slips')
          .select('id')
          .where('id', 'like', `${base}%`)
          .execute()
      ).map((row) => row.id),
    )

    let sequence = 1
    while (usedIds.has(slipIdFor(borrowedAt, student.student_id, sequence))) sequence++
    const slipId = slipIdFor(borrowedAt, student.student_id, sequence)

    await trx
      .insertInto('loan_slips')
      .values({
        id: slipId,
        card_code: cardCode,
        borrowed_at: borrowedAt,
        due_at: dueAt,
        created_at: now.toISOString(),
      })
      .execute()

    await trx
      .insertInto('loans')
      .values(
        bookIds.map((bookId) => ({
          // Generated, not auto-incremented — see db/schema.ts. A book appears at most
          // once per slip, so the pair is already unique.
          id: `${slipId}::${bookId}`,
          slip_id: slipId,
          card_code: cardCode,
          book_id: bookId,
          borrowed_at: borrowedAt,
          due_at: dueAt,
          returned_at: null,
        })),
      )
      .execute()

    return {
      ok: true as const,
      slip: {
        id: slipId,
        studentName: student.name,
        studentId: student.student_id,
        bookIds,
        borrowedAt,
        dueAt,
      },
    }
  })
}

/**
 * Reserve one copy, or report that there was none left.
 *
 * The whole concurrency story of this project is in these four lines. The `WHERE
 * copies_available > 0` makes the read and the write a single atomic statement: whichever
 * of two simultaneous borrowers gets there second sees zero rows affected and is told the
 * book is gone, rather than both reading "1 copy left" and both taking it.
 *
 * `numUpdatedRows` is a bigint on both drivers — comparing it to a plain `1` would be
 * false even when exactly one row changed.
 */
async function takeCopy(trx: Kysely<DB>, bookId: string): Promise<boolean> {
  const result = await trx
    .updateTable('availability')
    .set((eb) => ({
      copies_available: eb('copies_available', '-', 1),
      /*
       * Recomputed from the count rather than left alone, so the chip on the search
       * results cannot say "Còn sách" about a book with nothing on the shelf.
       *
       * 'reserved' is in the type but in no row and no branch anywhere in the app, so
       * collapsing to two states loses nothing today. If holds are ever added, this is
       * the line that has to learn about them.
       */
      status: eb
        .case()
        .when(eb('copies_available', '>', 1))
        .then('available')
        .else('borrowed')
        .end(),
    }))
    .where('book_id', '=', bookId)
    .where('copies_available', '>', 0)
    .executeTakeFirst()

  return result.numUpdatedRows === 1n
}

function fail(failure: CheckoutFailure): CheckoutResult {
  return { ok: false, failure }
}
