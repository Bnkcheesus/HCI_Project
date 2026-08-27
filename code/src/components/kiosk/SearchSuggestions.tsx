import { ChevronRight, SearchX } from 'lucide-react'
import type { Book } from '@/mocks'
import { searchCatalog } from '@/lib/search'
import { AvailabilityChip } from './AvailabilityChip'

/**
 * Live autocomplete under the search field — Job 1 / Pain Reliever 1 & 2.
 * Every row carries its availability, so the persona learns a book is gone while still
 * standing at the kiosk instead of after walking to the shelf.
 */

const SPINE_VAR: Record<Book['spine'], string> = {
  1: 'var(--spine-1)',
  2: 'var(--spine-2)',
  3: 'var(--spine-3)',
  4: 'var(--spine-4)',
}

interface SearchSuggestionsProps {
  query: string
  onSelect: (bookId: string) => void
}

export function SearchSuggestions({ query, onSelect }: SearchSuggestionsProps) {
  const results: Book[] = searchCatalog(query)

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <SearchX className="size-10 text-muted-foreground" aria-hidden />
        <p className="font-heading font-semibold text-foreground" style={{ fontSize: 'var(--text-title)' }}>
          Không tìm thấy sách nào khớp với “{query}”
        </p>
        <p className="text-muted-foreground" style={{ fontSize: 'var(--text-body)' }}>
          Thử bớt từ khoá, hoặc hỏi trợ lý AI để được gợi ý.
        </p>
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-4" aria-live="polite">
      <h2
        className="font-heading font-bold uppercase tracking-[0.18em] text-[var(--live-ink)]"
        style={{ fontSize: 'var(--text-eyebrow)' }}
      >
        {results.length} kết quả cho “{query}”
      </h2>

      <ul className="flex flex-col gap-3">
        {results.slice(0, 4).map((book) => (
          <li key={book.id}>
            <button
              type="button"
              onClick={() => onSelect(book.id)}
              data-kiosk-surface
              className="group flex w-full items-center gap-5 overflow-hidden rounded-[8px] border border-[var(--rule)] bg-card py-4 pr-5 text-left transition-colors hover:border-primary/50 hover:bg-secondary"
            >
              <span
                aria-hidden
                className="h-14 w-1.5 shrink-0 rounded-r"
                style={{ backgroundColor: SPINE_VAR[book.spine] }}
              />

              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span
                  className="truncate font-heading font-semibold text-foreground"
                  style={{ fontSize: 'var(--text-title)' }}
                >
                  {book.title}
                </span>
                <span className="truncate text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
                  {book.author} · {book.subject} · Kệ {book.shelfCode}
                </span>
              </span>

              <AvailabilityChip bookId={book.id} className="shrink-0" />
              <ChevronRight
                className="size-6 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
