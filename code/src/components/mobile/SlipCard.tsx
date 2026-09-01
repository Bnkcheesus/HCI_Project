// One loan slip — Figma Phone-PhieuMuon (49:122). The frame settles the shape: borrow
// date and due date at the top, then a row per book with cover, title, author, ISBN and a
// status word. The frame only ever draws a single-book slip; the kiosk lends up to
// MAX_BOOKS_PER_LOAN at once, and Pain 4 is about "nhiều đầu sách cùng lúc", so the same
// card renders however many went out together.
import { formatDate } from '@/lib/borrow'
import { loanStatus, wasReturnedLate } from '@/lib/loans'
import type { Book } from '@/shared/types'
import type { AccountSlip, AccountSlipBook } from '@/lib/accountSlips'
import { DueBadge } from './DueBadge'

interface SlipCardProps {
  slip: AccountSlip
  /**
   * The catalogue records for the books on this slip, keyed by id.
   *
   * Handed down rather than looked up here. A slip holds book *ids*, and this component
   * sits at the bottom of a list — fetching from inside it would mean one request per
   * book per card. The page fetches the whole set once and passes it through.
   */
  booksById: Record<string, Book>
}

export function SlipCard({ slip, booksById }: SlipCardProps) {
  const stillOut = slip.books.some((b) => b.returnedAt === null)

  return (
    <article
      data-kiosk-surface
      className="flex min-w-0 flex-col gap-3 rounded-[8px] border border-[var(--rule)] bg-card p-4 shadow-[var(--card-shadow)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1" style={{ fontSize: 'var(--text-meta)' }}>
          <dt className="font-heading font-bold text-foreground">Ngày mượn</dt>
          <dd className="tabular-nums text-muted-foreground">{formatDate(slip.borrowedAt)}</dd>
          <dt className="font-heading font-bold text-foreground">Hạn trả</dt>
          <dd className="tabular-nums text-muted-foreground">{formatDate(slip.dueAt)}</dd>
        </dl>

        {/* The date alone makes the reader do the arithmetic; Pain Reliever 4 promises the
            app reminds them. Only while something is still out — a countdown on a slip
            that came back months ago is noise. */}
        {stillOut && <DueBadge dueAt={slip.dueAt} />}
      </header>

      <ul className="flex flex-col gap-3 border-t border-dashed border-[var(--rule)] pt-3">
        {slip.books.map((book) => (
          <SlipBookRow
            key={book.bookId}
            slip={slip}
            book={book}
            record={booksById[book.bookId]}
          />
        ))}
      </ul>

      {/* Every slip carries its number, whichever source it came from. Showing it on some
          cards and not others made the list look broken, and the cause was a gap in the
          data model rather than anything the reader did — see LoanRecord.slipId. */}
      <p
        className="border-t border-dashed border-[var(--rule)] pt-2 tabular-nums text-muted-foreground"
        style={{ fontSize: 'var(--text-eyebrow)' }}
      >
        Phiếu #{slip.id}
      </p>
    </article>
  )
}

function SlipBookRow({
  slip,
  book,
  record,
}: {
  slip: AccountSlip
  book: AccountSlipBook
  record: Book | undefined
}) {
  // Still loading, or a slip naming a book the catalogue no longer carries. Either way
  // there is no row worth drawing.
  if (!record) return null

  // A book's due date is the slip's; only its return date is its own.
  const loan = { dueAt: slip.dueAt, returnedAt: book.returnedAt }

  return (
    <li className="flex min-w-0 items-start gap-3">
      <span className="h-16 w-12 shrink-0 overflow-hidden rounded-[6px] border border-[var(--rule)] bg-secondary">
        {record.coverUrl && <img src={record.coverUrl} alt="" className="size-full object-cover" />}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          // font-semibold, line-clamp-2, leading-snug: exactly how ResultCard sets a book
          // title on the kiosk. A book should not change weight because the reader picked
          // up their phone.
          className="line-clamp-2 font-heading font-semibold leading-snug text-foreground"
          style={{ fontSize: 'var(--text-body)' }}
        >
          {record.title}
        </span>
        {/* Wraps rather than truncates: a phone is narrow enough that one line cuts the
            ISBN to "978…", and half an ISBN is no use to anyone. */}
        <span className="line-clamp-2 text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
          {record.author} • ISBN: {record.isbn}
        </span>
        <StatusText status={loanStatus(loan)} late={wasReturnedLate(loan)} />
      </span>
    </li>
  )
}

/**
 * The status word from the Figma frame. Colour repeats what the word already says rather
 * than replacing it — the persona has poor eyesight, and WCAG rules out colour as the only
 * carrier of meaning in any case.
 */
function StatusText({ status, late }: { status: ReturnType<typeof loanStatus>; late: boolean }) {
  const { label, tone } =
    status === 'returned'
      ? late
        ? { label: 'Đã trả trễ', tone: 'text-[var(--ink-soft)]' }
        : { label: 'Đã trả', tone: 'text-[var(--live-ink)]' }
      : status === 'overdue'
        ? { label: 'Quá hạn', tone: 'text-[var(--destructive)]' }
        : { label: 'Đang mượn', tone: 'text-[var(--navy)]' }

  return (
    <span
      className={`font-semibold ${tone}`}
      style={{ fontSize: 'var(--text-meta)' }}
    >
      {label}
    </span>
  )
}
