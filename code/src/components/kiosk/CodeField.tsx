import { AlertCircle } from 'lucide-react'
import type { FormEvent } from 'react'

/**
 * Manual code entry beside the scanner — Figma SearchRow in kiosk-book-scan-step1
 * (20:366) and step2 (24:72), plus the error line from the fail frame (39:82).
 *
 * Digits only, and never a native keyboard: the numeric keypad next to it is the input
 * device on a touchscreen kiosk.
 */

interface CodeFieldProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  label: string
  placeholder: string
  /** Shown under the field and announced; the reader is mid-task and must not miss it. */
  error?: string | null
}

export function CodeField({
  value,
  onChange,
  onSubmit,
  label,
  placeholder,
  error,
}: CodeFieldProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label
        htmlFor="kiosk-code-field"
        className="font-heading font-semibold text-foreground"
        style={{ fontSize: 'var(--text-meta)' }}
      >
        {label}
      </label>

      <div
        data-kiosk-surface
        className="flex items-center rounded-2xl border-2 border-[var(--rule)] bg-card px-6 transition-shadow focus-within:border-primary focus-within:shadow-[0_0_0_4px_rgb(29_78_216/18%)]"
      >
        <input
          id="kiosk-code-field"
          data-inner-focus
          value={value}
          inputMode="numeric"
          // eslint-disable-next-line jsx-a11y/no-autofocus -- kiosk: the numeric keypad
          // beside this field is useless unless the caret is already here.
          autoFocus
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'kiosk-code-error' : undefined}
          className="min-h-16 w-full bg-transparent font-heading tabular-nums tracking-wider text-foreground outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-[var(--ink-faint)]"
          style={{ fontSize: 'var(--text-field)' }}
        />
      </div>

      {/* The region exists even when empty so a screen reader announces the change. */}
      <p
        id="kiosk-code-error"
        role="alert"
        className="flex min-h-6 items-start gap-2 font-heading font-semibold text-[var(--destructive)]"
        style={{ fontSize: 'var(--text-eyebrow)' }}
      >
        {error && (
          <>
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </>
        )}
      </p>
    </form>
  )
}
