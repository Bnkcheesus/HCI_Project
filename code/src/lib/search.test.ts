import { describe, expect, it } from 'vitest'
import {
  activeFilterCount,
  applyAdvancedFilters,
  copiesAvailable,
  DEFAULT_FILTERS,
  countByType,
  filterByType,
  paginate,
  searchCatalog,
  sortResults,
} from './search'

describe('searchCatalog', () => {
  it('matches on subject as well as title', () => {
    const ids = searchCatalog('machine learning').map((b) => b.id)
    expect(ids).toContain('statistical-learning')
    expect(ids).toContain('pattern-recognition')
  })

  it('matches a Vietnamese query typed without tones', () => {
    expect(searchCatalog('giai tich').map((b) => b.id)).toContain('giai-tich-1')
  })

  it('matches on author', () => {
    expect(searchCatalog('Géron').map((b) => b.id)).toEqual(['hands-on-ml'])
  })

  it('returns nothing for a blank query', () => {
    expect(searchCatalog('   ')).toEqual([])
  })
})

describe('filterByType and countByType', () => {
  const results = searchCatalog('machine learning')

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
    const sorted = sortResults(searchCatalog('machine learning'), 'available')
    const firstOutIndex = sorted.findIndex((b) => copiesAvailable(b.id) === 0)
    const lastInStockIndex = sorted.reduce(
      (acc, b, i) => (copiesAvailable(b.id) > 0 ? i : acc),
      -1,
    )
    expect(lastInStockIndex).toBeLessThan(firstOutIndex)
  })

  it('sorts by title', () => {
    const titles = sortResults(searchCatalog('machine learning'), 'title').map((b) => b.title)
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'vi')))
  })

  it('leaves order untouched for relevance', () => {
    const results = searchCatalog('machine learning')
    expect(sortResults(results, 'relevance')).toEqual(results)
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
  const results = searchCatalog('machine learning')

  it('is inert by default', () => {
    expect(applyAdvancedFilters(results, DEFAULT_FILTERS)).toHaveLength(results.length)
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0)
  })

  it('narrows by publication year', () => {
    const recent = applyAdvancedFilters(results, { ...DEFAULT_FILTERS, yearFrom: 2022 })
    expect(recent.every((b) => b.year >= 2022)).toBe(true)
    expect(recent.map((b) => b.id)).not.toContain('pattern-recognition') // 2006
  })

  it('narrows by language', () => {
    const vi = applyAdvancedFilters(results, { ...DEFAULT_FILTERS, languages: ['vi'] })
    expect(vi.map((b) => b.id)).toEqual(['tia-sang-ai'])
  })

  it('narrows by stock state', () => {
    const out = applyAdvancedFilters(results, { ...DEFAULT_FILTERS, stock: ['out'] })
    expect(out.every((b) => copiesAvailable(b.id) === 0)).toBe(true)
    expect(out.length).toBeGreaterThan(0)
  })

  it('treats an empty facet as no restriction rather than excluding everything', () => {
    expect(applyAdvancedFilters(results, { ...DEFAULT_FILTERS, languages: [], stock: [] })).toHaveLength(
      results.length,
    )
  })

  it('counts each narrowed facet for the button badge', () => {
    expect(activeFilterCount({ ...DEFAULT_FILTERS, languages: ['vi'] })).toBe(1)
    expect(activeFilterCount({ ...DEFAULT_FILTERS, languages: ['vi'], stock: ['out'] })).toBe(2)
    expect(
      activeFilterCount({ ...DEFAULT_FILTERS, yearFrom: 2020, languages: ['vi'], stock: ['out'] }),
    ).toBe(3)
  })
})
