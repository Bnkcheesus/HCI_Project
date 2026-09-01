/**
 * What is left of the browser's half of the checkout: whether a scanned book belongs in
 * the cart on this screen.
 *
 * The card rules moved to `src/shared/borrowRules.test.ts`, and the end-to-end refusals to
 * `server/test/checkout.spec.ts`. What stays here is the one judgement that is genuinely
 * local — the cart is client state, and the server has never seen it.
 *
 * The book and its copy count are handed in, because the lookup is now a request. That
 * makes each case say what situation it is about instead of hunting the fixture for a
 * book that happens to be out of stock.
 */
import { describe, expect, it } from 'vitest'
import type { Availability, Book } from '@/shared/types'
import { evaluateScan, MAX_BOOKS_PER_LOAN } from './borrow'

const BOOK: Book = {
  id: 'giai-tich-1',
  title: 'Giải tích 1',
  isbn: '9786040123456',
  author: 'Nguyễn Đình Trí',
  subject: 'Toán học',
  type: 'book',
  spine: 1,
  description: 'Giáo trình giải tích một biến.',
  shelfCode: 'MA-101',
  floor: 1,
  year: 2018,
  language: 'vi',
}

const stock = (copiesAvailable: number): Availability => ({
  bookId: BOOK.id,
  status: copiesAvailable > 0 ? 'available' : 'borrowed',
  copiesTotal: 4,
  copiesAvailable,
})

describe('scanning a book into the cart', () => {
  it('accepts a book with a copy on the shelf', () => {
    expect(evaluateScan(BOOK, stock(3), [])).toEqual({ ok: true, book: BOOK })
  })

  /** A code the lookup could not resolve arrives as null — there is no book to judge. */
  it('rejects a code that matched nothing', () => {
    expect(evaluateScan(null, undefined, [])).toEqual({ ok: false, failure: 'not-found' })
  })

  it('refuses the same book twice', () => {
    expect(evaluateScan(BOOK, stock(3), [BOOK.id])).toEqual({ ok: false, failure: 'duplicate' })
  })

  /** The reader is standing at the shelf; being told here beats finding out at the desk. */
  it('refuses a book with no copies left', () => {
    expect(evaluateScan(BOOK, stock(0), [])).toEqual({ ok: false, failure: 'unavailable' })
  })

  /** A book with no availability row at all is treated as gone, not as available. */
  it('refuses a book whose copy count is missing', () => {
    expect(evaluateScan(BOOK, undefined, [])).toEqual({ ok: false, failure: 'unavailable' })
  })

  it('refuses to go past the per-loan limit', () => {
    const full = Array.from({ length: MAX_BOOKS_PER_LOAN }, (_, i) => `book-${i}`)
    expect(evaluateScan(BOOK, stock(3), full)).toEqual({ ok: false, failure: 'cart-full' })
  })

  /**
   * Order matters: a duplicate is reported as a duplicate even when the cart is also
   * full, because "cuốn này đã có trong phiếu" tells the reader what to do and "phiếu đã
   * đầy" does not.
   */
  it('reports a duplicate ahead of a full cart', () => {
    const full = Array.from({ length: MAX_BOOKS_PER_LOAN }, (_, i) => `book-${i}`)
    expect(evaluateScan(BOOK, stock(3), [BOOK.id, ...full])).toEqual({
      ok: false,
      failure: 'duplicate',
    })
  })
})
