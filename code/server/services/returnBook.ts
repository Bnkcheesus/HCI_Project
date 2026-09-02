/**
 * Giving a book back — the mirror image of `services/checkout.ts`.
 *
 * **This is not part of the product.** Returning a book appears nowhere in the value
 * proposition, and a real library takes returns at a desk or a drop box rather than at the
 * catalogue kiosk. It exists so a demo can show the whole loop — borrow, stock drops,
 * return, stock comes back — instead of only the half that borrowing proves. It is reached
 * from `/admin`, deliberately outside both product surfaces.
 *
 * Everything below is shaped by `checkout.ts`, because a return is a checkout run
 * backwards and the same three properties have to hold:
 *
 *   1. **The judgement is the server's.** The admin screen lists what a card has out, but
 *      that list was fetched some time ago; whether a loan is still open is decided here,
 *      on rows inside the transaction.
 *   2. **All or nothing.** Closing the loan and putting the copy back are one transaction.
 *      A return that closed the loan and lost the copy would remove a book from
 *      circulation permanently.
 *   3. **No dialect-specific locking.** Both writes are conditional UPDATEs whose
 *      affected-row count is the answer, exactly as `takeCopy` is — so this runs unchanged
 *      on PostgreSQL and SQL Server.
 */
import type { Kysely } from 'kysely'
import { isoDate } from '@/shared/borrowRules'
import { asIsoDate } from '../db/dates.ts'
import type { DB } from '../db/schema.ts'

export type ReturnFailure =
  | { reason: 'unknown-card' }
  | { reason: 'unknown-book' }
  /** The card exists and the book exists, but this card does not have that book out. */
  | { reason: 'no-open-loan' }
  /** Two returns raced, and this one lost. See `closeLoan`. */
  | { reason: 'already-returned' }

export interface ReturnedLoan {
  loanId: string
  slipId: string
  bookId: string
  returnedAt: string
  /** Returned after the due date — the account screen says "Đã trả trễ" rather than "Đã trả". */
  wasLate: boolean
}

export type ReturnResult = { ok: true; loan: ReturnedLoan } | { ok: false; failure: ReturnFailure }

export interface ReturnRequest {
  cardCode: string
  bookId: string
}

/**
 * A refusal, raised as an exception so the transaction unwinds with it.
 *
 * Kysely commits when the callback *returns* and rolls back only when it *throws*. A
 * failure handed back as a plain object would commit whatever the attempt had already
 * written — that exact mistake once let a rejected five-book borrow keep two decrements.
 * Same rule here, for the same reason.
 */
class ReturnRejection extends Error {
  failure: ReturnFailure

  constructor(failure: ReturnFailure) {
    super(`return rejected: ${failure.reason}`)
    this.failure = failure
  }
}

export async function returnBook(
  db: Kysely<DB>,
  request: ReturnRequest,
  now = new Date(),
): Promise<ReturnResult> {
  try {
    return await runReturn(db, request.cardCode.trim(), request.bookId.trim(), now)
  } catch (error) {
    if (error instanceof ReturnRejection) return { ok: false, failure: error.failure }
    throw error
  }
}

function runReturn(
  db: Kysely<DB>,
  cardCode: string,
  bookId: string,
  now: Date,
): Promise<ReturnResult> {
  return db.transaction().execute(async (trx) => {
    const student = await trx
      .selectFrom('students')
      .select('card_code')
      .where('card_code', '=', cardCode)
      .executeTakeFirst()
    if (!student) throw new ReturnRejection({ reason: 'unknown-card' })

    const book = await trx
      .selectFrom('books')
      .select('id')
      .where('id', '=', bookId)
      .executeTakeFirst()
    if (!book) throw new ReturnRejection({ reason: 'unknown-book' })

    /*
     * The oldest open loan for this card and book.
     *
     * A card *can* hold the same title on two slips at once — `loans.id` is
     * `${slip_id}::${book_id}`, unique per slip rather than per book — so "return this
     * book" needs a tie-break. Oldest first is the one that matters: it is the loan whose
     * due date comes first, and therefore the one the reader is closest to owing a fine on.
     *
     * Both `orderBy` keys are needed, not just the first: two loans taken out on the same
     * day share `borrowed_at`, and an unordered `limit` picks arbitrarily. SQL Server also
     * refuses `OFFSET…FETCH` without an ORDER BY, so a limit here has to carry one anyway.
     */
    const loan = await trx
      .selectFrom('loans')
      .select(['id', 'slip_id', 'due_at'])
      .where('card_code', '=', cardCode)
      .where('book_id', '=', bookId)
      .where('returned_at', 'is', null)
      .orderBy('borrowed_at')
      .orderBy('id')
      .limit(1)
      .executeTakeFirst()
    if (!loan) throw new ReturnRejection({ reason: 'no-open-loan' })

    const returnedAt = isoDate(now)

    /*
     * Close the loan — and let the WHERE clause decide, not an `if`.
     *
     * `returned_at IS NULL` inside the UPDATE is what makes this safe against a double
     * return: two requests that both read the same open row will both try this, and only
     * one changes a row. Checking in JavaScript between the SELECT and the UPDATE would
     * leave a window where both pass, and the copy count would climb by two.
     *
     * `numUpdatedRows` is a bigint on both drivers — `=== 1` would be false even when
     * exactly one row changed.
     */
    const closed = await trx
      .updateTable('loans')
      .set({ returned_at: returnedAt })
      .where('id', '=', loan.id)
      .where('returned_at', 'is', null)
      .executeTakeFirst()
    if (closed.numUpdatedRows !== 1n) throw new ReturnRejection({ reason: 'already-returned' })

    /*
     * Put the copy back on the shelf — the exact inverse of `takeCopy`, guard and all.
     *
     * `copies_available < copies_total` mirrors checkout's `copies_available > 0`. It is
     * the backstop that keeps a return from inventing stock: however this is called, the
     * library can never end up holding more copies than it owns. Belt and braces with the
     * `returned_at IS NULL` guard above — either one alone would do, and a demo tool is
     * exactly the sort of thing that gets called twice by an impatient click.
     *
     * Status goes to 'available' unconditionally, because a row that just gained a copy
     * has at least one.
     */
    await trx
      .updateTable('availability')
      .set((eb) => ({
        copies_available: eb('copies_available', '+', 1),
        status: 'available',
      }))
      .where('book_id', '=', bookId)
      .where((eb) => eb('copies_available', '<', eb.ref('copies_total')))
      .execute()

    return {
      ok: true as const,
      loan: {
        loanId: loan.id,
        slipId: loan.slip_id,
        bookId,
        returnedAt,
        wasLate: returnedAt > asIsoDate(loan.due_at),
      },
    }
  })
}
