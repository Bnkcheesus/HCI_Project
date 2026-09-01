// Implements Job 3 / Pain Reliever 3 / Product-Service 3 — scan step 2 (student card),
// the eligibility check, and the review the reader sees before anything is committed.
// Figma frame: kiosk-book-scan-step2 (24:72).
import { AlertTriangle, ArrowLeft, BadgeCheck, CalendarClock, Check } from 'lucide-react'
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
import { useBooksByIds, useCardCheck, useCheckout } from '@/api/queries'
import { formatDate, LOAN_DAYS } from '@/lib/borrow'
import { IDLE_SECONDS, IDLE_WARN_AT } from '@/lib/kioskSession'
import { useKioskIdle } from '@/lib/useKioskIdle'
import { DEMO_CARD_CODE } from '@/lib/kioskSession'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'

export function ScanStep2Page() {
  const navigate = useNavigate()
  const scannedBookIds = useBorrowSessionStore((s) => s.scannedBookIds)
  const studentCardCode = useBorrowSessionStore((s) => s.studentCardCode)
  const setStudentCard = useBorrowSessionStore((s) => s.setStudentCard)
  const completeBorrow = useBorrowSessionStore((s) => s.completeBorrow)
  const resetCheckout = useBorrowSessionStore((s) => s.resetCheckout)
  const setScanStep = useBorrowSessionStore((s) => s.setScanStep)

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setScanStep('step-2'), [setScanStep])

  // Reaching step 2 with an empty cart means the session was reset underneath us
  // (idle timeout, a reload); there is nothing to confirm, so go back to scanning.
  useEffect(() => {
    if (scannedBookIds.length === 0) navigate('/kiosk/scan/step-1', { replace: true })
  }, [scannedBookIds.length, navigate])

  const idle = useKioskIdle({
    seconds: IDLE_SECONDS,
    warnAt: IDLE_WARN_AT,
    onExpire: () => {
      resetCheckout()
      navigate('/kiosk')
    },
  })

  /*
   * The card and every reason it cannot borrow, in one answer.
   *
   * The two belong together: a screen that says "Thẻ hợp lệ" and only discovers a refusal
   * on submit has told the reader something untrue. `cartSize` is part of the question
   * because it changes the answer — the same card is fine for two books and refused for
   * four.
   */
  const { data: card, isPending: checkingCard } = useCardCheck(
    studentCardCode,
    scannedBookIds.length,
  )
  const checkout = useCheckout()

  /*
   * Catalogue records for the scanned books. The cart holds ids — the server has never
   * seen this cart — so the titles and cover art come back in one request for the set.
   */
  const { data: cartSet } = useBooksByIds(scannedBookIds)
  const cartBooksById = Object.fromEntries((cartSet?.books ?? []).map((b) => [b.id, b]))


  const student = card?.student
  const blocks = card?.blocks ?? []

  /*
   * A number that came back as `null` is a card the library does not have.
   *
   * The refusal is derived from the answer rather than raised when the number is typed,
   * so there is exactly one place that decides what a card code means — the same place
   * that decides whether the card can borrow. The two used to be separate, and a card
   * could be called valid by one and unknown by the other.
   */
  const unknownCard = Boolean(studentCardCode) && !checkingCard && card === null
  const cardError =
    error ??
    (unknownCard
      ? 'Mã thẻ không hợp lệ. Kiểm tra lại số in trên thẻ thư viện rồi thử lần nữa.'
      : null)
  const waitingOnCard = Boolean(studentCardCode) && checkingCard
  const canConfirm = Boolean(student) && blocks.length === 0 && !checkout.isPending

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + LOAN_DAYS)

  /**
   * Reading a card is just recording the number; the server decides what it means.
   *
   * Validation happens in `useCardCheck` above rather than here, so the "invalid card"
   * message and the eligibility refusals come from one place instead of two that could
   * disagree.
   */
  function submit(rawCode: string) {
    const trimmed = rawCode.trim()
    if (!trimmed) return
    setError(null)
    setStudentCard(trimmed)
    setCode('')
  }

  async function confirm() {
    if (!student || !canConfirm) return

    try {
      const { slip } = await checkout.mutateAsync({
        cardCode: student.cardCode,
        bookIds: scannedBookIds,
      })
      completeBorrow(slip)
      navigate('/kiosk/borrow-complete')
    } catch {
      /*
       * The server refused at the last moment — almost always because someone else took
       * the last copy while this reader was finding their card. Sending them back to step
       * 1 would be worse than saying so: the cart is still valid apart from that one book,
       * and they can drop it and continue.
       */
      setError(
        'Không hoàn tất được lượt mượn. Có thể một cuốn vừa được người khác mượn mất — hãy kiểm tra lại danh sách rồi thử lần nữa.',
      )
    }
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
            Bước 2 — Quét thẻ sinh viên
          </h1>
          <ScanSteps current={1} />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 gap-6 overflow-hidden">
          {/* Left: read the card, then say what it means. */}
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            {waitingOnCard ? (
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-body)' }}>
                Đang kiểm tra thẻ…
              </p>
            ) : student ? (
              <>
                <StudentPanel
                  name={student.name}
                  studentId={student.studentId}
                  faculty={student.faculty}
                  blocks={blocks}
                />
                {/* Right next to the card it replaces — a blocked reader needs it, and at
                    the bottom of the far column nobody finds it. */}
                <button
                  type="button"
                  onClick={() => {
                    setStudentCard(null)
                    setCode('')
                  }}
                  className="self-start font-heading font-semibold text-primary underline-offset-4 hover:underline"
                  style={{ fontSize: 'var(--text-meta)' }}
                >
                  Dùng thẻ khác
                </button>
              </>
            ) : (
              <>
                <div className="h-64 shrink-0">
                  <ScannerViewport
                    kind="card"
                    onSimulate={() => submit(DEMO_CARD_CODE)}
                    simulateLabel="Mô phỏng quét thẻ"
                  />
                </div>
                <p className="text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
                  Đặt thẻ sinh viên lên khay đọc RFID bên dưới màn hình, hoặc nhập mã thẻ bên phải.
                </p>
              </>
            )}

            {/* Only shown before the borrow is committed — the review the prototype skipped. */}
            {student && canConfirm && (
              <p
                className="flex items-start gap-3 rounded-[8px] border-2 border-[var(--live-ink)] bg-[color-mix(in_srgb,var(--live)_8%,transparent)] px-5 py-4 text-foreground"
                style={{ fontSize: 'var(--text-body)' }}
              >
                <CalendarClock className="mt-0.5 size-6 shrink-0 text-[var(--live-ink)]" aria-hidden />
                <span>
                  Bạn sắp mượn <strong className="font-heading font-bold">{scannedBookIds.length} cuốn</strong>,
                  hạn trả <strong className="font-heading font-bold">{formatDate(dueDate.toISOString().slice(0, 10))}</strong>{' '}
                  ({LOAN_DAYS} ngày kể từ hôm nay).
                </span>
              </p>
            )}
          </div>

          {/* Right: manual entry, or — once the card is read — what is being borrowed. */}
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            {waitingOnCard ? (
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-body)' }}>
                Đang kiểm tra thẻ…
              </p>
            ) : student ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <ScanCart bookIds={scannedBookIds} booksById={cartBooksById} />
              </div>
            ) : (
              <>
                <CodeField
                  value={code}
                  onChange={(next) => {
                    setCode(next)
                    setError(null)
                  }}
                  onSubmit={() => submit(code)}
                  label="Nhập mã thẻ thư viện"
                  placeholder="Ví dụ: 20215012"
                  error={cardError}
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
              </>
            )}
          </div>
        </div>
      </main>

      <div className="flex shrink-0 items-center gap-4 border-t border-[var(--rule)] bg-card px-10 py-4">
        <button
          type="button"
          onClick={() => navigate('/kiosk/scan/step-1', { replace: true })}
          className="inline-flex min-h-16 items-center justify-center gap-3 rounded-[6px] border border-[var(--rule)] bg-card shadow-[var(--btn-shadow)] px-10 font-heading font-bold text-foreground transition-colors hover:bg-secondary"
          style={{ fontSize: 'var(--text-tab)' }}
        >
          <ArrowLeft className="size-6" aria-hidden />
          Quay lại
        </button>

        <button
          type="button"
          onClick={confirm}
          disabled={!canConfirm}
          className="inline-flex min-h-16 flex-1 items-center justify-center gap-3 rounded-[6px] bg-primary px-8 font-heading font-bold text-primary-foreground shadow-[var(--btn-shadow)] transition-[background,box-shadow] duration-150 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
          style={{ fontSize: 'var(--text-tab)' }}
        >
          <Check className="size-6" aria-hidden />
          Xác nhận mượn {scannedBookIds.length} cuốn
        </button>
      </div>

      <KioskFooter />

      {idle.isWarning && <IdleWarning secondsLeft={idle.remaining} onStay={idle.reset} />}
    </div>
  )
}

function StudentPanel({
  name,
  studentId,
  faculty,
  blocks,
}: {
  name: string
  studentId: string
  faculty: string
  blocks: { code: string; message: string; hint: string }[]
}) {
  const ok = blocks.length === 0

  return (
    <section className="flex flex-col gap-4">
      <div
        data-kiosk-surface
        className="flex items-center gap-4 rounded-[8px] border border-[var(--rule)] bg-card shadow-[var(--btn-shadow)] p-5"
      >
        <span
          className={
            ok
              ? 'grid size-14 shrink-0 place-items-center rounded-full bg-[var(--live-ink)] text-white'
              : 'grid size-14 shrink-0 place-items-center rounded-full bg-[var(--destructive)] text-white'
          }
          aria-hidden
        >
          {ok ? <BadgeCheck className="size-7" /> : <AlertTriangle className="size-7" />}
        </span>

        <div className="min-w-0">
          <p
            className="font-heading font-bold text-foreground"
            style={{ fontSize: 'var(--text-section)' }}
          >
            {name}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
            MSSV: {studentId} • {faculty}
          </p>
          <p
            className={
              ok
                ? 'mt-1 font-heading font-semibold text-[var(--live-ink)]'
                : 'mt-1 font-heading font-semibold text-[var(--destructive)]'
            }
            style={{ fontSize: 'var(--text-meta)' }}
          >
            {ok ? 'Thẻ thư viện hợp lệ' : 'Thẻ chưa đủ điều kiện mượn'}
          </p>
        </div>
      </div>

      {/* Every reason at once, each with a way out — see checkEligibility. */}
      {blocks.length > 0 && (
        <ul className="flex flex-col gap-3" aria-label="Lý do chưa mượn được">
          {blocks.map((block) => (
            <li
              key={block.code}
              className="rounded-[8px] border-2 border-[var(--destructive)] bg-[color-mix(in_srgb,var(--destructive)_7%,transparent)] px-5 py-4"
            >
              <p
                className="font-heading font-bold text-[var(--destructive)]"
                style={{ fontSize: 'var(--text-meta)' }}
              >
                {block.message}
              </p>
              <p className="mt-1 text-foreground" style={{ fontSize: 'var(--text-meta)' }}>
                {block.hint}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
