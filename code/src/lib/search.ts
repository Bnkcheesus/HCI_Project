/**
 * Search, filter, sort and paginate the catalog — the logic behind the results screen.
 * Kept out of the components so it can be tested without rendering anything.
 */
import type { Availability, Book, DocumentType, Language } from '@/shared/types'

/** Stock facet in the advanced filter — "Còn sách" / "Hết sách". */
export type StockState = 'available' | 'out'

export const STOCK_LABEL: Record<StockState, string> = {
  available: 'Còn sách',
  out: 'Hết sách',
}

export interface AdvancedFilters {
  yearFrom: number
  yearTo: number
  /** Empty means "no language restriction", not "exclude everything". */
  languages: Language[]
  stock: StockState[]
}

/**
 * The catalogue's real publication span, which used to be computed here from the whole
 * book list at import time.
 *
 * With the catalogue in a database there is no list to compute from, so the bounds arrive
 * with the library status and are threaded in. A slider whose ends do not match the data
 * either hides books at one end or offers years nothing was published in at the other.
 */
export interface YearBounds {
  min: number
  max: number
}

/** Where the slider sits before the reader touches it: the whole span, nothing excluded. */
export function defaultFilters(years: YearBounds): AdvancedFilters {
  return { yearFrom: years.min, yearTo: years.max, languages: [], stock: [] }
}

/** How many facets the user has actually narrowed — drives the badge on the button. */
export function activeFilterCount(f: AdvancedFilters, years: YearBounds): number {
  let n = 0
  if (f.yearFrom > years.min || f.yearTo < years.max) n++
  if (f.languages.length > 0) n++
  if (f.stock.length > 0) n++
  return n
}

/**
 * Availability arrives as the map the search endpoint returns alongside the books, rather
 * than being read from a global. That pairing is what keeps the stock facet honest: it is
 * filtering on the same copy counts the chips on those cards are showing.
 */
export function applyAdvancedFilters(
  results: Book[],
  f: AdvancedFilters,
  availability: Record<string, Availability>,
): Book[] {
  return results.filter((b) => {
    if (b.year < f.yearFrom || b.year > f.yearTo) return false
    if (f.languages.length > 0 && !f.languages.includes(b.language)) return false
    if (f.stock.length > 0) {
      const state: StockState = copiesAvailable(availability, b.id) > 0 ? 'available' : 'out'
      if (!f.stock.includes(state)) return false
    }
    return true
  })
}

export type SortMode = 'relevance' | 'available' | 'title'
export type TypeFilter = DocumentType | 'all'

export const SORT_LABEL: Record<SortMode, string> = {
  relevance: 'Liên quan nhất',
  available: 'Sách còn trước',
  title: 'Tên A → Z',
}

export function copiesAvailable(
  availability: Record<string, Availability>,
  bookId: string,
): number {
  return availability[bookId]?.copiesAvailable ?? 0
}

export function filterByType(results: Book[], type: TypeFilter): Book[] {
  return type === 'all' ? results : results.filter((b) => b.type === type)
}

export function sortResults(
  results: Book[],
  mode: SortMode,
  availability: Record<string, Availability> = {},
): Book[] {
  const sorted = [...results]
  switch (mode) {
    case 'available':
      // Anything on the shelf outranks anything that is out — Pain Reliever 2:
      // the persona must not walk to a shelf that has nothing on it.
      return sorted.sort((a, b) => {
        const diff =
          Math.sign(copiesAvailable(availability, b.id)) -
          Math.sign(copiesAvailable(availability, a.id))
        return diff !== 0 ? diff : a.title.localeCompare(b.title, 'vi')
      })
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'vi'))
    default:
      return sorted
  }
}

/** How many results of each document type, for the filter chip counts. */
export function countByType(results: Book[]): Record<TypeFilter, number> {
  return {
    all: results.length,
    book: results.filter((b) => b.type === 'book').length,
    journal: results.filter((b) => b.type === 'journal').length,
    magazine: results.filter((b) => b.type === 'magazine').length,
  }
}

export const PAGE_SIZE = 8

export interface Page<T> {
  items: T[]
  page: number
  pageCount: number
  from: number
  to: number
  total: number
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * size
  const slice = items.slice(start, start + size)
  return {
    items: slice,
    page: current,
    pageCount,
    from: items.length === 0 ? 0 : start + 1,
    to: start + slice.length,
    total: items.length,
  }
}
