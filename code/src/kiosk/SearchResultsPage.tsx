// Implements Pain Reliever 2 / Gain Creator 4 — full result set with real-time
// availability, so the persona never walks to an empty shelf.
// Figma frames: kiosk-search-results (5:868) and its filtered variant (41:489).
import { SearchX, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLibraryInfo, useSearchBooks } from '@/api/queries'
import { AdvancedFilterPanel } from '@/components/kiosk/AdvancedFilterPanel'
import { KioskFooter } from '@/components/kiosk/KioskFooter'
import { KioskHeader } from '@/components/kiosk/KioskHeader'
import { ModeTabs, type KioskMode } from '@/components/kiosk/ModeTabs'
import { Pagination } from '@/components/kiosk/Pagination'
import { ResultCard } from '@/components/kiosk/ResultCard'
import { ResultToolbar } from '@/components/kiosk/ResultToolbar'
import {
  activeFilterCount,
  applyAdvancedFilters,
  countByType,
  defaultFilters,
  filterByType,
  paginate,
  sortResults,
  type AdvancedFilters,
  type SortMode,
  type TypeFilter,
} from '@/lib/search'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'

export function SearchResultsPage() {
  const navigate = useNavigate()
  const searchQuery = useBorrowSessionStore((s) => s.searchQuery)
  const setSearchQuery = useBorrowSessionStore((s) => s.setSearchQuery)
  const selectBook = useBorrowSessionStore((s) => s.selectBook)

  const [type, setType] = useState<TypeFilter>('all')
  const [sort, setSort] = useState<SortMode>('relevance')
  const [page, setPage] = useState(1)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  /*
   * The server finds; the reader narrows.
   *
   * Only the text match crosses the network. Type chips, sorting, the year range and the
   * stock facet all run here over the result set already in hand — they are pure
   * functions with their own tests, the catalogue is 116 titles, and a round trip per
   * chip tap would make the filters feel slower than the search that produced them.
   */
  const { data, isPending } = useSearchBooks(searchQuery)
  const { data: library } = useLibraryInfo()

  const matches = useMemo(() => data?.books ?? [], [data])
  const availability = useMemo(() => data?.availability ?? {}, [data])

  // Until the bounds arrive there is nothing to filter anyway; the placeholder keeps the
  // slider from rendering an inverted range on the first paint.
  const years = useMemo(
    () => ({ min: library?.yearMin ?? 0, max: library?.yearMax ?? 0 }),
    [library],
  )

  const [rawFilters, setFilters] = useState<AdvancedFilters | null>(null)
  // Defaults depend on data that arrives asynchronously, so "untouched" is represented as
  // null and resolved against the bounds — not seeded once with numbers that were wrong.
  const filters = rawFilters ?? defaultFilters(years)

  // Advanced filters bite before the type chips, so their counts reflect what is
  // actually reachable rather than promising results the filters have already excluded.
  const narrowed = useMemo(
    () => applyAdvancedFilters(matches, filters, availability),
    [matches, filters, availability],
  )
  const counts = useMemo(() => countByType(narrowed), [narrowed])
  const visible = useMemo(
    () => sortResults(filterByType(narrowed, type), sort, availability),
    [narrowed, type, sort, availability],
  )
  const current = paginate(visible, page)

  function changeFilters(next: AdvancedFilters) {
    setFilters(next)
    setPage(1)
  }

  function openSearch() {
    navigate('/kiosk/search', { viewTransition: true })
  }

  function handleSelectBook(bookId: string) {
    selectBook(bookId)
    navigate(`/kiosk/books/${bookId}`, { state: { from: '/kiosk/search/results' } })
  }

  function changeType(next: TypeFilter) {
    setType(next)
    setPage(1)
  }

  function changeSort(next: SortMode) {
    setSort(next)
    setPage(1)
  }

  return (
    // Only the results grid scrolls. The toolbar stays put so the advanced-filter
    // popover is never clipped by the scroll container, and the filters remain reachable
    // while the user is partway down a long result set.
    <div className="flex h-screen flex-col overflow-hidden">
      <KioskHeader statusLabel="Kết quả tìm kiếm" />

      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-10 pt-6">
        <ModeTabs
          value="search"
          onChange={(mode: KioskMode) => navigate(mode === 'search' ? '/kiosk/search' : '/kiosk/scan')}
        />

        {/* Tapping the query hands back to the search screen, morphing the bar up. */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openSearch}
            data-kiosk-surface
            className="flex flex-1 items-center gap-4 rounded-[8px] border border-[var(--rule)] bg-card shadow-[var(--btn-shadow)] px-6 py-4 text-left transition-colors hover:border-primary/50"
          >
            <span
              className="font-heading font-semibold text-foreground"
              style={{ fontSize: 'var(--text-field)' }}
            >
              {searchQuery || 'Nhập từ khoá để tìm sách'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              openSearch()
            }}
            aria-label="Xoá từ khoá và tìm lại"
            className="grid size-[var(--touch-min)] shrink-0 place-items-center rounded-[8px] border border-[var(--rule)] bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {matches.length > 0 && (
          <ResultToolbar
            counts={counts}
            type={type}
            onTypeChange={changeType}
            sort={sort}
            onSortChange={changeSort}
            advancedOpen={advancedOpen}
            advancedCount={activeFilterCount(filters, years)}
            onToggleAdvanced={() => setAdvancedOpen((open) => !open)}
            advancedPanel={
              advancedOpen && (
                <AdvancedFilterPanel
                  filters={filters}
                  years={years}
                  onChange={changeFilters}
                  onClose={() => setAdvancedOpen(false)}
                />
              )
            }
          />
        )}
      </div>

      <div className="relative flex flex-1 overflow-hidden">
      {/* Full-width scroll container so the scrollbar rides the screen's right edge; the
          max-width and centring live on the track inside it. See HomePage for the why. */}
        <main className="w-full overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-10 py-4">
          {isPending ? (
            /* No skeleton grid: the reader arrives here from a screen they just typed on,
               and a flash of eight grey cards followed by real ones reads as the results
               changing under them. A quiet moment is calmer and, on a local network,
               shorter than the animation would be. */
            <p className="py-16 text-center text-muted-foreground" style={{ fontSize: 'var(--text-body)' }}>
              Đang tìm sách…
            </p>
          ) : matches.length === 0 ? (
            <EmptyState query={searchQuery} onRetry={openSearch} />
          ) : current.items.length === 0 ? (
            <NoMatchForFilters onReset={() => changeFilters(defaultFilters(years))} />
          ) : (
            <section className="flex flex-col gap-4">
              <h1
                className="font-heading font-bold uppercase tracking-[0.18em] text-muted-foreground"
                style={{ fontSize: 'var(--text-eyebrow)' }}
              >
                Danh sách sách giống yêu cầu
              </h1>

              <ul className="grid grid-cols-2 gap-5 lg:grid-cols-4">
                {current.items.map((book) => (
                  <li key={book.id} className="min-w-0">
                    <ResultCard
                      book={book}
                      availability={availability[book.id]}
                      onSelect={handleSelectBook}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
          </div>
        </main>

        {/* Signals that the list continues past the fold. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--page)] to-transparent"
        />
      </div>

      {matches.length > 0 && current.items.length > 0 && (
        <div className="mx-auto w-full max-w-[1280px] px-10 pb-4">
          <Pagination page={current} onChange={setPage} />
        </div>
      )}

      <KioskFooter />
    </div>
  )
}

function NoMatchForFilters({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <SearchX className="size-12 text-muted-foreground" aria-hidden />
      <p
        className="font-heading font-semibold text-foreground"
        style={{ fontSize: 'var(--text-title)' }}
      >
        Bộ lọc hiện tại không còn tài liệu nào
      </p>
      <button
        type="button"
        onClick={onReset}
        className="min-h-[var(--touch-min)] rounded-[6px] bg-primary px-8 font-heading font-bold text-primary-foreground"
        style={{ fontSize: 'var(--text-body)' }}
      >
        Đặt lại bộ lọc
      </button>
    </div>
  )
}

function EmptyState({ query, onRetry }: { query: string; onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <SearchX className="size-12 text-muted-foreground" aria-hidden />
      <p
        className="font-heading font-semibold text-foreground"
        style={{ fontSize: 'var(--text-section)' }}
      >
        {query ? `Không tìm thấy tài liệu nào khớp với “${query}”` : 'Chưa có từ khoá tìm kiếm'}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[var(--touch-min)] rounded-[6px] bg-primary px-8 font-heading font-bold text-primary-foreground"
        style={{ fontSize: 'var(--text-body)' }}
      >
        Tìm lại
      </button>
    </div>
  )
}
