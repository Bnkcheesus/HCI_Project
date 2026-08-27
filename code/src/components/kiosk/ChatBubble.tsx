import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/state/useChatStore'

/**
 * One turn of the conversation — Figma ChatHistory rows in kiosk-ai-chat (5:779).
 * The reader's own message is a filled primary bubble on the right; the assistant's is
 * a bordered card on the left behind a green sparkle avatar, matching the prototype.
 */

interface ChatBubbleProps {
  message: ChatMessage
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex items-start gap-4', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && <AssistantAvatar />}

      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-6 py-4',
          isUser
            ? 'bg-primary text-primary-foreground shadow-[0_6px_20px_-8px_rgb(29_78_216/45%)]'
            : 'border border-[var(--rule)] bg-card text-foreground',
        )}
        style={{ fontSize: 'var(--text-body)' }}
      >
        {/* Screen readers otherwise announce a wall of text with no idea who is speaking. */}
        <span className="sr-only">{isUser ? 'Bạn nói: ' : 'Trợ lý trả lời: '}</span>
        <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
      </div>
    </div>
  )
}

/** The assistant is still composing — Figma has no such state, but a silent gap after
 *  sending reads as a broken kiosk. */
export function ThinkingBubble() {
  return (
    <div className="flex items-start gap-4">
      <AssistantAvatar />
      <div
        className="flex items-center gap-2 rounded-2xl border border-[var(--rule)] bg-card px-6 py-5"
        aria-label="Trợ lý đang soạn câu trả lời"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2.5 animate-bounce rounded-full bg-[var(--ink-soft)]"
            style={{ animationDelay: `${i * 140}ms` }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  )
}

function AssistantAvatar() {
  return (
    <div
      className="grid size-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--live)_16%,transparent)] text-[var(--live-ink)]"
      aria-hidden
    >
      <Sparkles className="size-5" strokeWidth={2.25} />
    </div>
  )
}
