import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Page } from '@/lib/search'
import { cn } from '@/lib/utils'

// Figma PaginationRow (5:868). Page buttons meet the 48px kiosk touch floor.

interface PaginationProps {
  page: Page<unknown>
  onChange: (page: number) => void
}

export function Pagination({ page, onChange }: PaginationProps) {
  const pages = Array.from({ length: page.pageCount }, (_, i) => i + 1)

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--rule)] pt-4"
      aria-label="Phân trang kết quả"
    >
      <p className="text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
        Hiển thị {page.from}–{page.to} trong {page.total} kết quả
      </p>

      {page.pageCount > 1 && (
        <div className="flex items-center gap-2">
          <PageButton
            onClick={() => onChange(page.page - 1)}
            disabled={page.page === 1}
            ariaLabel="Trang trước"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </PageButton>

          {pages.map((n) => (
            <PageButton
              key={n}
              onClick={() => onChange(n)}
              active={n === page.page}
              ariaLabel={`Trang ${n}`}
              ariaCurrent={n === page.page}
            >
              {n}
            </PageButton>
          ))}

          <PageButton
            onClick={() => onChange(page.page + 1)}
            disabled={page.page === page.pageCount}
            ariaLabel="Trang sau"
          >
            <ChevronRight className="size-5" aria-hidden />
          </PageButton>
        </div>
      )}
    </nav>
  )
}

interface PageButtonProps {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  ariaLabel: string
  ariaCurrent?: boolean
}

function PageButton({
  children,
  onClick,
  active = false,
  disabled = false,
  ariaLabel,
  ariaCurrent = false,
}: PageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent ? 'page' : undefined}
      className={cn(
        'grid size-[var(--touch-min)] place-items-center rounded-xl font-heading font-semibold transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'border border-[var(--rule)] bg-card text-foreground hover:bg-secondary',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-card',
      )}
      style={{ fontSize: 'var(--text-meta)' }}
    >
      {children}
    </button>
  )
}
