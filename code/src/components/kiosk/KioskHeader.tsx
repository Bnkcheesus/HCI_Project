import { BookOpen, Contrast, House } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAccessibilityStore } from '@/state/useAccessibilityStore'
import { cn } from '@/lib/utils'

// Kiosk chrome shared by every /kiosk/* screen. Follows the KioskHeader frame in Figma
// (5:716), with two deliberate departures from it:
//
//   - the accessibility toggle is added, because Product/Service 5 requires it and the
//     prototype did not include one;
//   - the frame's VI/EN switch is dropped. It was drawn but never wired to anything, and
//     i18n is nowhere in the value proposition — a control that does nothing when pressed
//     is worse than an absent one, especially on a kiosk where a stranger tries it once
//     and concludes the machine is broken.

interface KioskHeaderProps {
  /** Short label for where the user currently is, shown next to the live dot. */
  statusLabel: string
}

export function KioskHeader({ statusLabel }: KioskHeaderProps) {
  const navigate = useNavigate()
  const a11yEnabled = useAccessibilityStore((s) => s.enabled)
  const toggleA11y = useAccessibilityStore((s) => s.toggle)

  return (
    <header
      data-kiosk-surface
      // Chrome, not content: a step down from the page ground marks the parts that belong
      // to the machine, leaving white for the library's own material.
      className="flex shrink-0 items-center justify-between gap-6 border-b border-[var(--rule)] bg-[var(--chrome)] px-10 py-4"
    >
      {/* Brand */}
      <div className="flex items-center gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-[8px] bg-primary text-primary-foreground">
          <BookOpen className="size-6" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="leading-tight">
          <p
            className="font-heading font-extrabold tracking-tight text-foreground"
            style={{ fontSize: 'var(--text-brand)' }}
          >
            LibAssist
          </p>
          <p
            className="font-semibold text-[var(--ink)]"
            style={{ fontSize: 'var(--text-meta)' }}
          >
            Kiosk số 04 • ĐH Khoa học Tự nhiên
          </p>
        </div>
      </div>

      {/* Live status */}
      <div className="flex items-center gap-3">
        <span
          className="kiosk-pulse size-2.5 shrink-0 rounded-full bg-[var(--live)]"
          aria-hidden
        />
        <p
          className="font-semibold text-muted-foreground"
          style={{ fontSize: 'var(--text-body)' }}
        >
          {statusLabel}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleA11y}
          aria-pressed={a11yEnabled}
          title="Chế độ trợ năng: chữ lớn, tương phản cao"
          className={cn(
            'inline-flex items-center gap-2 rounded-[8px] border px-4 font-semibold transition-colors',
            'min-h-[var(--touch-min)]',
            a11yEnabled
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-[var(--rule)] bg-secondary text-foreground hover:bg-[var(--rule)]',
          )}
          style={{ fontSize: 'var(--text-meta)' }}
        >
          <Contrast className="size-5" aria-hidden />
          Trợ năng
        </button>

        <button
          type="button"
          onClick={() => navigate('/kiosk', { viewTransition: true })}
          aria-label="Về trang chủ"
          className="grid size-[var(--touch-min)] place-items-center rounded-[8px] border border-[var(--rule)] bg-secondary text-foreground transition-colors hover:bg-[var(--rule)]"
        >
          <House className="size-5" aria-hidden />
        </button>
      </div>
    </header>
  )
}
