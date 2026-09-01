/**
 * The borrowing rules, tested where they now live.
 *
 * These assertions used to sit in `lib/borrow.test.ts` and call a function that reached
 * into `@/mocks` for the card's loans. The rules take those loans as an argument now,
 * because the server runs the same function against rows read inside the borrow
 * transaction — so the tests hand them in too, and each case states the situation it is
 * about instead of depending on which fixture card happens to be in what state.
 *
 * The end-to-end half — that `POST /api/loans` actually refuses these cards — is
 * `server/test/checkout.spec.ts`, against a real database.
 */
import { describe, expect, it } from 'vitest'
import type { LoanRecord, Student } from './types'
import {
  checkEligibility,
  dueDateFrom,
  formatDate,
  isoDate,
  LOAN_DAYS,
  MAX_BOOKS_PER_LOAN,
  normalizeIsbn,
  slipIdFor,
} from './borrowRules'

const NOW = new Date('2026-03-10T09:00:00')

function card(expiresAt = '2027-01-01'): Student {
  return {
    cardCode: '20215012',
    name: 'Nguyễn Minh Khang',
    studentId: '20215012',
    faculty: 'Khoa Công nghệ Thông tin',
    expiresAt,
  }
}

function loan(bookId: string, dueAt: string): LoanRecord {
  return {
    id: `SLIP-X::${bookId}`,
    slipId: 'SLIP-X',
    studentId: '20215012',
    bookId,
    borrowedAt: '2026-02-24',
    dueAt,
    returnedAt: null,
  }
}

const TITLES: Record<string, string> = {
  'vat-ly-dai-cuong': 'Vật lý đại cương',
  'giai-tich-1': 'Giải tích 1',
}
const titleOf = (id: string) => TITLES[id] ?? id

function check(student: Student, cartSize: number, openLoans: LoanRecord[] = []) {
  return checkEligibility({ student, cartSize, openLoans, titleOf }, NOW)
}

describe('checking a card', () => {
  it('lets a card in good standing borrow', () => {
    expect(check(card(), 1, [loan('giai-tich-1', '2026-03-24')])).toEqual([])
  })

  it('blocks an expired card and says how to fix it', () => {
    const blocks = check(card('2026-01-01'), 1)
    expect(blocks.map((b) => b.code)).toContain('card-expired')
    expect(blocks.every((b) => b.hint.length > 0)).toBe(true)
  })

  it('blocks a card with overdue books and names them', () => {
    const blocks = check(card(), 1, [
      loan('vat-ly-dai-cuong', '2026-02-28'),
      loan('giai-tich-1', '2026-03-04'),
    ])
    const overdue = blocks.find((b) => b.code === 'overdue')
    expect(overdue).toBeDefined()
    // Naming the titles is the point — "bạn có sách quá hạn" alone sends them home guessing.
    expect(overdue!.message).toContain('Vật lý đại cương')
    expect(overdue!.message).toContain('Giải tích 1')
  })

  /** A book due today is not overdue. The boundary is the whole reason this is by date. */
  it('does not call a book due today overdue', () => {
    expect(check(card(), 1, [loan('giai-tich-1', isoDate(NOW))])).toEqual([])
  })

  it('blocks a card that has already reached the limit', () => {
    const full = Array.from({ length: MAX_BOOKS_PER_LOAN }, (_, i) => loan(`b${i}`, '2026-03-24'))
    expect(check(card(), 1, full).map((b) => b.code)).toContain('limit')
  })

  /**
   * The limit is about the cart plus what is already out, not the cart alone: one open
   * loan plus five new books is over the line even though neither number is.
   */
  it('counts the cart against the books already on loan', () => {
    const one = [loan('giai-tich-1', '2026-03-24')]
    expect(check(card(), MAX_BOOKS_PER_LOAN, one)).toHaveLength(1)
    expect(check(card(), MAX_BOOKS_PER_LOAN - 1, one)).toEqual([])
  })

  it('reports every problem at once rather than one at a time', () => {
    // A card can be both expired and over its limit; hiding the second sends the reader
    // to the desk twice.
    const blocks = check(card('2026-01-01'), MAX_BOOKS_PER_LOAN + 1)
    expect(blocks.length).toBeGreaterThan(1)
  })
})

describe('dates and codes', () => {
  /**
   * Local date, not UTC. The two disagree for the last seven hours of every day in
   * Vietnam, and this used to be the bug: the slip number was built from the local date
   * while the borrow date was built from the UTC one, so an evening loan could carry a
   * number naming tomorrow.
   */
  it('reads today as a local date', () => {
    expect(isoDate(new Date('2026-03-10T23:30:00'))).toBe('2026-03-10')
  })

  it('dates the return LOAN_DAYS after the loan', () => {
    expect(dueDateFrom(NOW)).toBe('2026-03-24')
  })

  it('builds the slip number the QR handoff expects', () => {
    expect(slipIdFor('2026-03-10', '20215012')).toBe('SLIP-2026-0310-5012')
  })

  /**
   * Date plus card is not unique: a reader can borrow in the morning and again after
   * lunch. Before the sequence existed the second visit generated a number the first
   * already had, and the borrow died on the unique key — a 500, not a refusal.
   *
   * The suffix appears only from the second slip, so the number a reader normally sees is
   * unchanged and every id already filed stays valid.
   */
  it('distinguishes a second visit on the same day', () => {
    expect(slipIdFor('2026-03-10', '20215012', 2)).toBe('SLIP-2026-0310-5012-2')
    expect(slipIdFor('2026-03-10', '20215012', 1)).toBe('SLIP-2026-0310-5012')
  })

  it('formats dates the way the receipt shows them', () => {
    expect(formatDate('2026-03-24')).toBe('24/03/2026')
  })

  // Scanners and readers both introduce separators; neither should cause a false refusal.
  it('ignores spaces and dashes in a code', () => {
    expect(normalizeIsbn(' 978-0262 033848 ')).toBe('9780262033848')
  })

  it('agrees with the loan period the AI librarian quotes to readers', () => {
    expect(LOAN_DAYS).toBe(14)
    expect(MAX_BOOKS_PER_LOAN).toBe(5)
  })
})
