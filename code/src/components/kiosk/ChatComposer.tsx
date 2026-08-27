import { Mic, MicOff, SendHorizontal } from 'lucide-react'
import type { FormEvent, KeyboardEvent } from 'react'
import { applyTelexKey } from '@/lib/telex'
import { cn } from '@/lib/utils'

/**
 * Question box for the AI librarian — Figma ChatComposer in kiosk-ai-chat (5:779):
 * text field, voice button, send button.
 *
 * Deliberately not `SearchField`: that one morphs between the home and search screens
 * via a shared View Transition name and submits into the results route. Reusing it here
 * would drag a second element claiming the same transition name onto an unrelated
 * screen. The Telex key handling is the part worth sharing, and that already lives in
 * `lib/telex.ts`.
 */

interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  /** Blocks send while the assistant is still answering the previous question. */
  disabled?: boolean
  voiceSupported?: boolean
  voiceListening?: boolean
  onVoiceToggle?: () => void
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  voiceSupported = false,
  voiceListening = false,
  onVoiceToggle,
}: ChatComposerProps) {
  const showVoice = voiceSupported && onVoiceToggle !== undefined
  const canSend = value.trim().length > 0 && !disabled

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (canSend) onSubmit()
  }

  // Same Telex routing as the search field, so "sachs" becomes "sách" on a physical
  // keyboard too. See SearchField for why composing events must be left alone.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key.length !== 1 || !/[a-zA-Z]/.test(event.key)) return

    const input = event.currentTarget
    const atEnd = input.selectionStart === value.length && input.selectionEnd === value.length
    if (!atEnd) return

    event.preventDefault()
    onChange(applyTelexKey(value, event.key))
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4">
      <div
        data-kiosk-surface
        className="flex flex-1 items-center rounded-[6px] border border-[var(--sunken)] bg-card px-6 shadow-[var(--field-shadow)] transition-shadow focus-within:border-primary focus-within:shadow-[var(--field-shadow),0_0_0_3px_rgb(27_95_191/28%)]"
      >
        <input
          type="text"
          data-inner-focus
          value={value}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- kiosk: asking is the only
          // task on this screen, and the on-screen keyboard is useless without focus.
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Hỏi tôi bất cứ điều gì về sách, vị trí phòng đọc hoặc cách gia hạn thẻ..."
          aria-label="Câu hỏi cho trợ lý LibAssist"
          className="min-h-16 w-full bg-transparent text-foreground outline-none placeholder:text-[var(--ink-faint)]"
          style={{ fontSize: 'var(--text-field)' }}
        />
      </div>

      {showVoice && (
        <button
          type="button"
          // Keep the caret in the field while toggling, same trick as the on-screen keys.
          onMouseDown={(e) => e.preventDefault()}
          onClick={onVoiceToggle}
          aria-pressed={voiceListening}
          aria-label={voiceListening ? 'Dừng nghe' : 'Hỏi bằng giọng nói'}
          title={voiceListening ? 'Dừng nghe' : 'Hỏi bằng giọng nói'}
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

      <button
        type="submit"
        disabled={!canSend}
        aria-label="Gửi câu hỏi"
        title="Gửi câu hỏi"
        className="grid size-16 shrink-0 place-items-center rounded-full bg-[var(--live-ink)] text-white shadow-[var(--btn-shadow)] transition-[background,box-shadow] duration-150 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none disabled:hover:scale-100"
      >
        <SendHorizontal className="size-6" aria-hidden />
      </button>
    </form>
  )
}
