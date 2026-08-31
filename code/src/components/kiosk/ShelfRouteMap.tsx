import { Book, MapPin } from 'lucide-react'
import { AISLE_COUNT, type ShelfLocation } from '@/mocks'
import { cn } from '@/lib/utils'

/**
 * 2D route map — Figma MapView (10:321), rebuilt so the route is drawn to whichever
 * shelf the book actually sits in rather than to a fixed spot.
 *
 * The floor plan is SVG (grid, shelf runs, path); the pin labels are real HTML on top.
 * That split is deliberate: SVG <text> in a scaled viewBox cannot size its own backing
 * plate, so a long code like "MA-215" spilled out of its label. HTML labels grow with
 * their text and inherit the kiosk type scale, including accessibility mode.
 *
 * The drawing is decorative; the same route is written out in words beside it, because
 * the persona's stated pain is that a picture-only map is hard to use (Pain Reliever 5).
 */

/** Floor-plan geometry, in percent of the map box. */
const AISLE_TOP = 14
const AISLE_BOTTOM = 66
const WALKWAY_Y = 82
const KIOSK_X = 8
const FIRST_AISLE_X = 26
const AISLE_GAP = 16

function aisleX(index: number): number {
  return FIRST_AISLE_X + index * AISLE_GAP
}

interface ShelfRouteMapProps {
  location: ShelfLocation
  /**
   * Overrides the aspect ratio. 100/38 suits a 1280px kiosk panel and is far too wide for
   * a phone held upright, where the same map would be a 130px letterbox. The viewBox is
   * drawn with preserveAspectRatio="none" and the pins are positioned in percentages, so
   * a taller box stretches the floor plan without moving anything off its mark.
   */
  className?: string
}

export function ShelfRouteMap({ location, className }: ShelfRouteMapProps) {
  const targetX = aisleX(location.aisle)
  const targetY = AISLE_TOP + (AISLE_BOTTOM - AISLE_TOP) * location.alongAisle

  return (
    <div
      data-kiosk-surface
      className={cn(
        'relative aspect-[100/38] w-full overflow-hidden rounded-[8px] border border-[var(--rule)] bg-secondary',
        className,
      )}
    >
      <svg
        viewBox="0 0 100 38"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        role="img"
        aria-label={`Sơ đồ đường đi từ kiosk tới kệ ${location.shelfCode}, dãy số ${location.aisle + 1}`}
      >
        {/* Shelf runs — the book always sits in one of these */}
        {Array.from({ length: AISLE_COUNT }, (_, i) => {
          const isTarget = i === location.aisle
          return (
            <rect
              key={i}
              x={(aisleX(i) / 100) * 100 - 2.4}
              y={(AISLE_TOP / 100) * 38}
              width="4.8"
              height={((AISLE_BOTTOM - AISLE_TOP) / 100) * 38}
              rx="1"
              fill={isTarget ? 'var(--live-ink)' : 'var(--primary)'}
              opacity={isTarget ? 0.22 : 0.14}
            />
          )
        })}

        {/* Walkway the reader follows before turning into the aisle */}
        <line
          x1="0"
          y1={(WALKWAY_Y / 100) * 38}
          x2="100"
          y2={(WALKWAY_Y / 100) * 38}
          stroke="var(--rule)"
          strokeWidth="0.4"
        />

        {/* Route: along the walkway, then up into the target aisle */}
        <polyline
          points={[
            `${KIOSK_X},${(WALKWAY_Y / 100) * 38}`,
            `${targetX},${(WALKWAY_Y / 100) * 38}`,
            `${targetX},${(targetY / 100) * 38}`,
          ].join(' ')}
          fill="none"
          stroke="var(--primary)"
          // Rendered in px thanks to non-scaling-stroke — thick enough to follow at a
          // glance, and to stay visible for a reader with low vision.
          strokeWidth="3"
          strokeDasharray="7 5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Pins and labels as HTML so the text can never outgrow its plate */}
      <Marker x={KIOSK_X} y={WALKWAY_Y} label="Kiosk" tone="start" />
      <Marker x={targetX} y={targetY} label={`Kệ ${location.shelfCode}`} tone="end" />
    </div>
  )
}

function Marker({
  x,
  y,
  label,
  tone,
}: {
  x: number
  y: number
  label: string
  tone: 'start' | 'end'
}) {
  const isStart = tone === 'start'
  const Icon = isStart ? MapPin : Book
  const bg = isStart ? 'var(--primary)' : 'var(--live-ink)'

  /**
   * A pin low on the plan hangs its label off the bottom edge. The kiosk never showed it —
   * at 1280px wide the map is ~490px tall and the walkway marker at 82% still has room
   * underneath — but the same map in a phone column is ~150px tall, and "Kiosk" was cut in
   * half. Below 70% the label goes under the pin; below that it goes above it.
   */
  const labelAbove = y > 70

  /*
   * The pin is centred on (x, y); the label is positioned off the pin. The two used to be
   * one centred stack, which put the *pair's* midpoint on the coordinate and left the pin
   * itself sitting half a label below where the route line ends — invisible on a 490px
   * kiosk map, obvious once the same map is 150px tall on a phone and the pin drops
   * through the bottom edge.
   */
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        <span
          className="grid size-9 place-items-center rounded-full text-white shadow-[var(--lift-2)]"
          style={{ backgroundColor: bg }}
        >
          <Icon className="size-4.5" strokeWidth={2.5} aria-hidden />
        </span>
        <span
          className={cn(
            'absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[6px] px-2 py-0.5 font-heading font-bold text-white',
            labelAbove ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
          style={{ backgroundColor: bg, fontSize: 'var(--text-eyebrow)' }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
