/**
 * Narrowing a result set — the half of search that stayed in the browser.
 *
 * The *finding* moved to the server: `searchCatalog` is gone, and the cases that covered
 * it (subject and author matches, an unaccented Vietnamese query, a full and a partial
 * ISBN, and the guard that keeps "2022" from being read as a code) now live in
 * `server/test/api.spec.ts`, where they run against real SQL. Nothing was dropped.
 *
 * What is tested here is what still runs on the reader's own screen: type chips, sorting,
 * pagination and the advanced filters. They take the result set and its copy counts as
 * arguments now — the same pair the search endpoint returns together — so a fixture
 * stands in for what the server would have sent.
 */
import { describe, expect, it } from 'vitest'
import {
  activeFilterCount,
  applyAdvancedFilters,
  copiesAvailable,
  countByType,
  defaultFilters,
  filterByType,
  paginate,
  sortResults,
} from './search'
import { availability, books } from '@/mocks'
import { buildSearchText } from '@/shared/text'

/**
 * Stands in for `GET /api/books?q=machine learning`, folded the same way the server folds
 * it. Not a hand-picked list: a fixed set of ids would stop matching the catalogue the
 * moment it is regenerated, and this is the same query the API tests use.
 */
const results = books.filter((b) =>
  buildSearchText([b.title, b.author, b.subject]).includes(buildSearchText(['machine learning'])),
)

const YEARS = {
  min: Math.min(...books.map((b) => b.year)),
  max: Math.max(...books.map((b) => b.year)),
}
const NONE = defaultFilters(YEARS)
const copies = (id: string) => copiesAvailable(availability, id)

describe('filterByType and countByType', () => {
  it('counts each document type', () => {
    const counts = countByType(results)
    expect(counts.all).toBe(results.length)
    expect(counts.all).toBe(counts.book + counts.journal + counts.magazine)
    expect(counts.journal).toBe(2)
    expect(counts.magazine).toBe(1)
  })

  it('narrows the list to one type', () => {
    expect(filterByType(results, 'magazine').map((b) => b.id)).toEqual(['tia-sang-ai'])
  })

  it('passes everything through for "all"', () => {
    expect(filterByType(results, 'all')).toHaveLength(results.length)
  })
})

describe('sortResults', () => {
  it('puts books with copies on the shelf ahead of ones that are out', () => {
    const sorted = sortResults(results, 'available', availability)
    const firstOutIndex = sorted.findIndex((b) => copies(b.id) === 0)
    const lastInStockIndex = sorted.reduce(
      (acc, b, i) => (copies(b.id) > 0 ? i : acc),
      -1,
    )
    expect(lastInStockIndex).toBeLessThan(firstOutIndex)
  })

  it('sorts by title', () => {
    const titles = sortResults(results, 'title', availability).map((b) => b.title)
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'vi')))
  })

  it('leaves order untouched for relevance', () => {
    expect(sortResults(results, 'relevance', availability)).toEqual(results)
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 11 }, (_, i) => i + 1)

  it('slices the requested page and reports the range', () => {
    const p = paginate(items, 1, 8)
    expect(p.items).toHaveLength(8)
    expect(p).toMatchObject({ page: 1, pageCount: 2, from: 1, to: 8, total: 11 })
  })

  it('handles a short final page', () => {
    const p = paginate(items, 2, 8)
    expect(p.items).toEqual([9, 10, 11])
    expect(p).toMatchObject({ from: 9, to: 11 })
  })

  it('clamps an out-of-range page', () => {
    expect(paginate(items, 99, 8).page).toBe(2)
    expect(paginate(items, 0, 8).page).toBe(1)
  })

  it('reports an empty range for no results', () => {
    expect(paginate([], 1, 8)).toMatchObject({ from: 0, to: 0, total: 0, pageCount: 1 })
  })
})

describe('advanced filters', () => {
  it('is inert by default', () => {
    expect(applyAdvancedFilters(results, NONE, availability)).toHaveLength(results.length)
    expect(activeFilterCount(NONE, YEARS)).toBe(0)
  })

  it('narrows by publication year', () => {
    const recent = applyAdvancedFilters(results, { ...NONE, yearFrom: 2022 }, availability)
    expect(recent.every((b) => b.year >= 2022)).toBe(true)
    expect(recent.map((b) => b.id)).not.toContain('pattern-recognition') // 2006
  })

  it('narrows by language', () => {
    const vi = applyAdvancedFilters(results, { ...NONE, languages: ['vi'] }, availability)
    expect(vi.map((b) => b.id)).toEqual(['tia-sang-ai'])
  })

  it('narrows by stock state', () => {
    const out = applyAdvancedFilters(results, { ...NONE, stock: ['out'] }, availability)
    expect(out.every((b) => copies(b.id) === 0)).toBe(true)
    expect(out.length).toBeGreaterThan(0)
  })

  it('treats an empty facet as no restriction rather than excluding everything', () => {
    expect(applyAdvancedFilters(results, { ...NONE, languages: [], stock: [] }, availability)).toHaveLength(
      results.length,
    )
  })

  it('counts each narrowed facet for the button badge', () => {
    expect(activeFilterCount({ ...NONE, languages: ['vi'] }, YEARS)).toBe(1)
    expect(activeFilterCount({ ...NONE, languages: ['vi'], stock: ['out'] }, YEARS)).toBe(2)
    expect(
      activeFilterCount({ ...NONE, yearFrom: 2020, languages: ['vi'], stock: ['out'] }, YEARS),
    ).toBe(3)
  })
})
