import { CreditCard, QrCode, ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The camera / RFID reader window — Figma BookScannerSide and StudentCardSide in
 * kiosk-book-scan-instruction (5:971) and the two step frames.
 *
 * There is no camera and no card reader behind this build, and pretending otherwise
 * would make the demo dishonest — so the viewport carries a visible "mô phỏng" action
 * instead of a fake live feed. On real kiosk hardware this component is where the video
 * stream and the RFID event listener land; everything around it stays as it is.
 */

interface ScannerViewportProps {
  kind: 'book' | 'card'
  /** Fires the simulated read. */
  onSimulate: () => void
  simulateLabel: string
  /** Dims the viewport and blocks the action once this side is done. */
  done?: boolean
  disabled?: boolean
}

export function ScannerViewport({
  kind,
  onSimulate,
  simulateLabel,
  done = false,
  disabled = false,
}: ScannerViewportProps) {
  const Icon = kind === 'book' ? QrCode : CreditCard

  return (
    <div
      data-kiosk-surface
      className={cn(
        // Fills whatever box the page gives it, rather than claiming the column itself:
        // step 1 pairs it with the scanned-book list, step 2 has it to itself.
        'relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden rounded-[8px] border-2 border-dashed p-6 text-center transition-colors',
        done
          ? 'border-[var(--live-ink)] bg-[color-mix(in_srgb,var(--live)_8%,transparent)]'
          : 'border-[var(--rule)] bg-secondary/50',
      )}
    >
      {/* Sweeping line: the one piece of motion that says "this thing is looking". */}
      {!done && !disabled && (
        <span
          aria-hidden
          className="kiosk-scanline pointer-events-none absolute inset-x-6 h-0.5 bg-primary/70"
        />
      )}

      <Icon
        className={cn('size-14', done ? 'text-[var(--live-ink)]' : 'text-muted-foreground')}
        strokeWidth={1.5}
        aria-hidden
      />

      <button
        type="button"
        onClick={onSimulate}
        disabled={disabled || done}
        className="inline-flex min-h-[var(--touch-min)] items-center gap-2 rounded-[6px] border border-[var(--rule)] bg-card shadow-[var(--btn-shadow)] px-6 font-heading font-semibold text-foreground transition-colors hover:border-primary hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontSize: 'var(--text-meta)' }}
      >
        <ScanLine className="size-5" aria-hidden />
        {simulateLabel}
      </button>

      <p className="text-muted-foreground" style={{ fontSize: 'var(--text-eyebrow)' }}>
        Bản demo chưa nối camera/đầu đọc thẻ — chạm nút trên để mô phỏng một lần quét.
      </p>
    </div>
  )
}
