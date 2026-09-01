// Implements Job 2 / Pain Reliever 2 / Product-Service 2 — book detail with shelf
// location, the hand-off point to the self-checkout flow.
// Figma frame: kiosk-book-info (19:243).
import { ArrowLeft, Navigation, ScanLine, ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AvailabilityChip } from '@/components/kiosk/AvailabilityChip'
import { CoverLightbox } from '@/components/kiosk/CoverLightbox'
import { KioskFooter } from '@/components/kiosk/KioskFooter'
import { KioskHeader } from '@/components/kiosk/KioskHeader'
import { LocationQr } from '@/components/kiosk/LocationQr'
import { ShelfRouteMap } from '@/components/kiosk/ShelfRouteMap'
import { useBookDetail } from '@/api/queries'
import { DOCUMENT_TYPE_LABEL, LANGUAGE_LABEL } from '@/shared/types'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'

export function BookInfoPage() {
  const navigate = useNavigate()
  const { bookId } = useParams()
  const selectBook = useBorrowSessionStore((s) => s.selectBook)
  const searchQuery = useBorrowSessionStore((s) => s.searchQuery)
  // Named routerLocation because `location` below is the book's shelf location.
  // Both hooks must run before the not-found early return.
  const routerLocation = useLocation()
  // Before the not-found early return: hooks cannot be called conditionally.
  const [coverOpen, setCoverOpen] = useState(false)

  /*
   * One request for the book, its copy count and its route to the shelf.
   *
   * This is the screen where the reader decides whether to walk across the building, so
   * the three facts arrive together rather than filling in one at a time — a page that
   * settles in stages is a page they give up on halfway.
   */
  const { data, isPending } = useBookDetail(bookId)

  if (isPending) return <Loading />
  // `null` means the id names nothing in the catalogue — a stale link or a mistyped URL,
  // not a failure worth an error screen.
  if (!data) return <NotFound onBack={() => navigate('/kiosk/search/results')} />

  const { book, availability: stock, shelf: location } = data
  const isAvailable = (stock?.copiesAvailable ?? 0) > 0

  /**
   * Where "Quay về" goes, as a named route rather than navigate(-1).
   *
   * History is not a reliable "back" here: the checkout leaves entries behind it, so
   * stepping back one from this screen could land on the scan flow the reader just
   * escaped. Callers say where they came from; the fallback covers a cold link.
   */
  const cameFrom = (routerLocation.state as { from?: string } | null)?.from
  const backTarget = cameFrom ?? (searchQuery ? '/kiosk/search/results' : '/kiosk')

  function startBorrow() {
    selectBook(book.id)
    // `from` is where the checkout should return to (here); `fromOrigin` is where this
    // screen itself came from, so the way out still works after that return.
    navigate('/kiosk/scan', {
      state: { from: `/kiosk/books/${book.id}`, fromOrigin: cameFrom },
    })
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <KioskHeader statusLabel="Thông tin sách" />

      {/* Full-width scroll container so the scrollbar rides the screen's right edge; the
          max-width and centring live on the track inside it. See HomePage for the why. */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 px-10 py-6">
        {/* ---------------- Left: the book itself ---------------- */}
        <section className="flex flex-col gap-5">
          <h1
            className="font-heading font-bold uppercase tracking-[0.18em] text-muted-foreground"
            style={{ fontSize: 'var(--text-eyebrow)' }}
          >
            Thông tin sách
          </h1>

          <div className="flex gap-5">
            {book.coverUrl ? (
              /*
               * The cover opens enlarged — see CoverLightbox. A <button>, not an <img> with
               * a click handler: this is a control, and a reader on the keyboard has to be
               * able to reach it.
               *
               * A tappable image announces nothing on its own, so the magnifier badge is
               * the affordance. Without it the feature exists and nobody finds it.
               */
              <button
                type="button"
                onClick={() => setCoverOpen(true)}
                data-kiosk-surface
                aria-label={`Xem bìa sách ${book.title} phóng to`}
                className="group relative aspect-[3/4] w-40 shrink-0 overflow-hidden rounded-[8px] border border-[var(--rule)] bg-secondary transition-colors hover:border-primary"
              >
                <img src={book.coverUrl} alt="" className="size-full object-cover" />
                <span
                  aria-hidden
                  className="absolute bottom-2 right-2 grid size-10 place-items-center rounded-[6px] bg-[var(--ink)]/80 text-white shadow-[var(--lift-2)] transition-colors group-hover:bg-primary"
                >
                  <ZoomIn className="size-5" />
                </span>
              </button>
            ) : (
              <div
                data-kiosk-surface
                className="aspect-[3/4] w-40 shrink-0 overflow-hidden rounded-[8px] border border-[var(--rule)] bg-secondary"
              />
            )}

            <div className="flex min-w-0 flex-col gap-3">
              <AvailabilityChip availability={stock} className="self-start" />
              <h2
                className="font-heading font-bold leading-tight text-foreground"
                style={{ fontSize: 'var(--text-section)' }}
              >
                {book.title}
              </h2>
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-body)' }}>
                {book.author}
              </p>

              {/*
                Up here with the title rather than down in the metadata grid, because it is
                not a fact about the edition — it is the code the reader has to carry: step 1
                of the checkout asks them to key it in when a barcode will not scan, and the
                phone's QR screen falls back to the same digits. tabular-nums so a 13-digit
                run can be read off in groups.
              */}
              <p
                className="tabular-nums text-muted-foreground"
                style={{ fontSize: 'var(--text-meta)' }}
              >
                ISBN: <span className="font-semibold text-foreground">{book.isbn}</span>
              </p>
            </div>
          </div>

          {/* Metadata: lets the reader confirm this is the right edition before walking. */}
          <dl
            data-kiosk-surface
            className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-[8px] border border-[var(--rule)] bg-card p-5"
            style={{ fontSize: 'var(--text-meta)' }}
          >
            <Field label="Năm xuất bản" value={String(book.year)} />
            <Field label="Ngôn ngữ" value={LANGUAGE_LABEL[book.language]} />
            <Field label="Loại tài liệu" value={DOCUMENT_TYPE_LABEL[book.type]} />
            <Field label="Chủ đề" value={book.subject} />
            <Field
              label="Số bản"
              value={
                stock ? `${stock.copiesAvailable} còn / ${stock.copiesTotal} tổng` : 'Chưa có dữ liệu'
              }
            />
            <Field label="Vị trí" value={`Kệ ${book.shelfCode} · Tầng ${book.floor}`} />
          </dl>

          <div className="flex flex-col gap-2">
            <h3
              className="font-heading font-bold uppercase tracking-[0.14em] text-muted-foreground"
              style={{ fontSize: 'var(--text-eyebrow)' }}
            >
              Nội dung mô tả
            </h3>
            <p className="text-foreground" style={{ fontSize: 'var(--text-body)' }}>
              {book.description}
            </p>
          </div>
        </section>

        {/* ---------------- Right: how to get to it ---------------- */}
        <section className="flex flex-col gap-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
            <div className="flex flex-col gap-2">
              <h2
                className="font-heading font-bold text-foreground"
                style={{ fontSize: 'var(--text-title)' }}
              >
                Bản đồ chỉ dẫn 3D
              </h2>
              <img
                src="/maps/floor-3d.jpg"
                alt="Sơ đồ tổng quan không gian thư viện dạng 3D"
                className="max-h-56 w-full rounded-[8px] border border-[var(--rule)] bg-card object-contain"
              />
            </div>

            <LocationQr bookId={book.id} caption="Quét để mang chỉ dẫn theo điện thoại" />
          </div>

          {location ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    className="font-heading font-bold text-foreground"
                    style={{ fontSize: 'var(--text-title)' }}
                  >
                    Vị trí sách trên giá
                  </h2>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
                    {location.zone}
                  </p>
                </div>
                <span
                  className="rounded-[6px] bg-[var(--live-ink)] px-4 py-2 font-heading font-semibold text-white"
                  style={{ fontSize: 'var(--text-meta)' }}
                >
                  Kệ {location.shelfCode} • Tầng {location.floor}
                </span>
              </div>

              <ShelfRouteMap location={location} />

              {/* The route in words — the picture alone is not enough for this persona. */}
              <div
                data-kiosk-surface
                className="flex items-start gap-4 rounded-[8px] border border-[var(--rule)] bg-card p-5"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-[8px] bg-primary text-primary-foreground">
                  <Navigation className="size-5" aria-hidden />
                </span>
                <ol className="flex flex-col gap-1">
                  {location.directions.map((step, i) => (
                    <li
                      key={step}
                      className={i === 0 ? 'font-heading font-bold text-foreground' : 'text-muted-foreground'}
                      style={{ fontSize: i === 0 ? 'var(--text-body)' : 'var(--text-meta)' }}
                    >
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-body)' }}>
              Chưa có chỉ dẫn vị trí cho kệ {book.shelfCode}.
            </p>
          )}

        </section>
        </div>
      </main>

      {/* Pinned action bar: "Mượn sách" is the whole point of this screen, so it must
          never scroll out of reach. */}
      <div className="border-t border-[var(--rule)] bg-card/70 px-10 py-4">
        <div className="mx-auto flex max-w-[1280px] flex-wrap gap-4">
          <button
            type="button"
            onClick={() => navigate(backTarget)}
            className="inline-flex min-h-16 items-center justify-center gap-3 rounded-[6px] border border-[var(--rule)] bg-card shadow-[var(--btn-shadow)] px-10 font-heading font-bold text-foreground transition-colors hover:bg-secondary"
            style={{ fontSize: 'var(--text-tab)' }}
          >
            <ArrowLeft className="size-6" aria-hidden />
            Quay về
          </button>

          <button
            type="button"
            onClick={startBorrow}
            disabled={!isAvailable}
            className="inline-flex min-h-16 flex-1 items-center justify-center gap-3 rounded-[6px] bg-primary px-8 font-heading font-bold text-primary-foreground shadow-[var(--btn-shadow)] transition-[background,box-shadow] duration-150 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
            style={{ fontSize: 'var(--text-tab)' }}
          >
            <ScanLine className="size-6" aria-hidden />
            {isAvailable ? 'Mượn sách' : 'Đã mượn hết'}
          </button>
        </div>
      </div>

      <KioskFooter />

      {coverOpen && book.coverUrl && (
        <CoverLightbox
          src={book.coverUrl}
          title={book.title}
          onClose={() => setCoverOpen(false)}
        />
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-heading font-semibold text-foreground">{value}</dd>
    </div>
  )
}

/**
 * The gap between arriving and having the book.
 *
 * Chrome and a line, not a skeleton of the whole layout: this screen has a cover, a map
 * and a metadata table, and a grey mock-up of all three flashing before the real thing is
 * more unsettling than a moment of quiet — especially for a reader with poor eyesight,
 * who has to re-find their place once the real content lands.
 */
function Loading() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <KioskHeader statusLabel="Thông tin tài liệu" />
      <main className="grid min-h-0 flex-1 place-items-center">
        <p className="text-muted-foreground" style={{ fontSize: 'var(--text-body)' }}>
          Đang tải thông tin sách…
        </p>
      </main>
      <KioskFooter />
    </div>
  )
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-screen flex-col">
      <KioskHeader statusLabel="Thông tin sách" />
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <p
          className="font-heading font-semibold text-foreground"
          style={{ fontSize: 'var(--text-section)' }}
        >
          Không tìm thấy tài liệu này
        </p>
        <button
          type="button"
          onClick={onBack}
          className="min-h-[var(--touch-min)] rounded-[6px] bg-primary px-8 font-heading font-bold text-primary-foreground"
          style={{ fontSize: 'var(--text-body)' }}
        >
          Quay về kết quả tìm kiếm
        </button>
      </main>
      <KioskFooter />
    </div>
  )
}
