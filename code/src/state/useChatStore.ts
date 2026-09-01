import { create } from 'zustand'
import { apiPost } from '@/api/client'

/**
 * Conversation state for the AI librarian — Gain Creator 1 / Product-Service 1,
 * kiosk-ai-chat (Figma 5:779).
 *
 * Lives in a store rather than the page so the transcript survives a detour: the
 * assistant suggests books, the reader taps one to open its detail screen, then comes
 * back — and the conversation is still there. Losing it would force them to re-type the
 * whole question on an on-screen keyboard.
 *
 * The answer comes from `POST /api/librarian`. The matching engine itself is unchanged —
 * it is the same `askLibrarian` that used to run here — but it reasons over the whole
 * catalogue, and the browser no longer holds one. A store rather than a Query mutation
 * for the same reason as before: the transcript has to outlive the screen.
 */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Ids of the books this reply surfaced, rendered in the side panel. */
  bookIds: string[]
}

/**
 * The shortest the assistant is allowed to take.
 *
 * A floor, not a delay for its own sake. On a local network the reply comes back in a few
 * milliseconds, and an answer that appears in the same frame as the question reads as a
 * canned form response rather than as a reply. It also gives the `aria-live` region a
 * distinct change to announce — a screen reader that sees the question and the answer land
 * together announces neither properly.
 */
export const THINKING_MS = 650

let messageSeq = 0
function nextId(): string {
  messageSeq += 1
  return `m${messageSeq}`
}

interface LibrarianAnswer {
  intent: string
  text: string
  bookIds: string[]
}

interface ChatState {
  messages: ChatMessage[]
  /** True between the question landing and the reply appearing. */
  isThinking: boolean
  ask: (question: string) => Promise<void>
  reset: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isThinking: false,

  ask: async (question) => {
    const text = question.trim()
    // Ignore an empty submit, and a second question fired while one is still in flight —
    // otherwise two replies race and interleave in the transcript.
    if (!text || get().isThinking) return

    set((s) => ({
      messages: [...s.messages, { id: nextId(), role: 'user', text, bookIds: [] }],
      isThinking: true,
    }))

    // Both run together, so the floor and the request overlap rather than adding up.
    const [reply] = await Promise.all([
      apiPost<LibrarianAnswer>('/api/librarian', { question: text }).catch(
        (): LibrarianAnswer => ({
          intent: 'fallback',
          // A network failure still has to answer the reader in their own language, and
          // point at the thing that does work without the network: the kiosk's own search.
          text: 'Mình chưa kết nối được tới thư viện. Bạn thử lại sau giây lát, hoặc dùng ô tìm kiếm ở màn hình chính nhé.',
          bookIds: [],
        }),
      ),
      new Promise((resolve) => setTimeout(resolve, THINKING_MS)),
    ])

    set((s) => ({
      messages: [
        ...s.messages,
        { id: nextId(), role: 'assistant', text: reply.text, bookIds: reply.bookIds },
      ],
      isThinking: false,
    }))
  },

  reset: () => set({ messages: [], isThinking: false }),
}))
