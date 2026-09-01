/**
 * Reading a reader's borrowing record — Job 4 / Pain 4 / Pain Reliever 4.
 *
 * The *assembly* of that record moved to the server: `GET /api/accounts/:card/slips`
 * groups loan rows into slips, because grouping is a join and the database is where the
 * rows are. What is left here is the part that was always presentation — which slips are
 * still open, in what order, and which books inside them are still out.
 *
 * Two comments that used to live at the top of this file are gone because they stopped
 * being true, and that is the point of the whole exercise:
 *
 *   - It used to merge two sources, seeded history and slips the kiosk had written into
 *     `localStorage`, and warn that the merge was a stand-in for syncing. There is one
 *     source now.
 *   - It used to record a "known divergence, deliberate": the kiosk's borrowing limit
 *     counted only the seeded history and ignored slips filed during the session, because
 *     the mock could not be written to. The server counts real rows, so the limit is now
 *     simply correct.
 */
import type { AccountSlip } from '@/shared/types'

export type { AccountSlip, AccountSlipBook } from '@/shared/types'

/** A slip is still open while any book on it has not come back. */
export function isSlipOpen(slip: AccountSlip): boolean {
  return slip.books.some((book) => book.returnedAt === null)
}

/** Open slips, soonest due first — an overdue one therefore leads. */
export function openSlips(slips: AccountSlip[]): AccountSlip[] {
  return slips.filter(isSlipOpen).sort((a, b) => a.dueAt.localeCompare(b.dueAt))
}

/** Closed slips, most recently borrowed first. */
export function closedSlips(slips: AccountSlip[]): AccountSlip[] {
  return slips.filter((s) => !isSlipOpen(s)).sort((a, b) => b.borrowedAt.localeCompare(a.borrowedAt))
}

/**
 * Every book still out, flattened across slips and sorted by due date. The home screen
 * counts these and leads with the first — the one running out of time.
 */
export function openBooks(slips: AccountSlip[]): { bookId: string; dueAt: string }[] {
  return slips
    .flatMap((slip) =>
      slip.books
        .filter((book) => book.returnedAt === null)
        .map((book) => ({ bookId: book.bookId, dueAt: slip.dueAt })),
    )
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
}
