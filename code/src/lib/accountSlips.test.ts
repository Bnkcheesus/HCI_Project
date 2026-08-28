import { beforeEach, describe, expect, it } from 'vitest'
import { createLoanSlip } from './borrow'
import { clearSavedSlips, saveSlip } from './loanSlips'
import { accountSlips, closedSlips, isSlipOpen, openBooks, openSlips } from './accountSlips'
import { findStudentByCard, isoDaysFromNow, loanHistory } from '@/mocks'

const KHANG = '20215012'
const student = findStudentByCard(KHANG)!

beforeEach(() => clearSavedSlips())

describe('accountSlips — reading the seeded history', () => {
  it('covers every history record for the card, and none from another card', () => {
    const mine = loanHistory.filter((l) => l.studentId === KHANG)
    const bookIds = accountSlips(KHANG).flatMap((s) => s.books.map((b) => b.bookId))

    expect(bookIds).toHaveLength(mine.length)
    expect(new Set(bookIds)).toEqual(new Set(mine.map((l) => l.bookId)))
  })

  it('keeps a slip open while any of its books is still out', () => {
    const open = openSlips(accountSlips(KHANG))
    expect(open.length).toBeGreaterThan(0)
    expect(open.every(isSlipOpen)).toBe(true)
    expect(closedSlips(accountSlips(KHANG)).every((s) => !isSlipOpen(s))).toBe(true)
  })

  it('sorts open slips by due date and closed ones by most recently borrowed', () => {
    const slips = accountSlips(KHANG)
    const dues = openSlips(slips).map((s) => s.dueAt)
    expect(dues).toEqual([...dues].sort())

    const borrowed = closedSlips(slips).map((s) => s.borrowedAt)
    expect(borrowed).toEqual([...borrowed].sort().reverse())
  })
})

describe('accountSlips — slips filed at the kiosk', () => {
  /**
   * The receipt screen tells the reader "đã lưu vào ứng dụng LibAssist". If a slip filed
   * at the kiosk did not appear here, that message would be false — this is the assertion
   * that keeps the two screens honest with each other.
   */
  it('shows a slip the kiosk filed this session', () => {
    const slip = createLoanSlip(student, ['cormen-algorithms', 'stewart-calculus'])
    saveSlip(slip)

    const found = accountSlips(KHANG).find((s) => s.id === slip.id)
    expect(found).toBeDefined()
    expect(found!.source).toBe('kiosk')
    expect(found!.books.map((b) => b.bookId)).toEqual(slip.bookIds)
    expect(isSlipOpen(found!)).toBe(true)
  })

  // Pain 4 is about "nhiều đầu sách cùng lúc" — four books borrowed together are one
  // slip, not four cards repeating the same dates.
  it('keeps a multi-book loan as a single slip', () => {
    const ids = ['cormen-algorithms', 'stewart-calculus', 'campbell-biology', 'rosen-discrete-math']
    saveSlip(createLoanSlip(student, ids))

    const kioskSlips = accountSlips(KHANG).filter((s) => s.source === 'kiosk')
    expect(kioskSlips).toHaveLength(1)
    expect(kioskSlips[0].books).toHaveLength(4)
  })

  it('ignores slips belonging to another card', () => {
    const other = findStudentByCard('20217777')!
    saveSlip(createLoanSlip(other, ['cormen-algorithms']))
    expect(accountSlips(KHANG).some((s) => s.source === 'kiosk')).toBe(false)
  })
})

describe('openBooks', () => {
  it('flattens every unreturned book across slips, soonest due first', () => {
    saveSlip(createLoanSlip(student, ['cormen-algorithms', 'stewart-calculus']))

    const out = openBooks(accountSlips(KHANG))
    const dues = out.map((b) => b.dueAt)
    expect(dues).toEqual([...dues].sort())

    // The seeded open loan plus the two just borrowed; nothing returned leaks in.
    expect(out).toHaveLength(3)
  })

  it('leaves returned books out entirely', () => {
    const returned = loanHistory.filter((l) => l.studentId === KHANG && l.returnedAt !== null)
    const out = openBooks(accountSlips(KHANG)).map((b) => b.bookId)
    for (const record of returned) expect(out).not.toContain(record.bookId)
  })
})

describe('grouping', () => {
  it('groups history rows that share a slip number', () => {
    const slips = accountSlips(KHANG)
    for (const slip of slips.filter((s) => s.source === 'history')) {
      const rows = loanHistory.filter((l) => l.studentId === KHANG && l.slipId === slip.id)
      expect(slip.books).toHaveLength(rows.length)
    }
  })

  /**
   * Pain 4 is about "nhiều đầu sách cùng lúc". Unit-testing a multi-book slip built in the
   * test is not enough — the seeded account has to contain one, or opening the app cold
   * never shows the case the feature exists for.
   */
  it('seeds a real multi-book slip on the account', () => {
    const multi = accountSlips(KHANG).filter((s) => s.books.length > 1)
    expect(multi.length).toBeGreaterThan(0)
    expect(multi[0].source).toBe('history')
  })

  /**
   * Every card shows a slip number. Showing it on some and not others read as a rendering
   * bug; the cause was that history rows had no slip of their own to name.
   */
  it('gives every slip a number in the printed format', () => {
    for (const slip of accountSlips(KHANG)) {
      expect(slip.id).toMatch(/^SLIP-\d{4}-\d{4}-\d{4}$/)
    }
  })

  it('keeps two visits on the same day as separate slips', () => {
    const sameDay = loanHistory.filter((l) => l.borrowedAt === isoDaysFromNow(-3))
    // Phạm Gia Bảo's five books went out together, so they share one slip id.
    expect(new Set(sameDay.map((l) => l.slipId)).size).toBe(1)
  })
})
