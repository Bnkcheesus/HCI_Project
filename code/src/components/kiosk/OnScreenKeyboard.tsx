import { ArrowBigUp, ChevronsLeft, ChevronsRight, Delete, Search, StretchHorizontal } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useKeyboardStore, type KeyboardLayout } from '@/state/useKeyboardStore'

/**
 * Kiosk on-screen keyboard — Figma KeyboardSection (12:69).
 * Plain QWERTY; Vietnamese tones are produced by the Telex engine in lib/telex.ts,
 * so no diacritic keys are needed (typing "sachs" yields "sách").
 */

const ROW_1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']
const ROW_2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l']
const ROW_3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm']
const NUM_ROW_1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const NUM_ROW_2 = ['-', '_', ':', ';', '(', ')', '.', ',', '?']
const NUM_ROW_3 = ['/', '&', '@', '"', "'", '+', '=']

interface OnScreenKeyboardProps {
  onKey: (key: string) => void
  onBackspace: () => void
  onSubmit: () => void
  /**
   * Wording on the enter key. Defaults to the search screen's "Tìm kiếm"; the AI chat
   * passes "Gửi", because a key labelled "Tìm kiếm" that actually sends a chat message
   * tells the reader the wrong thing about what is going to happen.
   */
  submitLabel?: string
  submitIcon?: typeof Search
}

const LAYOUT_CLASS: Record<KeyboardLayout, string> = {
  full: 'max-w-[1200px] mx-auto',
  left: 'max-w-[64%] mr-auto',
  right: 'max-w-[64%] ml-auto',
}

export function OnScreenKeyboard({
  onKey,
  onBackspace,
  onSubmit,
  submitLabel = 'Tìm kiếm',
  submitIcon: SubmitIcon = Search,
}: OnScreenKeyboardProps) {
  const [shift, setShift] = useState(false)
  const [numeric, setNumeric] = useState(false)
  const layout = useKeyboardStore((s) => s.layout)

  const [row1, row2, row3] = numeric
    ? [NUM_ROW_1, NUM_ROW_2, NUM_ROW_3]
    : [ROW_1, ROW_2, ROW_3]

  function press(key: string) {
    onKey(shift && !numeric ? key.toUpperCase() : key)
    if (shift) setShift(false)
  }

  return (
    <div
      data-kiosk-surface
      className="border-t border-[var(--rule)] bg-card px-10 py-5"
      role="group"
      aria-label="Bàn phím ảo"
      // Slides up as the search bar docks — see the View Transition rules in tokens.css.
      style={{ viewTransitionName: 'kiosk-keyboard' }}
    >
      <div className={cn('flex flex-col gap-2.5 transition-[max-width] duration-300', LAYOUT_CLASS[layout])}>
        <LayoutControls />
        <div className="flex gap-2">
          {row1.map((k) => (
            <Key key={k} label={shift && !numeric ? k.toUpperCase() : k} onPress={() => press(k)} />
          ))}
        </div>

        <div className="flex gap-2 px-[3%]">
          {row2.map((k) => (
            <Key key={k} label={shift && !numeric ? k.toUpperCase() : k} onPress={() => press(k)} />
          ))}
        </div>

        <div className="flex gap-2">
          <Key
            label={<ArrowBigUp className="size-6" aria-hidden />}
            ariaLabel="Phím Shift"
            variant={shift ? 'active' : 'modifier'}
            onPress={() => setShift((s) => !s)}
            className="basis-[9%]"
          />
          {row3.map((k) => (
            <Key key={k} label={shift && !numeric ? k.toUpperCase() : k} onPress={() => press(k)} />
          ))}
          <Key
            label={<Delete className="size-6" aria-hidden />}
            ariaLabel="Xoá ký tự"
            variant="modifier"
            onPress={onBackspace}
            className="basis-[9%]"
          />
        </div>

        <div className="flex gap-2">
          <Key
            label={numeric ? 'ABC' : '123'}
            ariaLabel={numeric ? 'Chuyển sang chữ cái' : 'Chuyển sang số và ký hiệu'}
            variant="modifier"
            onPress={() => setNumeric((n) => !n)}
            className="basis-[11%]"
          />
          <Key label="Khoảng trắng" ariaLabel="Phím cách" variant="space" onPress={() => onKey(' ')} />
          <Key
            label={
              <span className="inline-flex items-center gap-2">
                <SubmitIcon className="size-5" aria-hidden />
                {submitLabel}
              </span>
            }
            ariaLabel={submitLabel}
            variant="submit"
            onPress={onSubmit}
            className="basis-[15%]"
          />
        </div>
      </div>
    </div>
  )
}

const LAYOUT_OPTIONS: { id: KeyboardLayout; icon: typeof ChevronsLeft; label: string }[] = [
  { id: 'left', icon: ChevronsLeft, label: 'Thu bàn phím sang trái' },
  { id: 'full', icon: StretchHorizontal, label: 'Bàn phím toàn chiều rộng' },
  { id: 'right', icon: ChevronsRight, label: 'Thu bàn phím sang phải' },
]

/** Lets the user pull the keyboard to whichever hand they are using. */
function LayoutControls() {
  const layout = useKeyboardStore((s) => s.layout)
  const setLayout = useKeyboardStore((s) => s.setLayout)

  return (
    <div className="flex items-center justify-end gap-2 pb-0.5">
      <span className="text-muted-foreground" style={{ fontSize: 'var(--text-eyebrow)' }}>
        Vị trí bàn phím
      </span>
      <div className="flex items-center gap-1 rounded-xl bg-secondary p-1" role="group">
        {LAYOUT_OPTIONS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setLayout(id)}
            aria-pressed={layout === id}
            aria-label={label}
            title={label}
            className={cn(
              'grid size-10 place-items-center rounded-lg transition-colors',
              layout === id
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-5" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  )
}

interface KeyProps {
  label: React.ReactNode
  ariaLabel?: string
  variant?: 'default' | 'modifier' | 'space' | 'submit' | 'active'
  onPress: () => void
  className?: string
}

function Key({ label, ariaLabel, variant = 'default', onPress, className }: KeyProps) {
  return (
    <button
      type="button"
      // Keep focus (and the blinking caret) in the search field: preventing the default
      // mousedown stops the key from taking focus, while click still fires. Tab-focus
      // for keyboard users is unaffected.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      aria-label={ariaLabel}
      className={cn(
        'flex min-h-[var(--touch-min)] flex-1 items-center justify-center rounded-xl font-heading font-semibold transition-all active:scale-95',
        variant === 'default' && 'bg-secondary text-foreground hover:bg-[var(--rule)]',
        variant === 'modifier' &&
          'bg-[var(--key-modifier-bg)] text-[var(--key-modifier-ink)] hover:brightness-125',
        variant === 'active' && 'bg-primary text-primary-foreground',
        variant === 'space' &&
          'border border-[var(--rule)] bg-card text-muted-foreground hover:bg-secondary',
        variant === 'submit' &&
          'bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_rgb(29_78_216/55%)] hover:brightness-110',
        className,
      )}
      style={{ fontSize: 'var(--text-body)' }}
    >
      {label}
    </button>
  )
}
