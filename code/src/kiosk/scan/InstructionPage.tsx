// Implements Job 3 / Pain Reliever 3 / Product-Service 3 — first screen of the
// self-checkout flow: how to scan the book + student card.
// Figma frame: kiosk-book-scan-instruction (5:971).
import { ArrowLeft, ArrowRight, CreditCard, QrCode } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { KioskFooter } from '@/components/kiosk/KioskFooter'
import { KioskHeader } from '@/components/kiosk/KioskHeader'
import { ScanSteps } from '@/components/kiosk/ScanSteps'
import { MAX_BOOKS_PER_LOAN, LOAN_DAYS } from '@/lib/borrow'
import { books } from '@/mocks'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'

export function ScanInstructionPage() {
  const navigate = useNavigate()
  const selectedBookId = useBorrowSessionStore((s) => s.selectedBookId)
  const resetCheckout = useBorrowSessionStore((s) => s.resetCheckout)
  const setScanStep = useBorrowSessionStore((s) => s.setScanStep)

  const chosen = books.find((b) => b.id === selectedBookId)

  // Arriving here always starts a fresh checkout — otherwise a session abandoned by the
  // previous reader would still be sitting in the cart.
  useEffect(() => {
    resetCheckout()
    setScanStep('instruction')
  }, [resetCheckout, setScanStep])

  /**
   * Leaves the checkout for a named destination rather than `navigate(-1)`.
   *
   * Step 1's own "Quay lại" pushes a second /kiosk/scan entry, so history reads
   * … → scan → step-1 → scan, and stepping back one lands on step 1 — the screen the
   * reader just left. Going somewhere explicit is the only way out that always makes
   * sense: back to the book they picked, or the home screen if they came in cold.
   */
  function leaveCheckout() {
    navigate(chosen ? `/kiosk/books/${chosen.id}` : '/kiosk')
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <KioskHeader statusLabel="Quét sách & thẻ mượn" />

      <main className="mx-auto flex w-full max-w-[1280px] min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-10 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1
              className="font-heading font-extrabold tracking-tight text-foreground"
              style={{ fontSize: 'var(--text-brand)' }}
            >
              Tự mượn sách tại kiosk
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-body)' }}>
              Hai bước, không cần chờ thủ thư. Mỗi lượt mượn tối đa {MAX_BOOKS_PER_LOAN} cuốn trong{' '}
              {LOAN_DAYS} ngày.
            </p>
          </div>
          <ScanSteps current={0} />
        </div>

        {/* The book the reader picked on the detail screen — a reminder to carry it to the
            scanner, not a substitute for scanning it. */}
        {chosen && (
          <p
            className="rounded-[8px] border border-[var(--rule)] bg-card px-6 py-4 text-foreground"
            style={{ fontSize: 'var(--text-body)' }}
          >
            Bạn vừa chọn <strong className="font-heading font-bold">{chosen.title}</strong> — hãy cầm
            cuốn sách tới máy quét, rồi bắt đầu bước 1.
          </p>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-6">
          <StepCard
            index={1}
            icon={QrCode}
            title="Quét mã QR / bìa sách"
            body="Đưa mã ISBN sau bìa sách vào vùng camera. Quét lần lượt từng cuốn bạn muốn mượn — nếu mã mờ, bạn nhập tay bằng bàn phím số."
          />
          <StepCard
            index={2}
            icon={CreditCard}
            title="Quét thẻ sinh viên"
            body="Đặt thẻ lên khay đọc RFID bên dưới màn hình. Hệ thống kiểm tra hạn thẻ, sách quá hạn và số sách bạn đang mượn trước khi xác nhận."
          />
        </div>
      </main>

      <div className="flex shrink-0 items-center gap-4 border-t border-[var(--rule)] bg-card px-10 py-4">
        <button
          type="button"
          onClick={leaveCheckout}
          className="inline-flex min-h-16 items-center justify-center gap-3 rounded-[6px] border border-[var(--rule)] bg-card shadow-[var(--btn-shadow)] px-10 font-heading font-bold text-foreground transition-colors hover:bg-secondary"
          style={{ fontSize: 'var(--text-tab)' }}
        >
          <ArrowLeft className="size-6" aria-hidden />
          Quay về
        </button>

        <button
          type="button"
          onClick={() => navigate('/kiosk/scan/step-1')}
          className="inline-flex min-h-16 flex-1 items-center justify-center gap-3 rounded-[6px] bg-primary px-8 font-heading font-bold text-primary-foreground shadow-[var(--btn-shadow)] transition-[background,box-shadow] duration-150 active:brightness-95"
          style={{ fontSize: 'var(--text-tab)' }}
        >
          Bắt đầu quy trình mượn sách
          <ArrowRight className="size-6" aria-hidden />
        </button>
      </div>

      <KioskFooter />
    </div>
  )
}

function StepCard({
  index,
  icon: Icon,
  title,
  body,
}: {
  index: number
  icon: typeof QrCode
  title: string
  body: string
}) {
  return (
    <section
      data-kiosk-surface
      className="flex flex-col items-center justify-center gap-4 rounded-[8px] border border-[var(--rule)] bg-card p-8 text-center"
    >
      <span
        className="grid size-12 place-items-center rounded-full bg-primary font-heading font-bold text-primary-foreground"
        style={{ fontSize: 'var(--text-tab)' }}
        aria-hidden
      >
        {index}
      </span>
      <Icon className="size-16 text-[var(--live-ink)]" strokeWidth={1.5} aria-hidden />
      <h2
        className="font-heading font-bold text-foreground"
        style={{ fontSize: 'var(--text-section)' }}
      >
        <span className="sr-only">Bước {index}: </span>
        {title}
      </h2>
      <p className="max-w-md text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
        {body}
      </p>
    </section>
  )
}
