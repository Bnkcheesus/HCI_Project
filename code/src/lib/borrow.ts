/**
 * Self-checkout rules — Job 3 / Pain Reliever 3 / Product-Service 3 ("quy trình tự mượn
 * tại kiosk, không cần chờ thủ thư"), behind kiosk-book-scan-* and kiosk-borrow-complete.
 *
 * The Figma prototype scanned exactly one book and showed a flat "Thẻ thư viện hợp lệ".
 * A real library decides on more than that, so the rules live here — pure functions, no
 * React — and the screens only render what they return.
 *
 * The borrowing terms are not invented here: the AI librarian already tells readers
 * "mượn tối đa 5 cuốn trong 14 ngày" (see lib/librarian.ts), so the checkout has to
 * enforce exactly that or the app contradicts itself.
 */
import { availability, books, openLoansFor, overdueLoansFor, type Book, type Student } from '@/mocks'

export const MAX_BOOKS_PER_LOAN = 5
export const LOAN_DAYS = 14

/* ------------------------------------------------------------------ scanning a book */

export type ScanFailure = 'not-found' | 'duplicate' | 'unavailable' | 'cart-full'

export const SCAN_FAILURE_MESSAGE: Record<ScanFailure, string> = {
  'not-found': 'Mã sách không hợp lệ. Kiểm tra lại mã ISBN sau bìa sách rồi thử lần nữa.',
  duplicate: 'Cuốn này đã có trong phiếu mượn của bạn.',
  unavailable: 'Cuốn này hiện không còn bản nào trên kệ để mượn.',
  'cart-full': `Mỗi lượt chỉ mượn được tối đa ${MAX_BOOKS_PER_LOAN} cuốn. Hãy bỏ bớt một cuốn trước khi quét thêm.`,
}

export type ScanResult = { ok: true; book: Book } | { ok: false; failure: ScanFailure }

/**
 * How an ISBN is printed versus how it is keyed: the spaces and dashes on a back cover are
 * decoration. Exported so the scanner, the search box and the phone's fallback field all
 * agree on what a code is — three spellings of "strip the punctuation" would drift, and the
 * failure would be a reader typing a valid ISBN that one screen accepts and another does not.
 */
export function normalizeIsbn(code: string): string {
  return code.replace(/[\s-]/g, '')
}

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

export type BlockCode = 'card-expired' | 'overdue' | 'limit'

export interface BorrowBlock {
  code: BlockCode
  message: string
  /** What the reader can actually do about it — a refusal without a way out is a dead end. */
  hint: string
}

/**
 * Every reason this card cannot borrow right now. Returns an array because they stack:
 * an expired card can also have overdue books, and hiding the second problem until the
 * first is fixed sends the reader to the desk twice.
 */
export function checkEligibility(
  student: Student,
  cartSize: number,
  now = new Date(),
): BorrowBlock[] {
  const blocks: BorrowBlock[] = []
  const today = now.toISOString().slice(0, 10)

  if (student.expiresAt < today) {
    blocks.push({
      code: 'card-expired',
      message: `Thẻ thư viện đã hết hạn ngày ${formatDate(student.expiresAt)}.`,
      hint: 'Bạn gia hạn thẻ tại quầy thủ thư hoặc trong ứng dụng LibAssist rồi quay lại nhé.',
    })
  }

  const overdue = overdueLoansFor(student.studentId, now)
  if (overdue.length > 0) {
    const titles = overdue.map((l) => bookTitle(l.bookId)).join(', ')
    blocks.push({
      code: 'overdue',
      message: `Bạn đang có ${overdue.length} cuốn quá hạn trả: ${titles}.`,
      hint: 'Vui lòng trả những cuốn này trước khi mượn thêm.',
    })
  }

  const open = openLoansFor(student.studentId).length
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

/* ------------------------------------------------------------------- the loan slip */

export interface LoanSlip {
  id: string
  studentName: string
  studentId: string
  bookIds: string[]
  borrowedAt: string
  dueAt: string
}

export function createLoanSlip(student: Student, bookIds: string[], now = new Date()): LoanSlip {
  const due = new Date(now)
  due.setDate(due.getDate() + LOAN_DAYS)

  return {
    id: `SLIP-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate(),
    ).padStart(2, '0')}-${student.studentId.slice(-4)}`,
    studentName: student.name,
    studentId: student.studentId,
    bookIds,
    borrowedAt: now.toISOString().slice(0, 10),
    dueAt: due.toISOString().slice(0, 10),
  }
}

/* ------------------------------------------------------------------------ helpers */

/** ISO date to the dd/mm/yyyy the slip and the refusals are written in. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
}

export function bookTitle(bookId: string): string {
  return books.find((b) => b.id === bookId)?.title ?? bookId
}
