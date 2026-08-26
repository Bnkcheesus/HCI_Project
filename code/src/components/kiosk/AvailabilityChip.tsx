import { availability } from '@/mocks'
import { cn } from '@/lib/utils'

/**
 * Real-time availability badge — Pain Reliever 2 / Gain Creator 4.
 * This answers the persona's single worst pain: "phải đến tận kệ mới biết sách đã hết".
 * Solid (never translucent) so it stays legible on top of cover artwork.
 */

interface AvailabilityChipProps {
  bookId: string
  className?: string
}

export function AvailabilityChip({ bookId, className }: AvailabilityChipProps) {
  const record = availability[bookId]
  if (!record) return null

  const isAvailable = record.copiesAvailable > 0
  const label = isAvailable ? `Còn ${record.copiesAvailable} cuốn` : 'Đã mượn hết'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold text-white',
        isAvailable ? 'bg-[var(--live-ink)]' : 'bg-[var(--ink)]',
        className,
      )}
      style={{ fontSize: 'var(--text-eyebrow)' }}
    >
      <span
        aria-hidden
        className={cn('size-2 rounded-full bg-white', isAvailable && 'kiosk-pulse')}
      />
      {label}
    </span>
  )
}
