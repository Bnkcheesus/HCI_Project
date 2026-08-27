import { SlidersHorizontal } from 'lucide-react'
import { DOCUMENT_TYPE_LABEL } from '@/mocks'
import { SORT_LABEL, type SortMode, type TypeFilter } from '@/lib/search'
import { cn } from '@/lib/utils'

/**
 * Filter/sort strip above the results grid — Figma FilterRow (5:889) plus the sort
 * control the prototype did not have. "Sách còn trước" exists because the persona's
 * worst outcome is walking to an empty shelf (Pain Reliever 2).
 */

const TYPE_ORDER: TypeFilter[] = ['all', 'book', 'journal', 'magazine']
const SORT_ORDER: SortMode[] = ['relevance', 'available', 'title']

interface ResultToolbarProps {
  counts: Record<TypeFilter, number>
  type: TypeFilter
  onTypeChange: (type: TypeFilter) => void
  sort: SortMode
  onSortChange: (sort: SortMode) => void
  onToggleAdvanced: () => void
  advancedOpen: boolean
  /** Number of advanced facets in use, surfaced on the button so it is visible when closed. */
  advancedCount: number
  /** The popover itself, rendered inside the button's positioning context. */
  advancedPanel?: React.ReactNode
}

export function ResultToolbar({
  counts,
  type,
  onTypeChange,
  sort,
  onSortChange,
  onToggleAdvanced,
  advancedOpen,
  advancedCount,
  advancedPanel,
}: ResultToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div role="tablist" aria-label="Lọc theo loại tài liệu" className="flex flex-wrap gap-2.5">
        {TYPE_ORDER.filter((t) => t === 'all' || counts[t] > 0).map((t) => {
          const active = t === type
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTypeChange(t)}
              className={cn(
                'min-h-[var(--touch-min)] rounded-[6px] px-5 font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-[var(--rule)] bg-card text-foreground hover:border-primary/40 hover:text-primary',
              )}
              style={{ fontSize: 'var(--text-meta)' }}
            >
              {t === 'all' ? 'Tất cả' : DOCUMENT_TYPE_LABEL[t]} ({counts[t]})
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label
          className="flex items-center gap-2 text-muted-foreground"
          style={{ fontSize: 'var(--text-meta)' }}
        >
          Sắp xếp
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
            className="min-h-[var(--touch-min)] rounded-[8px] border border-[var(--rule)] bg-card px-4 font-medium text-foreground"
            style={{ fontSize: 'var(--text-meta)' }}
          >
            {SORT_ORDER.map((mode) => (
              <option key={mode} value={mode}>
                {SORT_LABEL[mode]}
              </option>
            ))}
          </select>
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={onToggleAdvanced}
            aria-expanded={advancedOpen}
            className={cn(
              'inline-flex min-h-[var(--touch-min)] items-center gap-2 rounded-[8px] border px-5 font-heading font-semibold transition-colors',
              advancedOpen || advancedCount > 0
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-[var(--rule)] bg-card text-primary hover:bg-secondary',
            )}
            style={{ fontSize: 'var(--text-meta)' }}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Bộ lọc nâng cao
            {advancedCount > 0 && (
              <span className="grid size-6 place-items-center rounded-full bg-primary-foreground text-primary">
                {advancedCount}
              </span>
            )}
          </button>

          {advancedPanel}
        </div>
      </div>
    </div>
  )
}
