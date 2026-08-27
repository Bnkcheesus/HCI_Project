import { ChevronRight } from 'lucide-react'
import { AvailabilityChip } from '@/components/kiosk/AvailabilityChip'
import { cn } from '@/lib/utils'
import type { Book } from '@/mocks'

/**
 * Compact book row in the AI chat side panel — Figma BookCard1/BookCard2 in
 * kiosk-ai-chat (5:779): cover thumbnail, title, author, shelf chip.
 *
 * The availability chip is an addition to the prototype: the whole point of asking the
 * assistant "sách nào còn trên kệ" is knowing before walking there (Pain Reliever 2 /
 * Gain Creator 4), so the answer has to survive on the card, not just in the sentence.
 */

const SPINE_COLOR: Record<Book['spine'], string> = {
  1: 'var(--spine-1)',
  2: 'var(--spine-2)',
  3: 'var(--spine-3)',
  4: 'var(--spine-4)',
}

interface SuggestedBookRowProps {
  book: Book
  onSelect: (bookId: string) => void
}

export function SuggestedBookRow({ book, onSelect }: SuggestedBookRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(book.id)}
      className={cn(
        'flex w-full items-center gap-4 rounded-[8px] border border-[var(--rule)] bg-card p-3 text-left',
        'min-h-[var(--touch-min)] transition-colors hover:border-primary hover:bg-secondary',
      )}
    >
      {book.coverUrl ? (
        <img
          src={book.coverUrl}
          alt=""
          className="h-16 w-12 shrink-0 rounded-[6px] object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="h-16 w-12 shrink-0 rounded-[6px]"
          style={{ backgroundColor: SPINE_COLOR[book.spine] }}
        />
      )}

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className="truncate font-heading font-bold text-foreground"
          style={{ fontSize: 'var(--text-body)' }}
        >
          {book.title}
        </span>
        <span
          className="truncate text-muted-foreground"
          style={{ fontSize: 'var(--text-meta)' }}
        >
          {book.author}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-[6px] bg-secondary px-3 py-1 font-semibold text-foreground"
            style={{ fontSize: 'var(--text-eyebrow)' }}
          >
            Kệ {book.shelfCode} · Tầng {book.floor}
          </span>
          <AvailabilityChip bookId={book.id} />
        </span>
      </span>

      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )
}
