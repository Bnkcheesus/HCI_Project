// Implements Gain Creator 1 / Product-Service 1 — AI-suggested reading list by
// subject/keyword, conversational alternative to the plain search box.
// Figma frame: kiosk-ai-chat (5:779).
import { ArrowLeft, BookOpen, MapPin, SendHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatBubble, ThinkingBubble } from '@/components/kiosk/ChatBubble'
import { ChatComposer } from '@/components/kiosk/ChatComposer'
import { KioskFooter } from '@/components/kiosk/KioskFooter'
import { KioskHeader } from '@/components/kiosk/KioskHeader'
import { OnScreenKeyboard } from '@/components/kiosk/OnScreenKeyboard'
import { SuggestedBookRow } from '@/components/kiosk/SuggestedBookRow'
import { SUGGESTED_PROMPTS } from '@/shared/librarian'
import { applyTelexKey } from '@/lib/telex'
import { useSpeechSearch } from '@/lib/useSpeechSearch'
import { useBooksByIds } from '@/api/queries'
import type { ShelfLocation } from '@/shared/types'
import { useAccessibilityStore } from '@/state/useAccessibilityStore'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'
import { useChatStore } from '@/state/useChatStore'

const VOICE_MESSAGE = {
  listening: 'Đang nghe… hãy nói câu hỏi của bạn',
  denied: 'Chưa được cấp quyền micro. Dùng bàn phím bên dưới để nhập.',
  error: 'Không kết nối được dịch vụ nhận diện giọng nói. Dùng bàn phím bên dưới.',
  timeout: 'Không nhận được giọng nói. Vui lòng thử lại hoặc dùng bàn phím bên dưới.',
} as const

/** Shelf pins on the floor map, coloured off the spine palette so they stay distinct. */
const PIN_COLOR = ['var(--spine-1)', 'var(--spine-2)', 'var(--spine-3)', 'var(--spine-4)']

/** More pins than this and the legend stops summarising and starts repeating the list. */
const MAX_SHELF_PINS = 3

export function AiChatPage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')

  const messages = useChatStore((s) => s.messages)
  const isThinking = useChatStore((s) => s.isThinking)
  const ask = useChatStore((s) => s.ask)
  const resetChat = useChatStore((s) => s.reset)
  const selectBook = useBorrowSessionStore((s) => s.selectBook)

  // Where the caret goes once "Xoá hội thoại" removes itself from the screen.
  const composerRef = useRef<HTMLInputElement>(null)

  // Transcripts arrive already accented, so they go straight into the field — pushing
  // them through the Telex engine would read a trailing "s" as a tone mark.
  const speech = useSpeechSearch({ onFinal: setDraft })

  const fieldValue = speech.interim || draft

  // The side panel follows the most recent answer that actually found something, so it
  // does not blank out when the reader then asks about opening hours.
  const suggestedIds = useMemo(
    () => [...messages].reverse().find((m) => m.bookIds.length > 0)?.bookIds ?? [],
    [messages],
  )

  /*
   * The reply names book ids; the panel needs records. One request for the set, with the
   * shelves those books sit on — the legend below turns the list into a list of *places*,
   * which needs each shelf's zone and floor, not just its code.
   */
  const { data: suggested } = useBooksByIds(suggestedIds)
  const suggestedBooks = useMemo(() => suggested?.books ?? [], [suggested])

  /**
   * Distinct shelves to walk to, with how many of the suggested books sit on each. The
   * point of the legend is to collapse a list of books into a list of *places*; showing
   * every shelf one-per-book would just repeat the list below it, so it is capped and
   * the remainder is counted.
   */
  const shelves = useMemo(() => {
    const counts = new Map<string, number>()
    for (const book of suggestedBooks) {
      counts.set(book.shelfCode, (counts.get(book.shelfCode) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([code, count]) => ({ place: suggested?.shelves[code], count }))
      .filter((s): s is { place: ShelfLocation; count: number } => s.place !== undefined)
      .sort((a, b) => b.count - a.count)
  }, [suggestedBooks, suggested])

  const shownShelves = shelves.slice(0, MAX_SHELF_PINS)
  const hiddenShelves = shelves.length - shownShelves.length

  // Keep the newest turn in view — on a kiosk nobody thinks to scroll a chat log.
  // Accessibility mode is a dependency, not a coincidence: turning it on scales every
  // bubble up 25%, which pushes the latest answer back off the bottom of the box.
  const a11yEnabled = useAccessibilityStore((s) => s.enabled)
  const transcriptRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = transcriptRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isThinking, a11yEnabled])

  function send(question: string) {
    if (!question.trim() || isThinking) return
    if (speech.isListening) speech.stop()
    ask(question)
    setDraft('')
  }

  /**
   * Wipe the transcript — a kiosk is a shared machine, and the next reader should not walk
   * up to the previous one's questions still on screen.
   *
   * Only the conversation goes. A half-typed question in the composer is not part of it,
   * and taking that away as well would punish someone who tapped this while mid-sentence.
   *
   * The button is disabled while the assistant is answering, which is not cosmetic: `ask`
   * appends the reply to whatever `messages` holds when the request lands, so clearing
   * mid-flight would drop an answer into an empty transcript with no question above it.
   */
  function clearChat() {
    resetChat()
    // The button is about to unmount with the transcript. Without this, focus falls to
    // <body> and a keyboard or screen-reader user loses their place entirely.
    composerRef.current?.focus()
  }

  function openBook(bookId: string) {
    selectBook(bookId)
    navigate(`/kiosk/books/${bookId}`, { state: { from: '/kiosk/ai-chat' } })
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <KioskHeader statusLabel="Trợ lý LibAssist AI" />

      <main className="mx-auto grid w-full max-w-[1440px] min-h-0 flex-1 grid-cols-[minmax(0,1fr)_380px] gap-8 overflow-hidden px-10 pt-5">
        {/* Conversation column */}
        <div className="flex min-h-0 flex-col">
          {/* Only once there is something to clear: in the empty state the button would
              have nothing to act on, and the row it sits in would cost the centred promo
              below its vertical room for no reason. */}
          {messages.length > 0 && (
            <div className="flex shrink-0 justify-end pb-3">
              <button
                type="button"
                onClick={clearChat}
                disabled={isThinking}
                className="inline-flex min-h-[var(--touch-min)] items-center gap-2 rounded-[6px] border border-[var(--rule)] bg-card px-5 font-heading font-semibold text-foreground shadow-[var(--btn-shadow)] transition-colors hover:border-[var(--destructive)] hover:text-[var(--destructive)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--rule)] disabled:hover:text-foreground"
                style={{ fontSize: 'var(--text-meta)' }}
              >
                <Trash2 className="size-5" aria-hidden />
                Xoá hội thoại
              </button>
            </div>
          )}

          <div
            ref={transcriptRef}
            // role="log" + polite: the persona has low vision, so a new answer must be
            // announced rather than merely appearing somewhere on screen.
            role="log"
            aria-live="polite"
            aria-label="Cuộc trò chuyện với trợ lý"
            className="flex flex-1 flex-col gap-5 overflow-y-auto pr-2"
          >
            {messages.length === 0 ? (
              <EmptyState onPick={send} disabled={isThinking} />
            ) : (
              messages.map((message) => <ChatBubble key={message.id} message={message} />)
            )}
            {isThinking && <ThinkingBubble />}
          </div>

          <div className="shrink-0 pt-4">
            <ChatComposer
              inputRef={composerRef}
              value={fieldValue}
              onChange={setDraft}
              onSubmit={() => send(fieldValue)}
              disabled={isThinking}
              voiceSupported={speech.isSupported}
              voiceListening={speech.isListening}
              onVoiceToggle={speech.toggle}
            />

            <p
              aria-live="polite"
              className={
                speech.status === 'idle'
                  ? 'mt-2 text-muted-foreground'
                  : 'mt-2 font-heading font-semibold text-[var(--destructive)]'
              }
              style={{ fontSize: 'var(--text-eyebrow)' }}
            >
              {speech.status === 'idle'
                ? 'Gõ tiếng Việt kiểu Telex — ví dụ sachs → sách. Hoặc chạm micro để hỏi bằng giọng nói.'
                : VOICE_MESSAGE[speech.status]}
            </p>
          </div>

          {/* Bleeds to the left screen edge only. A symmetric -mx-10 would also push the
              keyboard 40px past the column's right edge, where it covers the first
              characters of the side panel's headings. */}
          <div className="-ml-10 mt-3 shrink-0">
            <OnScreenKeyboard
              onKey={(key) => setDraft(applyTelexKey(draft, key))}
              onBackspace={() => setDraft(draft.slice(0, -1))}
              onSubmit={() => send(fieldValue)}
              submitLabel="Gửi"
              submitIcon={SendHorizontal}
            />
          </div>
        </div>

        {/* Map + suggestions column. Only the middle scrolls, so "Quay về" — the escape
            hatch from this screen — is always on screen no matter how long the list is. */}
        <aside className="flex min-h-0 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
          <section className="shrink-0">
            <h2
              className="font-heading font-bold text-foreground"
              style={{ fontSize: 'var(--text-section)' }}
            >
              Bản đồ chỉ dẫn 3D
            </h2>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
              Vị trí kệ sách được gợi ý nổi bật
            </p>
            <img
              src="/maps/floor-3d.jpg"
              alt="Sơ đồ tổng quan không gian thư viện dạng 3D"
              className="mt-3 max-h-52 w-full rounded-[8px] border border-[var(--rule)] bg-card object-contain"
            />

            {shelves.length > 0 ? (
              <>
                <ul className="mt-4 flex flex-col gap-3">
                  {shownShelves.map(({ place, count }, i) => (
                    <li key={place.shelfCode} className="flex items-center gap-3">
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-full font-heading font-bold text-white"
                        style={{
                          backgroundColor: PIN_COLOR[i % PIN_COLOR.length],
                          fontSize: 'var(--text-eyebrow)',
                        }}
                        aria-hidden
                      >
                        {count > 1 ? count : place.shelfCode.slice(0, 2)}
                      </span>
                      <span className="text-foreground" style={{ fontSize: 'var(--text-meta)' }}>
                        Kệ {place.shelfCode} — {place.zone}, tầng {place.floor}
                        {count > 1 && ` (${count} cuốn)`}
                      </span>
                    </li>
                  ))}
                </ul>
                {hiddenShelves > 0 && (
                  <p
                    className="mt-2 text-muted-foreground"
                    style={{ fontSize: 'var(--text-meta)' }}
                  >
                    và {hiddenShelves} kệ khác trong danh sách bên dưới.
                  </p>
                )}
              </>
            ) : (
              <p
                className="mt-4 flex items-center gap-2 text-muted-foreground"
                style={{ fontSize: 'var(--text-meta)' }}
              >
                <MapPin className="size-4 shrink-0" aria-hidden />
                Kệ sách sẽ được đánh dấu ở đây sau khi bạn hỏi.
              </p>
            )}
          </section>

          <section className="flex min-h-0 shrink-0 flex-col gap-3">
            <h2
              className="font-heading font-bold uppercase tracking-[0.18em] text-[var(--live-ink)]"
              style={{ fontSize: 'var(--text-eyebrow)' }}
            >
              Sách gợi ý
            </h2>

            {suggestedBooks.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {suggestedBooks.map((book) => (
                  <li key={book.id}>
                    <SuggestedBookRow
                      book={book}
                      availability={suggested?.availability[book.id]}
                      onSelect={openBook}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
                Chưa có gợi ý nào. Hãy hỏi trợ lý về môn học hoặc tên sách bạn cần.
              </p>
            )}
          </section>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex min-h-16 shrink-0 items-center justify-center gap-3 rounded-[6px] border border-[var(--rule)] bg-card shadow-[var(--btn-shadow)] px-10 font-heading font-bold text-foreground transition-colors hover:bg-secondary"
            style={{ fontSize: 'var(--text-tab)' }}
          >
            <ArrowLeft className="size-6" aria-hidden />
            Quay về
          </button>
        </aside>
      </main>

      <KioskFooter />
    </div>
  )
}

/**
 * Nothing asked yet — Figma's ChatbotPromo, plus one-tap starters. A kiosk user does not
 * know what an assistant may be asked, and tapping is far faster than typing a whole
 * question on an on-screen keyboard.
 */
function EmptyState({
  onPick,
  disabled,
}: {
  onPick: (prompt: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <div
        className="grid size-20 place-items-center rounded-full bg-[var(--ink)] text-white"
        aria-hidden
      >
        <BookOpen className="size-9" strokeWidth={2} />
      </div>

      <p
        className="font-heading font-semibold text-muted-foreground"
        style={{ fontSize: 'var(--text-section)' }}
      >
        Trò chuyện với chatbot để tìm sách
      </p>

      <ul className="flex flex-wrap justify-center gap-3">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onPick(prompt)}
              disabled={disabled}
              className="min-h-[var(--touch-min)] rounded-[6px] border border-[var(--rule)] bg-card shadow-[var(--btn-shadow)] px-5 font-semibold text-foreground transition-colors hover:border-primary hover:bg-secondary disabled:opacity-40"
              style={{ fontSize: 'var(--text-meta)' }}
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
