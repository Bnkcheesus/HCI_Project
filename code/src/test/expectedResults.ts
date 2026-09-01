/**
 * What the search endpoint would return for a query, computed from the fixtures.
 *
 * Page tests used to call `searchCatalog` for this. The finding is the server's now, so
 * they predict it the same way the fake API answers it — folded with the shared
 * `buildSearchText`, over the same book list that seeds the database. A hardcoded list of
 * ids would drift the next time the catalogue is regenerated.
 */
import { books, loanHistory } from '@/mocks'
import { buildSearchText } from '@/shared/text'
import type { AccountSlip, Book } from '@/shared/types'

export function expectedResults(query: string): Book[] {
  const folded = buildSearchText([query])
  if (!folded.trim()) return []
  return books.filter((b) =>
    buildSearchText([b.title, b.author, b.subject]).includes(folded),
  )
}

/**
 * The slips `GET /api/accounts/:card/slips` would return, grouped the way the server
 * groups them.
 *
 * Tests used to call `accountSlips()` from `lib/`, which read the mock directly. That
 * function is the server's now, so this predicts its answer from the same fixture — which
 * is also what the fake API serves.
 */
export function accountSlipsFixture(cardCode: string): AccountSlip[] {
  const grouped = new Map<string, AccountSlip>()

  for (const loan of loanHistory.filter((l) => l.studentId === cardCode)) {
    const entry = { bookId: loan.bookId, returnedAt: loan.returnedAt }
    const existing = grouped.get(loan.slipId)
    if (existing) {
      existing.books.push(entry)
      continue
    }
    grouped.set(loan.slipId, {
      id: loan.slipId,
      borrowedAt: loan.borrowedAt,
      dueAt: loan.dueAt,
      books: [entry],
      source: 'history',
    })
  }

  return [...grouped.values()].sort((a, b) => b.borrowedAt.localeCompare(a.borrowedAt))
}
