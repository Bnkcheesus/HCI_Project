// The countdown chip on a loan — Pain Reliever 4 ("app nhắc hạn trả"). A date alone is
// storage, not a reminder: it makes the reader do the arithmetic. This does it for them.
import { daysUntilDue, dueCountdown, DUE_SOON_DAYS } from '@/lib/loans'
import { cn } from '@/lib/utils'

interface DueBadgeProps {
  dueAt: string
  className?: string
}

export function DueBadge({ dueAt, className }: DueBadgeProps) {
  const days = daysUntilDue(dueAt)

  // Colour carries the same message as the words, never instead of them — the persona has
  // poor eyesight, and WCAG rules out colour as the only signal in any case.
  const tone =
    days < 0
      ? 'bg-[var(--destructive)] text-white'
      : days <= DUE_SOON_DAYS
        ? 'bg-[var(--ink)] text-white'
        : 'bg-[var(--live-ink)] text-white'

  // Geometry, padding and type are AvailabilityChip's, so the kiosk chip and this one read
  // as the same object in two places. What it does not borrow is that chip's pulsing dot:
  // there the dot means "this number is live right now", and a due date is not live data.
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-[6px] px-3 py-1.5 font-semibold',
        tone,
        className,
      )}
      style={{ fontSize: 'var(--text-eyebrow)' }}
    >
      {dueCountdown(dueAt)}
    </span>
  )
}
