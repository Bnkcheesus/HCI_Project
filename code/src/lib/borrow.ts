/**
 * Self-checkout rules as the *browser* sees them — Job 3 / Pain Reliever 3 /
 * Product-Service 3 ("quy trình tự mượn tại kiosk, không cần chờ thủ thư"), behind
 * kiosk-book-scan-* and kiosk-borrow-complete.
 *
 * The rules themselves now live in `@/shared/borrowRules`, where the server reads them
 * too. What is left here is the browser's half: the same judgements, wired to the data
 * this side happens to have. The kiosk checks eligibility so it can refuse *early* and
 * explain why; the server checks it again inside the borrow transaction, because that is
 * the only check a reader cannot get around.
 *
 * The borrowing terms are not invented here: the AI librarian already tells readers
 * "mượn tối đa 5 cuốn trong 14 ngày", so the checkout has to enforce exactly that or the
 * app contradicts itself.
 */
import { availability, books, openLoansFor } from '@/mocks'
import type { Book, LoanSlip, Student } from '@/shared/types'
import {
  checkEligibility as checkEligibilityRules,
  dueDateFrom,
  isoDate,
  MAX_BOOKS_PER_LOAN,
  normalizeIsbn,
  slipIdFor,
} from '@/shared/borrowRules'

export { formatDate, LOAN_DAYS, MAX_BOOKS_PER_LOAN, normalizeIsbn } from '@/shared/borrowRules'
export type { BlockCode, BorrowBlock, LoanSlip } from '@/shared/types'

/* ------------------------------------------------------------------ scanning a book */

export type ScanFailure = 'not-found' | 'duplicate' | 'unavailable' | 'cart-full'

export const SCAN_FAILURE_MESSAGE: Record<ScanFailure, string> = {
  'not-found': 'Mã sách không hợp lệ. Kiểm tra lại mã ISBN sau bìa sách rồi thử lần nữa.',
  duplicate: 'Cuốn này đã có trong phiếu mượn của bạn.',
  unavailable: 'Cuốn này hiện không còn bản nào trên kệ để mượn.',
  'cart-full': `Mỗi lượt chỉ mượn được tối đa ${MAX_BOOKS_PER_LOAN} cuốn. Hãy bỏ bớt một cuốn trước khi quét thêm.`,
}

export type ScanResult = { ok: true; book: Book } | { ok: false; failure: ScanFailure }

/** Look a book up the way the scanner does: by ISBN, ignoring spaces and dashes. */
export function findBookByCode(code: string): Book | undefined {
  const digits = normalizeIsbn(code)
  if (!digits) return undefined
  return books.find((b) => b.isbn === digits)
}

export function scanBook(code: string, cartIds: string[]): ScanResult {
  const book = findBookByCode(code)
  if (!book) return { ok: false, failure: 'not-found' }
  if (cartIds.includes(book.id)) return { ok: false, failure: 'duplicate' }
  if (cartIds.length >= MAX_BOOKS_PER_LOAN) return { ok: false, failure: 'cart-full' }
  if ((availability[book.id]?.copiesAvailable ?? 0) <= 0) {
    return { ok: false, failure: 'unavailable' }
  }
  return { ok: true, book }
}

/* -------------------------------------------------------------- checking the card */

/**
 * Every reason this card cannot borrow right now, resolved against the loans this side
 * knows about. The judgement is `@/shared/borrowRules`; all this adds is the data.
 */
export function checkEligibility(student: Student, cartSize: number, now = new Date()) {
  return checkEligibilityRules(
    {
      student,
      cartSize,
      openLoans: openLoansFor(student.studentId),
      titleOf: bookTitle,
    },
    now,
  )
}

/* ------------------------------------------------------------------- the loan slip */

export function createLoanSlip(student: Student, bookIds: string[], now = new Date()): LoanSlip {
  const borrowedAt = isoDate(now)

  return {
    id: slipIdFor(borrowedAt, student.studentId),
    studentName: student.name,
    studentId: student.studentId,
    bookIds,
    borrowedAt,
    dueAt: dueDateFrom(now),
  }
}

/* ------------------------------------------------------------------------ helpers */

export function bookTitle(bookId: string): string {
  return books.find((b) => b.id === bookId)?.title ?? bookId
}
