import { cn } from '@/lib/utils'

/**
 * Dual-handle range slider, from the Figma advanced-filter panel (34:218).
 *
 * Built from two stacked native <input type="range"> elements rather than a custom
 * pointer implementation: that keeps keyboard control and screen-reader semantics for
 * free, which matters for a persona with low vision. The inputs themselves ignore
 * pointer events; only their thumbs accept them, so both handles stay grabbable.
 */

interface RangeSliderProps {
  min: number
  max: number
  from: number
  to: number
  onChange: (from: number, to: number) => void
  labelFrom: string
  labelTo: string
}

export function RangeSlider({
  min,
  max,
  from,
  to,
  onChange,
  labelFrom,
  labelTo,
}: RangeSliderProps) {
  const span = Math.max(1, max - min)
  const leftPct = ((from - min) / span) * 100
  const rightPct = ((to - min) / span) * 100

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-8">
        {/* Track */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[var(--rule)]"
        />
        {/* Selected span */}
        <span
          aria-hidden
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />

        <input
          type="range"
          className="kiosk-range"
          min={min}
          max={max}
          value={from}
          aria-label={labelFrom}
          onChange={(e) => onChange(Math.min(Number(e.target.value), to), to)}
        />
        <input
          type="range"
          className="kiosk-range"
          min={min}
          max={max}
          value={to}
          aria-label={labelTo}
          onChange={(e) => onChange(from, Math.max(Number(e.target.value), from))}
        />
      </div>

      <div
        className={cn('flex justify-between font-heading font-semibold tabular-nums text-foreground')}
        style={{ fontSize: 'var(--text-meta)' }}
      >
        <span>{from}</span>
        <span>{to}</span>
      </div>
    </div>
  )
}
