import { BookOpen, MapPin, Newspaper, RotateCcw, ScrollText } from 'lucide-react'
import { availability, DOCUMENT_TYPE_LABEL, type Book } from '@/mocks'
import { AvailabilityChip } from './AvailabilityChip'

/**
 * One search result — Pain Reliever 2 / Job 2.
 * Carries the two facts that decide whether the persona walks to the shelf: whether a
 * copy is actually there, and exactly where "there" is. When nothing is on the shelf it
 * shows the return date instead, so the trip is never wasted.
 */

const SPINE_VAR: Record<Book['spine'], string> = {
  1: 'var(--spine-1)',
  2: 'var(--spine-2)',
  3: 'var(--spine-3)',
  4: 'var(--spine-4)',
}

const TYPE_ICON: Record<Book['type'], typeof BookOpen> = {
  book: BookOpen,
  journal: ScrollText,
  magazine: Newspaper,
}

interface ResultCardProps {
  book: Book
  onSelect: (bookId: string) => void
}

export function ResultCard({ book, onSelect }: ResultCardProps) {
  const record = availability[book.id]
  const isAvailable = (record?.copiesAvailable ?? 0) > 0
  const TypeIcon = TYPE_ICON[book.type]

  /*
   * w-full + min-w-0 here are load-bearing, not decoration. A <button> sizes to
   * fit-content even as a block-level flex container, so without w-full it grows to its
   * widest descendant — and the author line is `truncate`, i.e. nowrap, i.e. as wide as
   * the full credit. Real books carry three-author credits ("Marc Peter Deisenroth,
   * A. Aldo Faisal, Cheng Soon Ong"), which pushed this card 122px past its grid track
   * and the fourth column off the side of a 1280px kiosk screen.
   */
  return (
    <button
      type="button"
      onClick={() => onSelect(book.id)}
      data-kiosk-surface
      className="group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[8px] border border-[var(--rule)] bg-card text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--lift-2)]"
    >
      {/*
        The cover is the card's shock absorber. aspect-[16/9] sets its height wherever the
        card sizes itself (search results, search suggestions); shrink and grow let it
        trade that height back where the card is pinned to a row (the home screen, which
        must not scroll); min-h-20 stops it collapsing to a sliver.

        w-full is not redundant next to a stretched flex item: with an aspect ratio and a
        height handed to it by flex-grow, an engine is free to derive the *width* from the
        ratio instead, which blows the cover out past the card. Pinning the width to 100%
        leaves the ratio only the height to set.
      */}
      <div className="relative aspect-[16/9] w-full min-h-20 shrink grow overflow-hidden bg-secondary">
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
          // No cover art: show what kind of document this is instead of repeating the
          // title, which already sits directly underneath.
          <span className="flex size-full flex-col items-center justify-center gap-2 bg-secondary">
            <TypeIcon
              className="size-8"
              style={{ color: SPINE_VAR[book.spine] }}
              aria-hidden
            />
            <span
              className="font-heading font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              style={{ fontSize: 'var(--text-eyebrow)' }}
            >
              {DOCUMENT_TYPE_LABEL[book.type]}
            </span>
          </span>
        )}
        <AvailabilityChip bookId={book.id} className="absolute right-3 top-3 z-10 shadow-sm" />
      </div>

      {/* shrink-0: the cover takes the slack in a stretched card, not this block — a taller
          white panel below a letterboxed cover reads as a layout accident. */}
      <div className="flex min-w-0 shrink-0 flex-col gap-1 px-4 py-3">
        <p
          className="line-clamp-2 font-heading font-semibold leading-snug text-foreground"
          style={{ fontSize: 'var(--text-body)' }}
        >
          {book.title}
        </p>
        <p className="truncate text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
          {book.author}
        </p>

        <p
          className="mt-auto flex items-center gap-2 pt-1.5 font-medium"
          style={{ fontSize: 'var(--text-meta)' }}
        >
          {isAvailable ? (
            <>
              <MapPin className="size-4 shrink-0 text-[var(--live-ink)]" aria-hidden />
              <span className="text-foreground">
                Kệ {book.shelfCode} · Tầng {book.floor}
              </span>
            </>
          ) : (
            <>
              <RotateCcw className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="text-muted-foreground">
                {record?.dueBack ? `Chờ trả: ${record.dueBack}` : 'Chưa có lịch trả'}
              </span>
            </>
          )}
        </p>
      </div>
    </button>
  )
}
