import { Delete } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Numeric keypad for entering an ISBN or a card number by hand — Figma NumericKeypad in
 * kiosk-book-scan-step1 (20:366) and step2 (24:72).
 *
 * It is the fallback path, not a lesser one: a worn barcode or a scratched card is
 * exactly when a reader must not be sent to the desk (Pain 3 — không muốn xếp hàng).
 */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

interface NumericKeypadProps {
  onKey: (digit: string) => void
  onBackspace: () => void
  onSubmit: () => void
  submitLabel?: string
  submitDisabled?: boolean
}

export function NumericKeypad({
  onKey,
  onBackspace,
  onSubmit,
  submitLabel = 'OK',
  submitDisabled = false,
}: NumericKeypadProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5" role="group" aria-label="Bàn phím số">
      {KEYS.map((key) => (
        <PadKey key={key} onPress={() => onKey(key)}>
          {key}
        </PadKey>
      ))}

      <PadKey onPress={onBackspace} ariaLabel="Xoá một chữ số" variant="modifier">
        <Delete className="size-6" aria-hidden />
      </PadKey>

      <PadKey onPress={() => onKey('0')}>0</PadKey>

      <PadKey onPress={onSubmit} variant="submit" disabled={submitDisabled} ariaLabel={submitLabel}>
        {submitLabel}
      </PadKey>
    </div>
  )
}

function PadKey({
  children,
  onPress,
  ariaLabel,
  variant = 'default',
  disabled = false,
}: {
  children: React.ReactNode
  onPress: () => void
  ariaLabel?: string
  variant?: 'default' | 'modifier' | 'submit'
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      // Keep the caret in the code field, same trick as the letter keyboard.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'flex min-h-16 items-center justify-center rounded-xl font-heading font-bold transition-all active:scale-95',
        variant === 'default' && 'bg-secondary text-foreground hover:bg-[var(--rule)]',
        variant === 'modifier' &&
          'bg-[var(--key-modifier-bg)] text-[var(--key-modifier-ink)] hover:brightness-125',
        variant === 'submit' &&
          'bg-primary text-primary-foreground hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40',
      )}
      style={{ fontSize: 'var(--text-tab)' }}
    >
      {children}
    </button>
  )
}
