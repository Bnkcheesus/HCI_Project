import { Mic, MicOff, Search } from 'lucide-react'
import type { FormEvent, KeyboardEvent } from 'react'
import { applyTelexKey } from '@/lib/telex'
import { cn } from '@/lib/utils'

// Search entry point — Job 1 / Pain Reliever 1 / Product-Service 1.
// From the SearchRow frame in Figma (10:38). The voice button is the prototype's
// VoiceButton (5:...); it is a visual affordance here, wired when the search screen lands.

/**
 * Shared-element name. The same field exists on the home screen (mid-page) and the
 * search screen (docked above the keyboard); tagging both lets the browser morph one
 * into the other during a View Transition instead of hard-cutting between routes.
 */
export const SEARCH_FIELD_TRANSITION = 'kiosk-search-field'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  /**
   * When set, the field acts as a launcher rather than a real input: tapping it hands
   * off to the search screen (where the on-screen keyboard lives) instead of typing
   * in place. Used on the home screen.
   */
  onActivate?: () => void
  /** Focus the field on mount so the caret is already blinking when the screen lands. */
  autoFocus?: boolean
  /** False hides the mic entirely — a dead button is worse than no button. */
  voiceSupported?: boolean
  voiceListening?: boolean
  onVoiceToggle?: () => void
}

export function SearchField({
  value,
  onChange,
  onSubmit,
  onActivate,
  autoFocus = false,
  voiceSupported = false,
  voiceListening = false,
  onVoiceToggle,
}: SearchFieldProps) {
  const isLauncher = onActivate !== undefined
  const showVoice = voiceSupported && onVoiceToggle !== undefined

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (isLauncher) onActivate()
    else onSubmit()
  }

  // Route physical-keyboard letters through the same Telex engine the on-screen
  // keyboard uses, so typing "sachs" produces "sách" either way. The kiosk only ever
  // appends at the end of the field, so intercepting the keystroke is safe here.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return

    // Stand down while an OS-level IME is composing (Unikey, macOS Vietnamese, etc.).
    // Otherwise the IME inserts a character and this handler inserts another, and every
    // keystroke lands twice.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return

    if (event.key.length !== 1 || !/[a-zA-Z]/.test(event.key)) return

    const input = event.currentTarget
    const atEnd = input.selectionStart === value.length && input.selectionEnd === value.length
    if (!atEnd) return

    event.preventDefault()
    onChange(applyTelexKey(value, event.key))
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-4"
      role="search"
      style={{ viewTransitionName: SEARCH_FIELD_TRANSITION }}
    >
      <div
        data-kiosk-surface
        className="flex flex-1 items-center gap-4 rounded-[6px] border border-[var(--sunken)] bg-card px-6 shadow-[var(--field-shadow)] transition-shadow focus-within:border-primary focus-within:shadow-[var(--field-shadow),0_0_0_3px_rgb(27_95_191/28%)]"
      >
        <Search className="size-6 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          // The wrapper draws the focus ring via focus-within; opt this input out of the
          // global one so they don't stack.
          data-inner-focus
          value={value}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- kiosk: typing is the only
          // task on this screen, and the on-screen keyboard is useless without focus.
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={isLauncher ? undefined : handleKeyDown}
          readOnly={isLauncher}
          onFocus={isLauncher ? onActivate : undefined}
          onClick={isLauncher ? onActivate : undefined}
          placeholder="Nhập tên sách, tác giả hoặc mã ISBN..."
          aria-label="Tìm sách theo tên, tác giả hoặc mã ISBN"
          className={`min-h-16 w-full bg-transparent text-foreground outline-none placeholder:text-[var(--ink-faint)] ${
            isLauncher ? 'cursor-pointer' : ''
          }`}
          style={{ fontSize: 'var(--text-field)' }}
        />
      </div>

      {/* The mic is its own action: on the home screen it must hand off *and* start
          listening, so it never routes through onActivate like the field does. */}
      {showVoice && (
        <button
          type="button"
          // Keep the caret in the field while toggling, same trick as the on-screen keys.
          onMouseDown={(e) => e.preventDefault()}
          onClick={onVoiceToggle}
          aria-pressed={voiceListening}
          aria-label={voiceListening ? 'Dừng nghe' : 'Tìm bằng giọng nói'}
          title={voiceListening ? 'Dừng nghe' : 'Tìm bằng giọng nói'}
          className={cn(
            'grid size-16 shrink-0 place-items-center rounded-full text-white transition-[background,box-shadow] duration-150 active:brightness-95',
            voiceListening
              ? 'bg-[var(--destructive)] shadow-[var(--btn-shadow)]'
              : 'bg-primary shadow-[var(--btn-shadow)]',
          )}
        >
          {voiceListening ? (
            <MicOff className="kiosk-pulse size-6" aria-hidden />
          ) : (
            <Mic className="size-6" aria-hidden />
          )}
        </button>
      )}
    </form>
  )
}
