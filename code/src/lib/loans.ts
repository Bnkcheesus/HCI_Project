/**
 * Due-date arithmetic for the mobile companion — Pain 4 ("khó nhớ lịch sử mượn và hạn
 * trả của nhiều đầu sách cùng lúc") / Pain Reliever 4 (app nhắc hạn trả tự động).
 *
 * Kept free of React so the boundaries — due today, due tomorrow, one day late — can be
 * tested directly instead of inferred from a rendered screen.
 */

/**
 * How close to the due date counts as "sắp đến hạn".
 *
 * Three days is enough for a student to notice on one visit and still act on the next.
 * A one-day warning is a fait accompli, and a week of amber makes the colour meaningless.
 */
export const DUE_SOON_DAYS = 3

export type LoanStatus = 'returned' | 'overdue' | 'due-soon' | 'active'

/** Local midnight for an ISO date, as a UTC timestamp — comparable without timezone drift. */
function dayStamp(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function todayStamp(now: Date): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * Whole days from today to the due date: 0 today, 1 tomorrow, -1 yesterday.
 *
 * Counted in days, not milliseconds, because "còn 1 ngày" must not flip to "còn 0 ngày"
 * merely because the loan was taken out in the afternoon.
 */
export function daysUntilDue(dueAt: string, now = new Date()): number {
  return Math.round((dayStamp(dueAt) - todayStamp(now)) / 86_400_000)
}

/** Takes only the two fields it reads, so a slip's book row need not fake a whole record. */
export function loanStatus(
  loan: { dueAt: string; returnedAt: string | null },
  now = new Date(),
): LoanStatus {
  if (loan.returnedAt !== null) return 'returned'

  const days = daysUntilDue(loan.dueAt, now)
  if (days < 0) return 'overdue'
  if (days <= DUE_SOON_DAYS) return 'due-soon'
  return 'active'
}

/** Was this returned after its due date? Shown as "Đã trả trễ" rather than a bare tick. */
export function wasReturnedLate(loan: { dueAt: string; returnedAt: string | null }): boolean {
  return loan.returnedAt !== null && loan.returnedAt > loan.dueAt
}

/**
 * The countdown a reader actually reads. Deliberately phrased in days-from-now rather
 * than a date: "còn 2 ngày" answers the question, "11/09/2026" makes them do the sum.
 */
export function dueCountdown(dueAt: string, now = new Date()): string {
  const days = daysUntilDue(dueAt, now)
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`
  if (days === 0) return 'Đến hạn hôm nay'
  if (days === 1) return 'Đến hạn ngày mai'
  return `Còn ${days} ngày`
}

/**
 * Soonest due first — overdue ones therefore lead the list.
 *
 * Generic over anything carrying a due date, because the same ordering applies to a raw
 * loan record, a slip, and a single book flattened out of one.
 */
export function sortByDueDate<T extends { dueAt: string }>(loans: T[]): T[] {
  return [...loans].sort((a, b) => a.dueAt.localeCompare(b.dueAt))
}

/** The loan the home screen leads with: the one running out of time first. */
export function mostUrgentLoan<T extends { dueAt: string }>(openLoans: T[]): T | undefined {
  return sortByDueDate(openLoans)[0]
}
