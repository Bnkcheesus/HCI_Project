// Mock loan history / due-date tracking — backs Product-Service 4 / Pain Reliever 4
// (ứng dụng di động đồng bộ tình trạng sách và lịch sử mượn/hạn trả), and the
// eligibility check the self-checkout runs before letting a card borrow anything.
// Maps to the "Phone-PhieuMuon" screens in the Figma prototype.
import { isoDate, slipIdFor } from '@/shared/borrowRules'
import type { LoanRecord } from '@/shared/types'
import { isoDaysFromNow } from './students'

export type { LoanRecord } from '@/shared/types'

/**
 * Slip number in the same shape the kiosk prints, so a slip from the seeded history and
 * one filed today are indistinguishable to a reader — and, more to the point, resolve the
 * same way when one arrives as a slip id in a QR code.
 *
 * One implementation, in `@/shared/borrowRules`. This used to be a second copy of the
 * format string sitting next to the first.
 */
export const historySlipId = slipIdFor

/**
 * Dates are generated relative to today rather than hardcoded, so "quá hạn" stays
 * genuinely overdue and "còn hạn" stays in date no matter when the demo is run.
 */
export const loanHistory: LoanRecord[] = [
  // Nguyễn Minh Khang — the persona. One healthy loan, so borrowing is allowed.
  {
    id: 'loan-1',
    slipId: historySlipId(isoDaysFromNow(-4), '20215012'),
    studentId: '20215012',
    bookId: 'dai-so-tuyen-tinh',
    borrowedAt: isoDaysFromNow(-4),
    dueAt: isoDaysFromNow(10),
    returnedAt: null,
  },

  // Lê Văn Nam — two books past their due date: demonstrates the overdue refusal.
  {
    id: 'loan-2',
    slipId: historySlipId(isoDaysFromNow(-25), '20218888'),
    studentId: '20218888',
    bookId: 'vat-ly-dai-cuong',
    borrowedAt: isoDaysFromNow(-25),
    dueAt: isoDaysFromNow(-11),
    returnedAt: null,
  },
  {
    id: 'loan-3',
    slipId: historySlipId(isoDaysFromNow(-20), '20218888'),
    studentId: '20218888',
    bookId: 'giai-tich-1',
    borrowedAt: isoDaysFromNow(-20),
    dueAt: isoDaysFromNow(-6),
    returnedAt: null,
  },

  // Phạm Gia Bảo — five open loans, all in date: demonstrates the borrowing-limit refusal.
  ...['statistical-learning', 'pattern-recognition', 'hands-on-ml', 'mathematics-for-ml', 'lap-trinh-cpp'].map(
    (bookId, i): LoanRecord => ({
      id: `loan-limit-${i + 1}`,
      // All five went out in one visit — one slip, not five.
      slipId: historySlipId(isoDaysFromNow(-3), '20217777'),
      studentId: '20217777',
      bookId,
      borrowedAt: isoDaysFromNow(-3),
      dueAt: isoDaysFromNow(11),
      returnedAt: null,
    }),
  ),

  // A closed loan — proves returned books stop counting against the limit.
  {
    id: 'loan-returned',
    slipId: historySlipId(isoDaysFromNow(-40), '20215012'),
    studentId: '20215012',
    bookId: 'giai-tich-1',
    borrowedAt: isoDaysFromNow(-40),
    dueAt: isoDaysFromNow(-26),
    returnedAt: isoDaysFromNow(-28),
  },

  /*
   * Further closed loans for the persona, so the mobile app's history is a history rather
   * than a single row.
   *
   * Closed on purpose, and it has to stay that way. checkEligibility blocks a borrow when
   * `openLoansFor + cart > MAX_BOOKS_PER_LOAN`; this card carries exactly one open loan
   * and the kiosk flow scans four, which lands on 5 — the limit itself. One more open loan
   * here breaks the self-checkout and the tests that cover it, and any *overdue* one would
   * block the card outright. Returned records touch neither rule.
   */
  /*
   * Three books borrowed in one visit — the case Pain 4 is actually about ("nhiều đầu
   * sách cùng lúc"). Without one seeded here, a multi-book slip only ever appeared after
   * someone walked through the kiosk checkout, so opening the app cold never showed the
   * very situation the feature exists for.
   *
   * Closed, like every addition on this card: an open one would push the borrowing limit
   * and break the kiosk flow. See the note above.
   */
  ...['cormen-algorithms', 'rosen-discrete-math', 'kernighan-c-programming'].map(
    (bookId, i): LoanRecord => ({
      id: `loan-returned-batch-${i + 1}`,
      slipId: historySlipId(isoDaysFromNow(-70), '20215012'),
      studentId: '20215012',
      bookId,
      borrowedAt: isoDaysFromNow(-70),
      dueAt: isoDaysFromNow(-56),
      returnedAt: isoDaysFromNow(-58),
    }),
  ),

  {
    // Returned four days after it was due: the app tracks lateness, not just the fact of
    // a return, so "Đã trả trễ" has something real behind it.
    id: 'loan-returned-late',
    slipId: historySlipId(isoDaysFromNow(-130), '20215012'),
    studentId: '20215012',
    bookId: 'stewart-calculus',
    borrowedAt: isoDaysFromNow(-130),
    dueAt: isoDaysFromNow(-116),
    returnedAt: isoDaysFromNow(-112),
  },
  {
    id: 'loan-returned-4',
    slipId: historySlipId(isoDaysFromNow(-160), '20215012'),
    studentId: '20215012',
    bookId: 'campbell-biology',
    borrowedAt: isoDaysFromNow(-160),
    dueAt: isoDaysFromNow(-146),
    returnedAt: isoDaysFromNow(-150),
  },
]

/** Loans a card still has out — the ones that count against the limit. */
export function openLoansFor(studentId: string): LoanRecord[] {
  return loanHistory.filter((l) => l.studentId === studentId && l.returnedAt === null)
}

export function overdueLoansFor(studentId: string, now = new Date()): LoanRecord[] {
  // Local date, matching how the seeded dates were generated — see isoDaysFromNow.
  const today = isoDate(now)
  return openLoansFor(studentId).filter((l) => l.dueAt < today)
}
