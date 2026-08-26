import { BookOpen, Contrast, House } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAccessibilityStore } from '@/state/useAccessibilityStore'
import { cn } from '@/lib/utils'

// Kiosk chrome shared by every /kiosk/* screen. Mirrors the KioskHeader frame in Figma
// (5:716) plus the accessibility toggle required by Product/Service 5, which the
// prototype did not yet include.

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
      className="flex items-center justify-between gap-6 border-b border-[var(--rule)] bg-card px-10 py-4"
    >
      {/* Brand */}
      <div className="flex items-center gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
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
            className="font-semibold text-[var(--live-ink)]"
            style={{ fontSize: 'var(--text-meta)' }}
          >
            Kiosk số #04 • ĐH Khoa học Tự nhiên
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
        <LanguageSwitch />

        <button
          type="button"
          onClick={toggleA11y}
          aria-pressed={a11yEnabled}
          title="Chế độ trợ năng: chữ lớn, tương phản cao"
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border px-4 font-semibold transition-colors',
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
          className="grid size-[var(--touch-min)] place-items-center rounded-xl border border-[var(--rule)] bg-secondary text-foreground transition-colors hover:bg-[var(--rule)]"
        >
          <House className="size-5" aria-hidden />
        </button>
      </div>
    </header>
  )
}

function LanguageSwitch() {
  // Visual-only for now — i18n is not in scope of the value proposition.
  return (
    <div
      className="flex items-center rounded-xl bg-secondary p-1"
      role="group"
      aria-label="Ngôn ngữ"
    >
      {(['VI', 'EN'] as const).map((lang, i) => (
        <button
          key={lang}
          type="button"
          aria-pressed={i === 0}
          className={cn(
            'min-h-10 rounded-lg px-4 font-semibold transition-colors',
            i === 0 ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
          style={{ fontSize: 'var(--text-meta)' }}
        >
          {lang}
        </button>
      ))}
    </div>
  )
}
