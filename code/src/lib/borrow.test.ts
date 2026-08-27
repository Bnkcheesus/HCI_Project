import { describe, expect, it } from 'vitest'
import {
  checkEligibility,
  createLoanSlip,
  findBookByCode,
  formatDate,
  LOAN_DAYS,
  MAX_BOOKS_PER_LOAN,
  scanBook,
} from './borrow'
import { availability, books, findStudentByCard, openLoansFor, type Student } from '@/mocks'

const student = (cardCode: string): Student => {
  const found = findStudentByCard(cardCode)
  if (!found) throw new Error(`no demo card ${cardCode}`)
  return found
}

const KHANG = '20215012' // valid card, one healthy loan
const EXPIRED = '20219999'
const OVERDUE = '20218888'
const AT_LIMIT = '20217777'

const inStock = books.find((b) => (availability[b.id]?.copiesAvailable ?? 0) > 0)!
const outOfStock = books.find((b) => (availability[b.id]?.copiesAvailable ?? 0) === 0)!

describe('scanning a book', () => {
  it('reads a book off its ISBN', () => {
    const result = scanBook(inStock.isbn, [])
    expect(result).toEqual({ ok: true, book: inStock })
  })

  // Scanners and readers both introduce separators; neither should cause a false refusal.
  it('ignores spaces and dashes in the code', () => {
    expect(findBookByCode(` ${inStock.isbn.replace(/(\d{3})(\d{4})/, '$1-$2')} `)?.id).toBe(inStock.id)
  })

  it('rejects a code that is not in the catalog', () => {
    expect(scanBook('0000000000000', [])).toEqual({ ok: false, failure: 'not-found' })
    expect(scanBook('', [])).toEqual({ ok: false, failure: 'not-found' })
  })

  it('refuses the same book twice', () => {
    expect(scanBook(inStock.isbn, [inStock.id])).toEqual({ ok: false, failure: 'duplicate' })
  })

  /** The reader is standing at the shelf; being told here beats finding out at the desk. */
  it('refuses a book with no copies left', () => {
    expect(scanBook(outOfStock.isbn, [])).toEqual({ ok: false, failure: 'unavailable' })
  })

  it('refuses to go past the per-loan limit', () => {
    const full = books.slice(0, MAX_BOOKS_PER_LOAN).map((b) => b.id)
    const spare = books.find((b) => !full.includes(b.id) && (availability[b.id]?.copiesAvailable ?? 0) > 0)!
    expect(scanBook(spare.isbn, full)).toEqual({ ok: false, failure: 'cart-full' })
  })
})

describe('checking a card', () => {
  it('lets a card in good standing borrow', () => {
    expect(checkEligibility(student(KHANG), 1)).toEqual([])
  })

  it('blocks an expired card and says how to fix it', () => {
    const blocks = checkEligibility(student(EXPIRED), 1)
    expect(blocks.map((b) => b.code)).toContain('card-expired')
    expect(blocks.every((b) => b.hint.length > 0)).toBe(true)
  })

  it('blocks a card with overdue books and names them', () => {
    const blocks = checkEligibility(student(OVERDUE), 1)
    const overdue = blocks.find((b) => b.code === 'overdue')
    expect(overdue).toBeDefined()
    // Naming the titles is the point — "bạn có sách quá hạn" alone sends them home guessing.
    expect(overdue!.message).toMatch(/Vật lý đại cương|Giải tích 1/)
  })

  it('blocks a card that has already reached the limit', () => {
    expect(openLoansFor(AT_LIMIT)).toHaveLength(MAX_BOOKS_PER_LOAN)
    const blocks = checkEligibility(student(AT_LIMIT), 1)
    expect(blocks.map((b) => b.code)).toContain('limit')
  })

  /**
   * The limit is about the cart plus what is already out, not the cart alone: 1 open loan
   * plus 5 new books is over the line even though neither number is.
   */
  it('counts the cart against the books already on loan', () => {
    expect(checkEligibility(student(KHANG), MAX_BOOKS_PER_LOAN)).toHaveLength(1)
    expect(checkEligibility(student(KHANG), MAX_BOOKS_PER_LOAN - 1)).toEqual([])
  })

  it('reports every problem at once rather than one at a time', () => {
    // A card can be both expired and over its limit; hiding the second sends the reader
    // to the desk twice.
    const blocks = checkEligibility(student(EXPIRED), MAX_BOOKS_PER_LOAN + 1)
    expect(blocks.length).toBeGreaterThan(1)
  })

  it('does not count returned books against the limit', () => {
    // Khang has one returned loan on file plus one open one.
    expect(openLoansFor(KHANG)).toHaveLength(1)
  })
})

describe('the loan slip', () => {
  const now = new Date('2026-03-10T09:00:00Z')

  it('dates the loan today and the return LOAN_DAYS later', () => {
    const slip = createLoanSlip(student(KHANG), [inStock.id], now)
    expect(slip.borrowedAt).toBe('2026-03-10')
    expect(slip.dueAt).toBe('2026-03-24')
  })

  it('carries every scanned book', () => {
    const ids = books.slice(0, 3).map((b) => b.id)
    expect(createLoanSlip(student(KHANG), ids, now).bookIds).toEqual(ids)
  })

  it('identifies the borrower', () => {
    const slip = createLoanSlip(student(KHANG), [inStock.id], now)
    expect(slip.studentName).toBe('Nguyễn Minh Khang')
    expect(slip.id).toContain('2026')
  })

  it('formats dates the way the receipt shows them', () => {
    expect(formatDate('2026-03-24')).toBe('24/03/2026')
  })

  it('agrees with the loan period the AI librarian quotes to readers', () => {
    expect(LOAN_DAYS).toBe(14)
    expect(MAX_BOOKS_PER_LOAN).toBe(5)
  })
})
