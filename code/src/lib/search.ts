/**
 * Search, filter, sort and paginate the catalog — the logic behind the results screen.
 * Kept out of the components so it can be tested without rendering anything.
 */
import { availability, books, type Book, type DocumentType, type Language } from '@/mocks'
import { vietnameseIncludes } from './telex'

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

export const YEAR_MIN = Math.min(...books.map((b) => b.year))
export const YEAR_MAX = Math.max(...books.map((b) => b.year))

export const DEFAULT_FILTERS: AdvancedFilters = {
  yearFrom: YEAR_MIN,
  yearTo: YEAR_MAX,
  languages: [],
  stock: [],
}

/** How many facets the user has actually narrowed — drives the badge on the button. */
export function activeFilterCount(f: AdvancedFilters): number {
  let n = 0
  if (f.yearFrom > YEAR_MIN || f.yearTo < YEAR_MAX) n++
  if (f.languages.length > 0) n++
  if (f.stock.length > 0) n++
  return n
}

export function applyAdvancedFilters(results: Book[], f: AdvancedFilters): Book[] {
  return results.filter((b) => {
    if (b.year < f.yearFrom || b.year > f.yearTo) return false
    if (f.languages.length > 0 && !f.languages.includes(b.language)) return false
    if (f.stock.length > 0) {
      const state: StockState = copiesAvailable(b.id) > 0 ? 'available' : 'out'
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

/** Free-text match across title, author and subject, diacritic-insensitive. */
export function searchCatalog(query: string): Book[] {
  const q = query.trim()
  if (!q) return []
  return books.filter(
    (b) =>
      vietnameseIncludes(b.title, q) ||
      vietnameseIncludes(b.author, q) ||
      vietnameseIncludes(b.subject, q),
  )
}

export function copiesAvailable(bookId: string): number {
  return availability[bookId]?.copiesAvailable ?? 0
}

export function filterByType(results: Book[], type: TypeFilter): Book[] {
  return type === 'all' ? results : results.filter((b) => b.type === type)
}

export function sortResults(results: Book[], mode: SortMode): Book[] {
  const sorted = [...results]
  switch (mode) {
    case 'available':
      // Anything on the shelf outranks anything that is out — Pain Reliever 2:
      // the persona must not walk to a shelf that has nothing on it.
      return sorted.sort((a, b) => {
        const diff = Math.sign(copiesAvailable(b.id)) - Math.sign(copiesAvailable(a.id))
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
