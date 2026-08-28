/**
 * One view of everything a reader has borrowed — Job 4 / Pain 4 / Pain Reliever 4.
 *
 * The account is fed by two sources that have to be shown as one list:
 *
 *   1. `loanHistory` — the seeded mock, standing in for what a server would already know
 *      about this card before the app was opened.
 *   2. `savedSlips()` — slips filed by the kiosk during this session (lib/loanSlips.ts).
 *      The receipt screen tells the reader "đã lưu vào ứng dụng LibAssist"; if the app did
 *      not then show them, that message would be a lie.
 *
 * Both are reshaped into the same thing: a *slip*, which is what the Figma card actually
 * models — borrow date and due date at the top, the books that went out together beneath.
 * The frame only ever draws a one-book slip, but the kiosk lends up to MAX_BOOKS_PER_LOAN
 * at once and Pain 4 is explicitly about "nhiều đầu sách cùng lúc", so grouping is the
 * shape that serves both.
 *
 * Known divergence, deliberate: `checkEligibility` at the kiosk counts only `loanHistory`,
 * not the slips filed this session. Without a backend the mock cannot be written to, and
 * making the borrowing limit shift mid-demo would be worse than a count that is stable.
 */
import { loanHistory, type LoanRecord } from '@/mocks'
import { savedSlips } from './loanSlips'

export interface AccountSlipBook {
  bookId: string
  /** ISO date, or null while the book is still out. */
  returnedAt: string | null
}

export interface AccountSlip {
  id: string
  borrowedAt: string
  dueAt: string
  books: AccountSlipBook[]
  /** Where the slip came from. Both carry a real slip number; only the display differs. */
  source: 'history' | 'kiosk'
}

/** A slip is still open while any book on it has not come back. */
export function isSlipOpen(slip: AccountSlip): boolean {
  return slip.books.some((book) => book.returnedAt === null)
}

/**
 * History rows are per book; rows sharing a slipId went out on the same slip. That is what
 * makes a three-book loan render as one card instead of three cards repeating identical
 * dates.
 *
 * Grouped on the field rather than on borrowedAt + dueAt: two separate visits on one day
 * would collapse into a single slip under that guess, and the slip would have no number of
 * its own to show.
 */
function groupHistory(records: LoanRecord[]): AccountSlip[] {
  const groups = new Map<string, AccountSlip>()

  for (const record of records) {
    const existing = groups.get(record.slipId)
    if (existing) {
      existing.books.push({ bookId: record.bookId, returnedAt: record.returnedAt })
      continue
    }
    groups.set(record.slipId, {
      id: record.slipId,
      borrowedAt: record.borrowedAt,
      dueAt: record.dueAt,
      books: [{ bookId: record.bookId, returnedAt: record.returnedAt }],
      source: 'history',
    })
  }

  return [...groups.values()]
}

export function accountSlips(cardCode: string): AccountSlip[] {
  const history = groupHistory(loanHistory.filter((l) => l.studentId === cardCode))

  const kiosk: AccountSlip[] = savedSlips()
    .filter((slip) => slip.studentId === cardCode)
    .map((slip) => ({
      id: slip.id,
      borrowedAt: slip.borrowedAt,
      dueAt: slip.dueAt,
      books: slip.bookIds.map((bookId) => ({ bookId, returnedAt: null })),
      source: 'kiosk' as const,
    }))

  return [...kiosk, ...history]
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
