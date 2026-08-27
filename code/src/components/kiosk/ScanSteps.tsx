import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Where the reader is in the two-step checkout. The Figma frames number the steps inside
 * each panel ("1. Quét mã QR", "2. Quét thẻ sinh viên") but never show the whole path, so
 * standing at step 2 there is no way to tell how much is left. On a kiosk used between
 * classes (scenario.md — "chỉ có 15 phút") that is exactly what a reader wants to know.
 */

const STEPS = ['Quét sách', 'Quét thẻ', 'Xong'] as const

interface ScanStepsProps {
  /** 0-based index of the step currently in progress. */
  current: number
}

export function ScanSteps({ current }: ScanStepsProps) {
  return (
    <ol className="flex items-center gap-3" aria-label="Tiến trình mượn sách">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current

        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className="flex items-center gap-2.5"
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full font-heading font-bold',
                  done && 'bg-[var(--live-ink)] text-white',
                  active && 'bg-primary text-primary-foreground',
                  !done && !active && 'border-2 border-[var(--rule)] text-muted-foreground',
                )}
                style={{ fontSize: 'var(--text-meta)' }}
              >
                {done ? <Check className="size-5" aria-hidden /> : i + 1}
              </span>
              <span
                className={cn(
                  'font-heading font-semibold',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
                style={{ fontSize: 'var(--text-meta)' }}
              >
                {label}
                {done && <span className="sr-only"> — đã xong</span>}
              </span>
            </span>

            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn('h-0.5 w-10 rounded-full', done ? 'bg-[var(--live-ink)]' : 'bg-[var(--rule)]')}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
