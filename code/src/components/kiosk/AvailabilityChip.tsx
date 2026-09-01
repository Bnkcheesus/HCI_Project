import { cn } from '@/lib/utils'
import type { Availability } from '@/shared/types'

/**
 * Real-time availability badge — Pain Reliever 2 / Gain Creator 4.
 * This answers the persona's single worst pain: "phải đến tận kệ mới biết sách đã hết".
 * Solid (never translucent) so it stays legible on top of cover artwork.
 *
 * Takes the record rather than looking it up by id. It used to read
 * `availability[bookId]` from a module-level object — a global read from the very bottom
 * of the component tree, which meant every screen drawing a chip had an invisible
 * dependency on the whole catalogue being in memory. Now the page that fetched the books
 * passes down the copy counts that came back with them, so the chip and the title on the
 * same card are guaranteed to be describing the same moment.
 */

interface AvailabilityChipProps {
  availability: Availability | undefined
  className?: string
}

export function AvailabilityChip({ availability, className }: AvailabilityChipProps) {
  // Still loading, or a book with no availability record. Drawing "Đã mượn hết" while the
  // number is in flight would be a lie in the one place the reader trusts most.
  if (!availability) return null

  const isAvailable = availability.copiesAvailable > 0
  const label = isAvailable ? `Còn ${availability.copiesAvailable} cuốn` : 'Đã mượn hết'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-[6px] px-3 py-1.5 font-semibold text-white',
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
