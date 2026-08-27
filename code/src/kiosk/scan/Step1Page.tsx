// Implements Job 3 / Pain Reliever 3 / Product-Service 3 — scan step 1 (book codes).
// Covers the failure state (kiosk-book-scan-step1-fail, 39:82) via component state
// rather than a separate route.
// Figma frame: kiosk-book-scan-step1 (20:366).
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CodeField } from '@/components/kiosk/CodeField'
import { IdleWarning } from '@/components/kiosk/IdleWarning'
import { KioskFooter } from '@/components/kiosk/KioskFooter'
import { KioskHeader } from '@/components/kiosk/KioskHeader'
import { NumericKeypad } from '@/components/kiosk/NumericKeypad'
import { ScanCart } from '@/components/kiosk/ScanCart'
import { ScannerViewport } from '@/components/kiosk/ScannerViewport'
import { ScanSteps } from '@/components/kiosk/ScanSteps'
import { MAX_BOOKS_PER_LOAN, SCAN_FAILURE_MESSAGE, scanBook } from '@/lib/borrow'
import { IDLE_SECONDS, IDLE_WARN_AT } from '@/lib/kioskSession'
import { useKioskIdle } from '@/lib/useKioskIdle'
import { availability, books } from '@/mocks'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'

export function ScanStep1Page() {
  const navigate = useNavigate()
  const scannedBookIds = useBorrowSessionStore((s) => s.scannedBookIds)
  const addScannedBook = useBorrowSessionStore((s) => s.addScannedBook)
  const removeScannedBook = useBorrowSessionStore((s) => s.removeScannedBook)
  const resetCheckout = useBorrowSessionStore((s) => s.resetCheckout)
  const setScanStep = useBorrowSessionStore((s) => s.setScanStep)

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  useEffect(() => setScanStep('step-1'), [setScanStep])

  const idle = useKioskIdle({
    seconds: IDLE_SECONDS,
    warnAt: IDLE_WARN_AT,
    onExpire: () => {
      resetCheckout()
      navigate('/kiosk')
    },
  })

  const isFull = scannedBookIds.length >= MAX_BOOKS_PER_LOAN

  function submit(rawCode: string) {
    const result = scanBook(rawCode, scannedBookIds)

    if (!result.ok) {
      setError(SCAN_FAILURE_MESSAGE[result.failure])
      setJustAdded(null)
      return
    }

    addScannedBook(result.book.id)
    setJustAdded(result.book.title)
    setError(null)
    setCode('')
  }

  /**
   * Stand-in for the barcode camera: picks the next book that could legitimately be
   * scanned right now, so the demo exercises the real `scanBook` path rather than
   * bypassing it.
   */
  function simulateScan() {
    const next = books.find(
      (b) => !scannedBookIds.includes(b.id) && (availability[b.id]?.copiesAvailable ?? 0) > 0,
    )
    if (next) submit(next.isbn)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <KioskHeader statusLabel="Quét sách & thẻ mượn" />

      <main className="mx-auto flex w-full max-w-[1280px] min-h-0 flex-1 flex-col gap-4 overflow-hidden px-10 py-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
          <h1
            className="font-heading font-extrabold tracking-tight text-foreground"
            style={{ fontSize: 'var(--text-section)' }}
          >
            Bước 1 — Quét mã QR / bìa sách
          </h1>
          <ScanSteps current={0} />
        </div>

        {/* The scanner is a fixed, modest band and the list of scanned books takes the rest
            of the column: the list is what the reader actually needs to check, and an
            oversized empty camera box would push it out of sight. */}
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-hidden">
          {/* Left: the scanner and the list it fills. */}
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
            <div className="h-56 shrink-0">
              <ScannerViewport
                kind="book"
                onSimulate={simulateScan}
                simulateLabel="Mô phỏng quét một cuốn"
                disabled={isFull}
              />
            </div>

            {/* Announced politely: a low-vision reader must hear that the scan landed. */}
            <p
              aria-live="polite"
              className="flex min-h-6 shrink-0 items-center gap-2 font-heading font-semibold text-[var(--live-ink)]"
              style={{ fontSize: 'var(--text-meta)' }}
            >
              {justAdded && (
                <>
                  <CheckCircle2 className="size-5 shrink-0" aria-hidden />
                  Đã thêm “{justAdded}” vào phiếu mượn.
                </>
              )}
            </p>

            <div className="min-h-0 flex-1 overflow-hidden">
              <ScanCart bookIds={scannedBookIds} onRemove={removeScannedBook} />
            </div>
          </div>

          {/* Right: manual entry, for a barcode too worn to read. */}
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <CodeField
              value={code}
              onChange={(next) => {
                setCode(next)
                setError(null)
              }}
              onSubmit={() => submit(code)}
              label="Nhập mã ISBN của cuốn sách cần mượn"
              placeholder="Ví dụ: 9781461471379"
              error={error}
            />

            <NumericKeypad
              onKey={(digit) => {
                setCode((c) => c + digit)
                setError(null)
              }}
              onBackspace={() => setCode((c) => c.slice(0, -1))}
              onSubmit={() => submit(code)}
              submitDisabled={code.length === 0}
            />
          </div>
        </div>
      </main>

      <div className="flex shrink-0 items-center gap-4 border-t border-[var(--rule)] bg-card px-10 py-4">
        <button
          type="button"
          // replace, not push: stepping back and forth through the checkout must not
          // pile up duplicate entries that later turn "Quay về" into "go forward".
          onClick={() => navigate('/kiosk/scan', { replace: true })}
          className="inline-flex min-h-16 items-center justify-center gap-3 rounded-full border-2 border-[var(--rule)] bg-card px-10 font-heading font-bold text-foreground transition-colors hover:bg-secondary"
          style={{ fontSize: 'var(--text-tab)' }}
        >
          <ArrowLeft className="size-6" aria-hidden />
          Quay lại
        </button>

        <button
          type="button"
          onClick={() => navigate('/kiosk/scan/step-2')}
          disabled={scannedBookIds.length === 0}
          className="inline-flex min-h-16 flex-1 items-center justify-center gap-3 rounded-full bg-primary px-8 font-heading font-bold text-primary-foreground shadow-[0_6px_20px_-6px_rgb(29_78_216/55%)] transition-transform hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
          style={{ fontSize: 'var(--text-tab)' }}
        >
          Tiếp tục — Bước 2: quét thẻ
          <ArrowRight className="size-6" aria-hidden />
        </button>
      </div>

      <KioskFooter />

      {idle.isWarning && <IdleWarning secondsLeft={idle.remaining} onStay={idle.reset} />}
    </div>
  )
}
