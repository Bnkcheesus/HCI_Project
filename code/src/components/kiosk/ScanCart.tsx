import { BookMarked, X } from 'lucide-react'
import { MAX_BOOKS_PER_LOAN } from '@/lib/borrow'
import { cn } from '@/lib/utils'
import type { Book } from '@/shared/types'

/**
 * The books scanned into this checkout so far.
 *
 * The Figma flow held exactly one book, which contradicts both the value proposition
 * (Pain 4 — "nhiều đầu sách cùng lúc") and what the AI librarian tells readers ("mượn
 * tối đa 5 cuốn"). Scanning is also the step most likely to go wrong — grabbing the
 * wrong edition, double-scanning — so every row can be removed before anything is
 * committed.
 */

const SPINE_COLOR: Record<number, string> = {
  1: 'var(--spine-1)',
  2: 'var(--spine-2)',
  3: 'var(--spine-3)',
  4: 'var(--spine-4)',
}

interface ScanCartProps {
  bookIds: string[]
  /**
   * Catalogue records for the scanned books, keyed by id — fetched by the step that owns
   * the cart. A row whose record has not arrived yet simply does not draw, which is the
   * same thing the old lookup did for an id it could not find.
   */
  booksById: Record<string, Book>
  /** Omitted on the confirmation step, where the list is a summary, not an editor. */
  onRemove?: (bookId: string) => void
}

export function ScanCart({ bookIds, booksById, onRemove }: ScanCartProps) {
  return (
    // h-full, not just min-h-0: the page gives this a fixed box, and without it the
    // section grows to its natural height, spills past the box's overflow-hidden and the
    // list below simply never becomes scrollable.
    <section className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 items-baseline justify-between gap-3">
        <h2
          className="font-heading font-bold uppercase tracking-[0.18em] text-[var(--live-ink)]"
          style={{ fontSize: 'var(--text-eyebrow)' }}
        >
          Phiếu mượn của bạn
        </h2>
        <p
          className="font-heading font-bold tabular-nums text-muted-foreground"
          style={{ fontSize: 'var(--text-meta)' }}
        >
          {bookIds.length}/{MAX_BOOKS_PER_LOAN} cuốn
        </p>
      </div>

      {bookIds.length === 0 ? (
        <p
          className="flex items-center gap-2 rounded-[8px] border border-dashed border-[var(--rule)] px-5 py-4 text-muted-foreground"
          style={{ fontSize: 'var(--text-meta)' }}
        >
          <BookMarked className="size-5 shrink-0" aria-hidden />
          Chưa có cuốn nào. Hãy quét sách hoặc nhập mã ISBN.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
          {bookIds.map((id) => {
            const book = booksById[id]
            if (!book) return null

            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-[8px] border border-[var(--rule)] bg-card p-3"
              >
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt="" className="h-14 w-10 shrink-0 rounded-[6px] object-cover" />
                ) : (
                  <span
                    aria-hidden
                    className="h-14 w-10 shrink-0 rounded-[6px]"
                    style={{ backgroundColor: SPINE_COLOR[book.spine] }}
                  />
                )}

                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className="truncate font-heading font-bold text-foreground"
                    style={{ fontSize: 'var(--text-meta)' }}
                  >
                    {book.title}
                  </span>
                  <span
                    className="truncate text-muted-foreground"
                    style={{ fontSize: 'var(--text-eyebrow)' }}
                  >
                    ISBN {book.isbn}
                  </span>
                </span>

                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(id)}
                    aria-label={`Bỏ "${book.title}" khỏi phiếu mượn`}
                    title="Bỏ khỏi phiếu mượn"
                    className={cn(
                      'grid size-[var(--touch-min)] shrink-0 place-items-center rounded-full',
                      'border-2 border-[var(--rule)] text-muted-foreground transition-colors',
                      'hover:border-[var(--destructive)] hover:text-[var(--destructive)]',
                    )}
                  >
                    <X className="size-5" aria-hidden />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
