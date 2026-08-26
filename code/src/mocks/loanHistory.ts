// Mock loan history / due-date tracking — backs Product-Service 4 / Pain Reliever 4
// (ứng dụng di động đồng bộ tình trạng sách và lịch sử mượn/hạn trả).
// Maps to the "Phone-PhieuMuon" screens in the Figma prototype.

export interface LoanRecord {
  id: string
  bookId: string
  borrowedAt: string // ISO date
  dueAt: string // ISO date
  returnedAt: string | null
}

export const loanHistory: LoanRecord[] = [
  {
    id: 'loan-1',
    bookId: 'book-1',
    borrowedAt: '2026-08-12',
    dueAt: '2026-08-26',
    returnedAt: null,
  },
]
