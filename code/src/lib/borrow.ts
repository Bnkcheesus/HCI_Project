/**
 * Self-checkout rules as the *browser* sees them — Job 3 / Pain Reliever 3 /
 * Product-Service 3 ("quy trình tự mượn tại kiosk, không cần chờ thủ thư"), behind
 * kiosk-book-scan-* and kiosk-borrow-complete.
 *
 * The rules themselves live in `@/shared/borrowRules`, and the *card* rules are the
 * server's alone — `POST /api/loans` runs them inside the borrow transaction, where the
 * loan rows cannot be stale or edited. What is left here is the one judgement that is
 * genuinely local: whether a scanned book belongs in the cart on this screen. The cart is
 * client state; the server has never seen it.
 *
 * The borrowing terms are not invented here: the AI librarian already tells readers
 * "mượn tối đa 5 cuốn trong 14 ngày", so the checkout has to enforce exactly that or the
 * app contradicts itself.
 */
import type { Availability, Book } from '@/shared/types'
import { MAX_BOOKS_PER_LOAN } from '@/shared/borrowRules'

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

/**
 * Can this book go into the cart?
 *
 * The lookup happens over the API — the browser no longer holds the catalogue — so this
 * takes the book the scanner resolved and judges only what the *cart* makes it: already
 * scanned, cart full, nothing on the shelf. `null` is the answer for a code that matched
 * nothing at all.
 *
 * The eligibility of the *card* is not decided here at all any more. The server rules on
 * that inside the borrow transaction, where the loan rows cannot be stale.
 */
export function evaluateScan(
  book: Book | null,
  availability: Availability | undefined,
  cartIds: string[],
): ScanResult {
  if (!book) return { ok: false, failure: 'not-found' }
  if (cartIds.includes(book.id)) return { ok: false, failure: 'duplicate' }
  if (cartIds.length >= MAX_BOOKS_PER_LOAN) return { ok: false, failure: 'cart-full' }
  if ((availability?.copiesAvailable ?? 0) <= 0) return { ok: false, failure: 'unavailable' }
  return { ok: true, book }
}
