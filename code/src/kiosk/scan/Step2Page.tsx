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
import { checkEligibility, createLoanSlip, formatDate, LOAN_DAYS } from '@/lib/borrow'
import { IDLE_SECONDS, IDLE_WARN_AT } from '@/lib/kioskSession'
import { useKioskIdle } from '@/lib/useKioskIdle'
import { findStudentByCard, students } from '@/mocks'
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

  const student = studentCardCode ? findStudentByCard(studentCardCode) : undefined
  const blocks = student ? checkEligibility(student, scannedBookIds.length) : []
  const canConfirm = Boolean(student) && blocks.length === 0

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + LOAN_DAYS)

  function submit(rawCode: string) {
    const match = findStudentByCard(rawCode)
    if (!match) {
      setError('Mã thẻ không hợp lệ. Kiểm tra lại số in trên thẻ thư viện rồi thử lần nữa.')
      setStudentCard(null)
      return
    }
    setError(null)
    setStudentCard(match.cardCode)
    setCode('')
  }

  function confirm() {
    if (!student || !canConfirm) return
    completeBorrow(createLoanSlip(student, scannedBookIds))
    navigate('/kiosk/borrow-complete')
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
            {student ? (
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
                    onSimulate={() => submit(students[0].cardCode)}
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
                className="flex items-start gap-3 rounded-2xl border-2 border-[var(--live-ink)] bg-[color-mix(in_srgb,var(--live)_8%,transparent)] px-5 py-4 text-foreground"
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
            {student ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <ScanCart bookIds={scannedBookIds} />
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
              </>
            )}
          </div>
        </div>
      </main>

      <div className="flex shrink-0 items-center gap-4 border-t border-[var(--rule)] bg-card px-10 py-4">
        <button
          type="button"
          onClick={() => navigate('/kiosk/scan/step-1', { replace: true })}
          className="inline-flex min-h-16 items-center justify-center gap-3 rounded-full border-2 border-[var(--rule)] bg-card px-10 font-heading font-bold text-foreground transition-colors hover:bg-secondary"
          style={{ fontSize: 'var(--text-tab)' }}
        >
          <ArrowLeft className="size-6" aria-hidden />
          Quay lại
        </button>

        <button
          type="button"
          onClick={confirm}
          disabled={!canConfirm}
          className="inline-flex min-h-16 flex-1 items-center justify-center gap-3 rounded-full bg-primary px-8 font-heading font-bold text-primary-foreground shadow-[0_6px_20px_-6px_rgb(29_78_216/55%)] transition-transform hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
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
        className="flex items-center gap-4 rounded-2xl border-2 border-[var(--rule)] bg-card p-5"
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
              className="rounded-2xl border-2 border-[var(--destructive)] bg-[color-mix(in_srgb,var(--destructive)_7%,transparent)] px-5 py-4"
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
