import { create } from 'zustand'
import { askLibrarian } from '@/lib/librarian'

/**
 * Conversation state for the AI librarian — Gain Creator 1 / Product-Service 1,
 * kiosk-ai-chat (Figma 5:779).
 *
 * Lives in a store rather than the page so the transcript survives a detour: the
 * assistant suggests books, the reader taps one to open its detail screen, then comes
 * back — and the conversation is still there. Losing it would force them to re-type the
 * whole question on an on-screen keyboard.
 */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Ids of the books this reply surfaced, rendered in the side panel. */
  bookIds: string[]
}

/** How long the assistant "thinks" before answering. */
export const THINKING_MS = 650

let messageSeq = 0
function nextId(): string {
  messageSeq += 1
  return `m${messageSeq}`
}

interface ChatState {
  messages: ChatMessage[]
  /** True between the question landing and the reply appearing. */
  isThinking: boolean
  ask: (question: string) => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isThinking: false,

  ask: (question) => {
    const text = question.trim()
    // Ignore an empty submit, and a second question fired while one is still in flight —
    // otherwise two pending timers race and the replies interleave.
    if (!text || get().isThinking) return

    set((s) => ({
      messages: [...s.messages, { id: nextId(), role: 'user', text, bookIds: [] }],
      isThinking: true,
    }))

    // The pause is deliberate, not fake latency for its own sake: an answer that appears
    // in the same frame as the question reads as a canned form response, and it gives
    // the aria-live region a distinct change for a screen reader to announce.
    setTimeout(() => {
      const reply = askLibrarian(text)
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: nextId(),
            role: 'assistant',
            text: reply.text,
            bookIds: reply.books.map((b) => b.id),
          },
        ],
        isThinking: false,
      }))
    }, THINKING_MS)
  },

  reset: () => set({ messages: [], isThinking: false }),
}))
