import { describe, expect, it } from 'vitest'
import {
  daysUntilDue,
  dueCountdown,
  DUE_SOON_DAYS,
  loanStatus,
  mostUrgentLoan,
  sortByDueDate,
  wasReturnedLate,
} from './loans'
import type { LoanRecord } from '@/mocks'

/** Mid-afternoon on purpose: a loan taken out after noon must not lose a day. */
const NOW = new Date('2026-08-28T15:30:00')

function loan(over: Partial<LoanRecord> = {}): LoanRecord {
  return {
    id: 'l',
    slipId: 'SLIP-2026-0814-5012',
    studentId: '20215012',
    bookId: 'giai-tich-1',
    borrowedAt: '2026-08-14',
    dueAt: '2026-08-28',
    returnedAt: null,
    ...over,
  }
}

describe('daysUntilDue', () => {
  it.each([
    ['2026-08-28', 0, 'today'],
    ['2026-08-29', 1, 'tomorrow'],
    ['2026-08-27', -1, 'yesterday'],
    ['2026-09-11', 14, 'a full loan away'],
    ['2026-08-21', -7, 'a week late'],
  ])('%s is %i day(s) away (%s)', (dueAt, expected) => {
    expect(daysUntilDue(dueAt, NOW)).toBe(expected)
  })

  /**
   * The count is in whole days, not elapsed milliseconds. Comparing timestamps directly
   * would make a book borrowed at 15:30 read "còn 13 ngày" the moment it was issued.
   */
  it('does not lose a day to the time of day', () => {
    const earlyMorning = new Date('2026-08-28T00:05:00')
    const lateEvening = new Date('2026-08-28T23:55:00')
    expect(daysUntilDue('2026-09-11', earlyMorning)).toBe(14)
    expect(daysUntilDue('2026-09-11', lateEvening)).toBe(14)
  })
})

describe('loanStatus', () => {
  it('reports a returned loan as returned however overdue it was', () => {
    expect(loanStatus(loan({ dueAt: '2026-01-01', returnedAt: '2026-03-01' }), NOW)).toBe('returned')
  })

  it('reports an unreturned loan past its date as overdue', () => {
    expect(loanStatus(loan({ dueAt: '2026-08-27' }), NOW)).toBe('overdue')
  })

  // The boundary itself: due today is not yet overdue.
  it('treats the due date as still in time', () => {
    expect(loanStatus(loan({ dueAt: '2026-08-28' }), NOW)).toBe('due-soon')
  })

  it('warns from the due-soon window and not before it', () => {
    const inside = new Date(NOW)
    expect(loanStatus(loan({ dueAt: '2026-08-31' }), inside)).toBe('due-soon') // 3 days
    expect(loanStatus(loan({ dueAt: '2026-09-01' }), inside)).toBe('active') // 4 days
    expect(DUE_SOON_DAYS).toBe(3)
  })
})

describe('dueCountdown', () => {
  it.each([
    ['2026-08-28', 'Đến hạn hôm nay'],
    ['2026-08-29', 'Đến hạn ngày mai'],
    ['2026-08-31', 'Còn 3 ngày'],
    ['2026-08-26', 'Quá hạn 2 ngày'],
  ])('%s reads as "%s"', (dueAt, expected) => {
    expect(dueCountdown(dueAt, NOW)).toBe(expected)
  })
})

describe('wasReturnedLate', () => {
  it('is true only when the return came after the due date', () => {
    expect(wasReturnedLate(loan({ dueAt: '2026-08-10', returnedAt: '2026-08-14' }))).toBe(true)
    expect(wasReturnedLate(loan({ dueAt: '2026-08-10', returnedAt: '2026-08-10' }))).toBe(false)
    expect(wasReturnedLate(loan({ returnedAt: null }))).toBe(false)
  })
})

describe('ordering', () => {
  const soon = loan({ id: 'soon', dueAt: '2026-08-29' })
  const later = loan({ id: 'later', dueAt: '2026-09-11' })
  const late = loan({ id: 'late', dueAt: '2026-08-20' })

  it('puts the soonest due date first, so overdue loans lead', () => {
    expect(sortByDueDate([later, soon, late]).map((l) => l.id)).toEqual(['late', 'soon', 'later'])
  })

  it('leads with the loan running out of time first', () => {
    expect(mostUrgentLoan([later, soon, late])?.id).toBe('late')
    expect(mostUrgentLoan([])).toBeUndefined()
  })

  it('does not mutate the array it was given', () => {
    const input = [later, soon, late]
    sortByDueDate(input)
    expect(input.map((l) => l.id)).toEqual(['later', 'soon', 'late'])
  })
})
