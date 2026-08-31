// Implements Job 2 / Gain 2 / Gain Creator 2 / Product-Service 2 — the shelf directions
// carried onto the phone, the destination of the QR the kiosk paints on every book page.
// Figma frame: Phone-Location (41:630).
import { MapPin, Navigation, QrCode } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { MobileFrame } from '@/components/mobile/MobileFrame'
import { AvailabilityChip } from '@/components/kiosk/AvailabilityChip'
import { ShelfRouteMap } from '@/components/kiosk/ShelfRouteMap'
import { books, shelfLocations, type Book } from '@/mocks'

/**
 * Three things the Figma frame does not have, each added for a reason in the value
 * proposition rather than for completeness:
 *
 *  - The frame's map is a static isometric drawing of the whole floor: the same picture
 *    whichever book you are looking for. Gain 2 promises the map "hiển thị chính xác vị
 *    trí kệ sách", so this uses the kiosk's own `ShelfRouteMap`, which draws the route to
 *    the aisle the book actually sits in — and shows the reader the same map they were
 *    just looking at on the kiosk.
 *  - The frame never names the book. A reader arrives here by scanning, walks off between
 *    two shelf runs, and has nothing on screen saying what they came for.
 *  - The frame has no availability. Pain 2 is "phải đến tận kệ mới biết sách đã hết", and
 *    this screen is the last moment before that walk — the one place where saying so
 *    still saves the trip.
 */
export function LocationPage() {
  const [params] = useSearchParams()
  const bookId = params.get('book')?.trim()
  const book = bookId ? books.find((b) => b.id === bookId) : undefined

  if (!book) {
    return (
      <MobileFrame title="Bản đồ chỉ dẫn" backTo="/mobile">
        <EmptyState missing={!bookId} />
      </MobileFrame>
    )
  }

  const location = shelfLocations[book.shelfCode]

  return (
    <MobileFrame title="Bản đồ chỉ dẫn" backTo="/mobile">
      <BookHeader book={book} />

      {location ? (
        <>
          {/*
            Taller than the kiosk's 100/38, which is built for a 1280px panel and collapses
            to a 130px letterbox in a 343px phone column. Not as tall as it would like to be
            either: at 100/62 the map pushed the written directions off the bottom of a
            667px screen, and Pain Reliever 5 names a picture-only map as the pain itself —
            so when the two compete for height, the words win.
          */}
          <ShelfRouteMap location={location} className="aspect-[100/45]" />

          {/* The route in words. Pain Reliever 5 names a picture-only map as the pain, so
              the text is the point, not a caption under the drawing. */}
          <div
            data-kiosk-surface
            className="flex items-start gap-3 rounded-[8px] border border-[var(--rule)] bg-card p-4 shadow-[var(--card-shadow)]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-primary text-primary-foreground">
              <Navigation className="size-5" aria-hidden />
            </span>
            <ol className="flex min-w-0 flex-col gap-1">
              {location.directions.map((step, i) => (
                <li
                  key={step}
                  className={
                    i === 0 ? 'font-heading font-bold text-foreground' : 'text-muted-foreground'
                  }
                  style={{ fontSize: i === 0 ? 'var(--text-body)' : 'var(--text-meta)' }}
                >
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : (
        <p
          data-kiosk-surface
          className="rounded-[8px] border border-[var(--rule)] bg-card p-4 text-muted-foreground shadow-[var(--card-shadow)]"
          style={{ fontSize: 'var(--text-body)' }}
        >
          Chưa có chỉ dẫn đường đi tới kệ {book.shelfCode}. Hỏi thủ thư ở quầy tầng{' '}
          {book.floor} để được chỉ giúp.
        </p>
      )}
    </MobileFrame>
  )
}

/** Which book this route is for — cover included, because that is what identifies it at the shelf. */
function BookHeader({ book }: { book: Book }) {
  return (
    <div
      data-kiosk-surface
      className="flex min-w-0 items-start gap-3 rounded-[8px] border border-[var(--rule)] bg-card p-4 shadow-[var(--card-shadow)]"
    >
      <span className="h-20 w-14 shrink-0 overflow-hidden rounded-[6px] border border-[var(--rule)] bg-secondary">
        {book.coverUrl && <img src={book.coverUrl} alt="" className="size-full object-cover" />}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className="line-clamp-2 font-heading font-semibold leading-snug text-foreground"
          style={{ fontSize: 'var(--text-body)' }}
        >
          {book.title}
        </p>
        <p className="truncate text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
          {book.author}
        </p>

        {/*
          Shelf and floor as a line of text with a pin, exactly as ResultCard writes it on
          the kiosk — not as a second green chip. Two chips in the same green sat side by
          side here saying entirely different things: one is where the book is, the other
          is whether it is there at all. Same colour, same shape, opposite meanings.
        */}
        <p
          className="flex items-center gap-2 font-medium"
          style={{ fontSize: 'var(--text-meta)' }}
        >
          <MapPin className="size-4 shrink-0 text-[var(--live-ink)]" aria-hidden />
          <span className="text-foreground">
            Kệ {book.shelfCode} · Tầng {book.floor}
          </span>
        </p>

        <AvailabilityChip bookId={book.id} className="self-start" />
      </div>
    </div>
  )
}

/**
 * A missing or unknown `?book=` is a dead end unless it offers a way on. The reader got
 * here from a code that did not resolve, so the way on is back to the scanner.
 */
function EmptyState({ missing }: { missing: boolean }) {
  return (
    <div
      data-kiosk-surface
      className="flex flex-col items-start gap-3 rounded-[8px] border border-[var(--rule)] bg-card p-4 shadow-[var(--card-shadow)]"
    >
      <p className="text-foreground" style={{ fontSize: 'var(--text-body)' }}>
        {missing
          ? 'Chưa chọn cuốn sách nào để chỉ đường.'
          : 'Không tìm thấy tài liệu ứng với mã vừa quét.'}
      </p>
      <p className="text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
        Quét mã QR hiện trên màn hình kiosk khi đang xem một cuốn sách.
      </p>

      <Link
        to="/mobile/qr"
        className="inline-flex min-h-[var(--touch-min)] items-center gap-2 rounded-[6px] bg-primary px-5 font-heading font-bold text-primary-foreground shadow-[var(--btn-shadow)]"
        style={{ fontSize: 'var(--text-tab)' }}
      >
        <QrCode className="size-5 shrink-0" aria-hidden />
        Quét mã QR
      </Link>
    </div>
  )
}
