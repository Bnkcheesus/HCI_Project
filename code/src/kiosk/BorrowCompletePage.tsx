// Implements Job 3 / Gain Creator 3 / Product-Service 3 — the receipt that closes the
// self-checkout, plus the phone hand-off from Gain Creator 3 ("in phiếu hoặc đồng bộ
// app") and Pain Reliever 4 (app nhắc hạn trả).
// Figma frame: kiosk-borrow-complete (5:1033).
import { CheckCircle2, House, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KioskFooter } from '@/components/kiosk/KioskFooter'
import { KioskHeader } from '@/components/kiosk/KioskHeader'
import { KioskQr } from '@/components/kiosk/KioskQr'
import { formatDate, LOAN_DAYS } from '@/lib/borrow'
import { books, libraryStatus } from '@/mocks'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'

export function BorrowCompletePage() {
  const navigate = useNavigate()
  const slip = useBorrowSessionStore((s) => s.slip)
  const reset = useBorrowSessionStore((s) => s.reset)

  const [printed, setPrinted] = useState(false)

  // Nothing was borrowed — a reload or a stale link. Send them somewhere useful rather
  // than rendering an empty receipt.
  useEffect(() => {
    if (!slip) navigate('/kiosk', { replace: true })
  }, [slip, navigate])

  if (!slip) return null

  const borrowed = slip.bookIds
    .map((id) => books.find((b) => b.id === id))
    .filter((b) => b !== undefined)

  function goHome() {
    reset()
    navigate('/kiosk')
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <KioskHeader statusLabel="Giao dịch hoàn tất" />

      <main className="mx-auto flex w-full max-w-[1180px] min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-10 py-5">
        <header className="flex shrink-0 items-center gap-5">
          <span
            className="kiosk-rise grid size-16 shrink-0 place-items-center rounded-full bg-[var(--live-ink)] text-white"
            aria-hidden
          >
            <CheckCircle2 className="size-9" strokeWidth={2} />
          </span>
          <div>
            <h1
              className="font-heading font-extrabold tracking-tight text-foreground"
              style={{ fontSize: 'var(--text-brand)' }}
            >
              Mượn sách thành công!
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-body)' }}>
              Vui lòng nhận biên lai in ra từ khe bên dưới, hoặc quét mã QR để lưu phiếu vào điện thoại.
            </p>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,7fr)_minmax(0,4fr)] gap-6">
          {/* The slip itself */}
          <section
            data-kiosk-surface
            className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-[8px] border border-[var(--rule)] bg-card shadow-[var(--btn-shadow)] p-6"
            aria-label="Phiếu mượn sách"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-[var(--rule)] pb-3">
              <h2
                className="font-heading font-bold uppercase tracking-[0.18em] text-foreground"
                style={{ fontSize: 'var(--text-eyebrow)' }}
              >
                Phiếu mượn sách
              </h2>
              <p
                className="font-heading font-bold tabular-nums text-[var(--live-ink)]"
                style={{ fontSize: 'var(--text-meta)' }}
              >
                #{slip.id}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <SlipRow label="Người mượn" value={slip.studentName} />
              <SlipRow label="Mã thẻ" value={slip.studentId} />
              <SlipRow label="Ngày mượn" value={formatDate(slip.borrowedAt)} />
              <SlipRow label={`Hạn trả (${LOAN_DAYS} ngày)`} value={formatDate(slip.dueAt)} highlight />
            </dl>

            <div className="flex min-h-0 flex-col gap-2 border-t border-dashed border-[var(--rule)] pt-3">
              <h3
                className="font-heading font-bold uppercase tracking-[0.18em] text-muted-foreground"
                style={{ fontSize: 'var(--text-eyebrow)' }}
              >
                {borrowed.length} cuốn đã mượn
              </h3>
              <ol className="flex flex-col gap-2">
                {borrowed.map((book, i) => (
                  <li
                    key={book.id}
                    className="flex items-baseline gap-3 text-foreground"
                    style={{ fontSize: 'var(--text-meta)' }}
                  >
                    <span className="font-heading font-bold tabular-nums text-muted-foreground">
                      {i + 1}.
                    </span>
                    <span className="flex-1">
                      <strong className="font-heading font-bold">{book.title}</strong>
                      <span className="text-muted-foreground"> — {book.author}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">ISBN {book.isbn}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Hand-off + actions */}
          <aside className="flex min-h-0 flex-col items-center gap-4 overflow-y-auto">
            <KioskQr
              size="lg"
              target={`${window.location.origin}/mobile/phieu-muon?slip=${encodeURIComponent(slip.id)}`}
              alt={`Mã QR lưu phiếu mượn ${slip.id} vào ứng dụng LibAssist trên điện thoại`}
              caption="Quét để lưu phiếu vào app và được nhắc hạn trả"
            />

            <p
              className="text-center text-muted-foreground"
              style={{ fontSize: 'var(--text-meta)' }}
            >
              Ứng dụng sẽ nhắc bạn trước ngày {formatDate(slip.dueAt)} để khỏi quên hạn trả.
            </p>

            <div className="mt-auto flex w-full flex-col gap-3">
              <button
                type="button"
                onClick={() => setPrinted(true)}
                className="inline-flex min-h-16 items-center justify-center gap-3 rounded-[6px] border border-[var(--rule)] bg-card shadow-[var(--btn-shadow)] px-6 font-heading font-bold text-foreground transition-colors hover:bg-secondary"
                style={{ fontSize: 'var(--text-tab)' }}
              >
                <Printer className="size-6" aria-hidden />
                In lại phiếu mượn
              </button>

              <p
                aria-live="polite"
                className="min-h-5 text-center font-heading font-semibold text-[var(--live-ink)]"
                style={{ fontSize: 'var(--text-eyebrow)' }}
              >
                {printed && 'Đã gửi lệnh in — phiếu đang ra ở khe bên dưới.'}
              </p>

              <button
                type="button"
                onClick={goHome}
                className="inline-flex min-h-16 items-center justify-center gap-3 rounded-[6px] bg-primary px-6 font-heading font-bold text-primary-foreground shadow-[var(--btn-shadow)] transition-[background,box-shadow] duration-150 active:brightness-95"
                style={{ fontSize: 'var(--text-tab)' }}
              >
                <House className="size-6" aria-hidden />
                Quay về trang chủ
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* Printer status, from the Figma BottomTicker. */}
      <p
        className="shrink-0 border-t border-[var(--rule)] bg-secondary px-10 py-2 text-center text-muted-foreground"
        style={{ fontSize: 'var(--text-eyebrow)' }}
      >
        Hệ thống in đang hoạt động bình thường • Giấy in còn 85% • Hỗ trợ: {libraryStatus.supportPhone}
      </p>

      <KioskFooter />
    </div>
  )
}

function SlipRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <dt className="text-muted-foreground" style={{ fontSize: 'var(--text-eyebrow)' }}>
        {label}
      </dt>
      <dd
        className={
          highlight
            ? 'font-heading font-bold text-[var(--destructive)]'
            : 'font-heading font-bold text-foreground'
        }
        style={{ fontSize: 'var(--text-body)' }}
      >
        {value}
      </dd>
    </div>
  )
}
