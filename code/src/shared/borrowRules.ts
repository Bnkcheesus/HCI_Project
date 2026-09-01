/**
 * The borrowing rules — Job 3 / Pain Reliever 3 / Product-Service 3, now shared by the
 * kiosk and the server.
 *
 * These moved out of `lib/borrow.ts` because the server has to be the one that decides.
 * A client-side eligibility check is a courtesy: it tells the reader *early* why the
 * card cannot borrow, which is worth having. But the check that actually refuses a loan
 * runs inside the `POST /api/loans` transaction, against rows nobody can edit from a
 * browser. Two implementations of "5 books, 14 days" would drift, and the drift would
 * show up as a kiosk that promises a borrow the server then rejects.
 *
 * So the rules live here, as pure functions over *injected* data — no imports from
 * `@/mocks`, no database, nothing environment-specific. The caller supplies the loans;
 * this file supplies the judgement. `lib/borrow.ts` keeps its old signatures by wrapping
 * these with the mock data, so nothing in the UI had to change yet.
 */
import type { BorrowBlock, LoanRecord, Student } from './types'

export const MAX_BOOKS_PER_LOAN = 5
export const LOAN_DAYS = 14

/* ------------------------------------------------------------------------- codes */

/**
 * How an ISBN is printed versus how it is keyed: the spaces and dashes on a back cover are
 * decoration. Exported so the scanner, the search box, the phone's fallback field and the
 * server's lookup all agree on what a code is — four spellings of "strip the punctuation"
 * would drift, and the failure would be a reader typing a valid ISBN that one screen
 * accepts and another does not.
 */
export function normalizeIsbn(code: string): string {
  return code.replace(/[\s-]/g, '')
}

/**
 * The slip number, in one place.
 *
 * Both the kiosk's freshly printed slip and the seeded history rows are built from this,
 * so a slip filed today and one from six months ago are indistinguishable to a reader —
 * and, more importantly, a slip id in a QR code resolves the same way whichever produced it.
 *
 * `sequence` distinguishes two visits by the same card on the same day, and it has to
 * exist: date + card is *not* unique. A reader borrowing in the morning and again after
 * lunch produced the same number twice, which the database refused as a duplicate key —
 * the borrow simply failed. Nothing caught it earlier because the seeded history has no
 * card visiting twice in one day, and a demo never borrows twice.
 *
 * The suffix appears only from the second slip onward, so the number a reader normally
 * sees is unchanged and every id already filed stays valid.
 */
export function slipIdFor(borrowedAtIso: string, studentId: string, sequence = 1): string {
  const [year, month, day] = borrowedAtIso.split('-')
  const base = `SLIP-${year}-${month}${day}-${studentId.slice(-4)}`
  return sequence > 1 ? `${base}-${sequence}` : base
}

/** ISO date to the dd/mm/yyyy the slip and the refusals are written in. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Today as an ISO date, in local time — the form every date in the system is stored in. */
export function isoDate(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** The due date for a loan taken out now. */
export function dueDateFrom(now: Date, days = LOAN_DAYS): string {
  const due = new Date(now)
  due.setDate(due.getDate() + days)
  return isoDate(due)
}

/* ------------------------------------------------------------------- eligibility */

export interface EligibilityInput {
  student: Student
  /** How many books are in this checkout. */
  cartSize: number
  /** The card's currently open loans — records whose `returnedAt` is null. */
  openLoans: LoanRecord[]
  /** Resolves a book id to its title, for the overdue message. */
  titleOf: (bookId: string) => string
}

/**
 * Every reason this card cannot borrow right now. Returns an array because they stack:
 * an expired card can also have overdue books, and hiding the second problem until the
 * first is fixed sends the reader to the desk twice.
 */
export function checkEligibility(input: EligibilityInput, now = new Date()): BorrowBlock[] {
  const { student, cartSize, openLoans, titleOf } = input
  const blocks: BorrowBlock[] = []
  const today = isoDate(now)

  if (student.expiresAt < today) {
    blocks.push({
      code: 'card-expired',
      message: `Thẻ thư viện đã hết hạn ngày ${formatDate(student.expiresAt)}.`,
      hint: 'Bạn gia hạn thẻ tại quầy thủ thư hoặc trong ứng dụng LibAssist rồi quay lại nhé.',
    })
  }

  const overdue = openLoans.filter((l) => l.dueAt < today)
  if (overdue.length > 0) {
    const titles = overdue.map((l) => titleOf(l.bookId)).join(', ')
    blocks.push({
      code: 'overdue',
      message: `Bạn đang có ${overdue.length} cuốn quá hạn trả: ${titles}.`,
      hint: 'Vui lòng trả những cuốn này trước khi mượn thêm.',
    })
  }

  const open = openLoans.length
  if (open + cartSize > MAX_BOOKS_PER_LOAN) {
    const room = Math.max(0, MAX_BOOKS_PER_LOAN - open)
    blocks.push({
      code: 'limit',
      message: `Bạn đang mượn ${open} cuốn, giới hạn là ${MAX_BOOKS_PER_LOAN} cuốn cùng lúc.`,
      hint:
        room === 0
          ? 'Hãy trả bớt sách trước khi mượn thêm.'
          : `Lượt này bạn chỉ mượn thêm được ${room} cuốn — hãy bỏ bớt khỏi phiếu.`,
    })
  }

  return blocks
}
