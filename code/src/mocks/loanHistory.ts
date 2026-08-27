// Mock loan history / due-date tracking — backs Product-Service 4 / Pain Reliever 4
// (ứng dụng di động đồng bộ tình trạng sách và lịch sử mượn/hạn trả), and the
// eligibility check the self-checkout runs before letting a card borrow anything.
// Maps to the "Phone-PhieuMuon" screens in the Figma prototype.
import { isoDaysFromNow } from './students'

export interface LoanRecord {
  id: string
  /** Card the loan sits against — see students.ts. */
  studentId: string
  bookId: string
  borrowedAt: string // ISO date
  dueAt: string // ISO date
  returnedAt: string | null
}

/**
 * Dates are generated relative to today rather than hardcoded, so "quá hạn" stays
 * genuinely overdue and "còn hạn" stays in date no matter when the demo is run.
 */
export const loanHistory: LoanRecord[] = [
  // Nguyễn Minh Khang — the persona. One healthy loan, so borrowing is allowed.
  {
    id: 'loan-1',
    studentId: '20215012',
    bookId: 'dai-so-tuyen-tinh',
    borrowedAt: isoDaysFromNow(-4),
    dueAt: isoDaysFromNow(10),
    returnedAt: null,
  },

  // Lê Văn Nam — two books past their due date: demonstrates the overdue refusal.
  {
    id: 'loan-2',
    studentId: '20218888',
    bookId: 'vat-ly-dai-cuong',
    borrowedAt: isoDaysFromNow(-25),
    dueAt: isoDaysFromNow(-11),
    returnedAt: null,
  },
  {
    id: 'loan-3',
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
    studentId: '20215012',
    bookId: 'giai-tich-1',
    borrowedAt: isoDaysFromNow(-40),
    dueAt: isoDaysFromNow(-26),
    returnedAt: isoDaysFromNow(-28),
  },
]

/** Loans a card still has out — the ones that count against the limit. */
export function openLoansFor(studentId: string): LoanRecord[] {
  return loanHistory.filter((l) => l.studentId === studentId && l.returnedAt === null)
}

export function overdueLoansFor(studentId: string, now = new Date()): LoanRecord[] {
  const today = now.toISOString().slice(0, 10)
  return openLoansFor(studentId).filter((l) => l.dueAt < today)
}
