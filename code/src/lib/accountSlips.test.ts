/**
 * Sorting and splitting a reader's slips — what stayed in the browser.
 *
 * The *grouping* of loan rows into slips moved to the server, and is covered by
 * `server/test/api.spec.ts` against real SQL. These are the pure helpers the mobile
 * screens still run on the result: which slips are open, in what order, and which books
 * inside them are still out.
 *
 * Built from literals rather than from the fixture. Each case is about a shape — an
 * overdue slip, a half-returned one — and reaching into `loanHistory` for a slip that
 * happens to have that shape makes the test fail later for reasons that have nothing to
 * do with the code.
 */
import { describe, expect, it } from 'vitest'
import type { AccountSlip } from '@/shared/types'
import { closedSlips, isSlipOpen, openBooks, openSlips } from './accountSlips'

function slip(
  id: string,
  borrowedAt: string,
  dueAt: string,
  books: [string, string | null][],
): AccountSlip {
  return {
    id,
    borrowedAt,
    dueAt,
    books: books.map(([bookId, returnedAt]) => ({ bookId, returnedAt })),
    source: 'history',
  }
}

const OVERDUE = slip('SLIP-A', '2026-01-05', '2026-01-19', [['a', null]])
const DUE_LATER = slip('SLIP-B', '2026-02-01', '2026-02-15', [['b', null]])
const RETURNED = slip('SLIP-C', '2026-01-10', '2026-01-24', [['c', '2026-01-20']])
const OLDER_RETURNED = slip('SLIP-D', '2025-11-01', '2025-11-15', [['d', '2025-11-10']])

/** One book back, one still out — the slip as a whole is not finished. */
const HALF_BACK = slip('SLIP-E', '2026-02-10', '2026-02-24', [
  ['e1', '2026-02-12'],
  ['e2', null],
])

describe('isSlipOpen', () => {
  it('is open while any book on it is still out', () => {
    expect(isSlipOpen(HALF_BACK)).toBe(true)
    expect(isSlipOpen(DUE_LATER)).toBe(true)
  })

  it('is closed only once every book has come back', () => {
    expect(isSlipOpen(RETURNED)).toBe(false)
  })
})

describe('openSlips', () => {
  /** Soonest due first, so anything overdue leads — the reader's most urgent debt. */
  it('sorts by due date, overdue first', () => {
    const sorted = openSlips([DUE_LATER, HALF_BACK, OVERDUE, RETURNED])
    expect(sorted.map((s) => s.id)).toEqual(['SLIP-A', 'SLIP-B', 'SLIP-E'])
  })

  it('leaves out anything fully returned', () => {
    expect(openSlips([RETURNED, OLDER_RETURNED])).toEqual([])
  })
})

describe('closedSlips', () => {
  /** Most recently borrowed first: a history reads backwards from now. */
  it('sorts by borrow date, newest first', () => {
    const sorted = closedSlips([OLDER_RETURNED, RETURNED, OVERDUE])
    expect(sorted.map((s) => s.id)).toEqual(['SLIP-C', 'SLIP-D'])
  })
})

describe('openBooks', () => {
  /**
   * Flattened across slips and sorted by due date. The home screen counts these and leads
   * with the first — the one running out of time — so a book still out on a half-returned
   * slip has to appear, and the one already back must not.
   */
  it('lists every book still out, soonest due first', () => {
    expect(openBooks([HALF_BACK, OVERDUE, RETURNED])).toEqual([
      { bookId: 'a', dueAt: '2026-01-19' },
      { bookId: 'e2', dueAt: '2026-02-24' },
    ])
  })

  it('gives each book the due date of its own slip', () => {
    expect(openBooks([DUE_LATER])).toEqual([{ bookId: 'b', dueAt: '2026-02-15' }])
  })

  it('is empty when nothing is out', () => {
    expect(openBooks([RETURNED, OLDER_RETURNED])).toEqual([])
  })
})
