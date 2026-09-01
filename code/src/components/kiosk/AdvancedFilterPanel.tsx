import { Check, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { LANGUAGE_LABEL, type Language } from '@/shared/types'
import {
  STOCK_LABEL,
  activeFilterCount,
  defaultFilters,
  type AdvancedFilters,
  type StockState,
  type YearBounds,
} from '@/lib/search'
import { cn } from '@/lib/utils'
import { RangeSlider } from './RangeSlider'

/**
 * Advanced filter popover — Figma 34:218, anchored to the "Bộ lọc nâng cao" button on
 * the results screen. Changes apply immediately so the grid behind it updates as the
 * user works; "Đặt lại" exists so nobody gets stranded behind a filter they forgot.
 */

const LANGUAGES: Language[] = ['vi', 'en']
const STOCK_STATES: StockState[] = ['available', 'out']

interface AdvancedFilterPanelProps {
  filters: AdvancedFilters
  /**
   * The catalogue's real publication span, from the library-status response.
   *
   * Passed in rather than imported: these were module constants computed from the whole
   * book list, and a slider whose ends do not match the data either hides books at one
   * end or offers years nothing was published in at the other.
   */
  years: YearBounds
  onChange: (filters: AdvancedFilters) => void
  onClose: () => void
}

export function AdvancedFilterPanel({
  filters,
  years,
  onChange,
  onClose,
}: AdvancedFilterPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape or on a tap outside — expected behaviour for a popover, and the
  // only way out for a keyboard user.
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onPointerDown(e: PointerEvent) {
      if (!panelRef.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [onClose])

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  const count = activeFilterCount(filters, years)

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Bộ lọc nâng cao"
      data-kiosk-surface
      // Capped and scrollable: the panel opens partway down a 900px kiosk screen, so it
      // must never run off the bottom edge where the controls become unreachable.
      className="absolute right-0 top-full z-30 mt-3 flex max-h-[34rem] w-[26rem] flex-col overflow-y-auto rounded-[8px] border border-[var(--rule)] bg-card p-5 shadow-[var(--lift-2)]"
    >
      <header className="flex items-center justify-between gap-4 pb-3">
        <h2
          className="font-heading font-bold text-foreground"
          style={{ fontSize: 'var(--text-title)' }}
        >
          Bộ lọc nâng cao
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bộ lọc nâng cao"
          className="grid size-10 place-items-center rounded-[8px] border border-[var(--rule)] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>

      <Section title="Năm xuất bản">
        <RangeSlider
          min={years.min}
          max={years.max}
          from={filters.yearFrom}
          to={filters.yearTo}
          labelFrom="Năm xuất bản từ"
          labelTo="Năm xuất bản đến"
          onChange={(yearFrom, yearTo) => onChange({ ...filters, yearFrom, yearTo })}
        />
      </Section>

      <Section title="Ngôn ngữ">
        {LANGUAGES.map((lang) => (
          <CheckRow
            key={lang}
            label={LANGUAGE_LABEL[lang]}
            checked={filters.languages.includes(lang)}
            onToggle={() => onChange({ ...filters, languages: toggle(filters.languages, lang) })}
          />
        ))}
      </Section>

      <Section title="Tình trạng" last>
        {STOCK_STATES.map((state) => (
          <CheckRow
            key={state}
            label={STOCK_LABEL[state]}
            checked={filters.stock.includes(state)}
            onToggle={() => onChange({ ...filters, stock: toggle(filters.stock, state) })}
          />
        ))}
      </Section>

      {/* Pinned: "Đặt lại" must stay reachable even when the panel scrolls. */}
      <footer className="sticky bottom-0 mt-auto flex items-center justify-between gap-4 border-t border-[var(--rule)] bg-card pt-3">
        <p className="text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
          {count === 0 ? 'Chưa áp bộ lọc nào' : `Đang áp ${count} bộ lọc`}
        </p>
        <button
          type="button"
          onClick={() => onChange(defaultFilters(years))}
          disabled={count === 0}
          className="min-h-[var(--touch-min)] rounded-[8px] border border-[var(--rule)] px-5 font-heading font-semibold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontSize: 'var(--text-meta)' }}
        >
          Đặt lại
        </button>
      </footer>
    </div>
  )
}

function Section({
  title,
  children,
  last = false,
}: {
  title: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <section
      className={cn('flex flex-col gap-2 py-3', !last && 'border-b border-[var(--rule)]')}
    >
      <h3
        className="font-heading font-bold uppercase tracking-[0.14em] text-muted-foreground"
        style={{ fontSize: 'var(--text-eyebrow)' }}
      >
        {title}
      </h3>
      {children}
    </section>
  )
}

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <label className="flex min-h-[var(--touch-min)] cursor-pointer items-center gap-3">
      <input type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-[6px] border-2 transition-colors',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ring)]',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-[var(--rule)]',
        )}
      >
        {checked && <Check className="size-5" strokeWidth={3} />}
      </span>
      <span className="text-foreground" style={{ fontSize: 'var(--text-body)' }}>
        {label}
      </span>
    </label>
  )
}
