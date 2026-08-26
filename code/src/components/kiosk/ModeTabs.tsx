import { cn } from '@/lib/utils'

// The two top-level kiosk modes, from the FilterRow/Tabs frame in Figma (16:377).
// "Tìm sách thông minh" -> Product/Service 1, "Mượn sách" -> Product/Service 3.

export type KioskMode = 'search' | 'borrow'

interface ModeTabsProps {
  value: KioskMode
  onChange: (mode: KioskMode) => void
}

const MODES: { id: KioskMode; label: string }[] = [
  { id: 'search', label: 'Tìm sách thông minh' },
  { id: 'borrow', label: 'Mượn sách' },
]

export function ModeTabs({ value, onChange }: ModeTabsProps) {
  return (
    <div role="tablist" aria-label="Chế độ sử dụng kiosk" className="flex flex-wrap gap-3">
      {MODES.map((mode) => {
        const active = mode.id === value
        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode.id)}
            className={cn(
              'rounded-full px-8 font-heading font-bold transition-all duration-200',
              'min-h-14',
              active
                ? 'bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_rgb(29_78_216/55%)]'
                : 'border border-[var(--rule)] bg-card text-foreground hover:border-primary/40 hover:text-primary',
            )}
            style={{ fontSize: 'var(--text-tab)' }}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}
