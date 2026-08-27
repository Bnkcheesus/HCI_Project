import type { Book } from '@/mocks'
import { AvailabilityChip } from './AvailabilityChip'

// A suggested book on the kiosk home screen — Gain Creator 1 (bộ gợi ý sách).
// From the BookCard frames in Figma (10:4 group). The left spine bar is the editorial
// motif carried across the design; it uses the book's subject-derived spine color.

const SPINE_VAR: Record<Book['spine'], string> = {
  1: 'var(--spine-1)',
  2: 'var(--spine-2)',
  3: 'var(--spine-3)',
  4: 'var(--spine-4)',
}

interface BookCardProps {
  book: Book
  onSelect: (bookId: string) => void
}

export function BookCard({ book, onSelect }: BookCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(book.id)}
      data-kiosk-surface
      className="group flex flex-col overflow-hidden rounded-[8px] border border-[var(--rule)] bg-card text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--lift-2)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
        {/* Spine motif */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 z-10 w-1.5"
          style={{ backgroundColor: SPINE_VAR[book.spine] }}
        />
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span
            className="grid size-full place-items-center font-heading font-bold text-white"
            style={{ backgroundColor: SPINE_VAR[book.spine], fontSize: 'var(--text-title)' }}
          >
            {book.title}
          </span>
        )}

        <AvailabilityChip bookId={book.id} className="absolute right-3 top-3 z-10 shadow-sm" />
      </div>

      <div className="flex flex-col gap-1.5 px-5 py-4">
        <p
          className="font-heading font-semibold leading-snug text-foreground"
          style={{ fontSize: 'var(--text-title)' }}
        >
          {book.title}
        </p>
        <p className="text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
          {book.author}
        </p>
      </div>
    </button>
  )
}
