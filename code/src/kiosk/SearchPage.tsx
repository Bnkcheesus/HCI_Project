// Implements Job 1 / Pain Reliever 1 / Product-Service 1 — keyword search with an
// on-screen keyboard for the kiosk touchscreen. Figma frame: kiosk-search (12:2).
import { Sparkles } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookCard } from '@/components/kiosk/BookCard'
import { KioskFooter } from '@/components/kiosk/KioskFooter'
import { KioskHeader } from '@/components/kiosk/KioskHeader'
import { OnScreenKeyboard } from '@/components/kiosk/OnScreenKeyboard'
import { SearchField } from '@/components/kiosk/SearchField'
import { SearchSuggestions } from '@/components/kiosk/SearchSuggestions'
import { applyTelexKey } from '@/lib/telex'
import { useSpeechSearch } from '@/lib/useSpeechSearch'
import { suggestedBooks } from '@/mocks'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'

const VOICE_MESSAGE = {
  listening: 'Đang nghe… hãy nói tên sách bạn cần tìm',
  denied: 'Chưa được cấp quyền micro. Dùng bàn phím bên dưới để nhập.',
  error: 'Không kết nối được dịch vụ nhận diện giọng nói. Dùng bàn phím bên dưới.',
  timeout: 'Không nhận được giọng nói. Vui lòng thử lại hoặc dùng bàn phím bên dưới.',
} as const

export function SearchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const searchQuery = useBorrowSessionStore((s) => s.searchQuery)
  const setSearchQuery = useBorrowSessionStore((s) => s.setSearchQuery)
  const selectBook = useBorrowSessionStore((s) => s.selectBook)

  // Transcripts arrive already accented, so they go straight into the field — pushing
  // them through the Telex engine would read a trailing "s" as a tone mark.
  const speech = useSpeechSearch({ onFinal: setSearchQuery })

  // Arriving from the home screen's mic means "start listening now".
  const autoListenHandled = useRef(false)
  useEffect(() => {
    if (autoListenHandled.current) return
    if (!(location.state as { autoListen?: boolean } | null)?.autoListen) return

    autoListenHandled.current = true
    speech.start()
    // Clear the flag so coming back to this screen later does not reopen the mic.
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate, speech])

  // While speaking, the field previews what has been heard so far.
  const fieldValue = speech.interim || searchQuery
  const isTyping = fieldValue.trim().length > 0

  function handleSelectBook(bookId: string) {
    selectBook(bookId)
    navigate(`/kiosk/books/${bookId}`)
  }

  function handleSubmit() {
    if (isTyping) navigate('/kiosk/search/results')
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <KioskHeader statusLabel="Tìm sách" />

      {/* Results area: suggestions before typing, live matches once the user starts. */}
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-4 overflow-y-auto px-10 py-4">
        {isTyping ? (
          <SearchSuggestions query={fieldValue} onSelect={handleSelectBook} />
        ) : (
          <section className="flex flex-col gap-4">
            <h2
              className="font-heading font-bold uppercase tracking-[0.18em] text-[var(--live-ink)]"
              style={{ fontSize: 'var(--text-eyebrow)' }}
            >
              Gợi ý cho bạn
            </h2>
            <ul className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {suggestedBooks.map((book) => (
                <li key={book.id}>
                  <BookCard book={book} onSelect={handleSelectBook} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {/* Search field sits directly above the keyboard, where the thumbs are. */}
      <div className="border-t border-[var(--rule)] bg-card/60 px-10 py-4">
        <div className="mx-auto max-w-[1280px]">
          <SearchField
            value={fieldValue}
            onChange={setSearchQuery}
            onSubmit={handleSubmit}
            autoFocus
            voiceSupported={speech.isSupported}
            voiceListening={speech.isListening}
            onVoiceToggle={speech.toggle}
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            {/* Voice status replaces the Telex hint while it has something to say, and is
                announced to screen readers — a low-vision user cannot see the red mic. */}
            <p
              aria-live="polite"
              className={
                speech.status === 'idle'
                  ? 'text-muted-foreground'
                  : speech.status === 'listening'
                    ? 'font-heading font-semibold text-[var(--destructive)]'
                    : 'font-heading font-semibold text-[var(--destructive)]'
              }
              style={{ fontSize: 'var(--text-eyebrow)' }}
            >
              {speech.status === 'idle' ? (
                <>
                  Gõ tiếng Việt kiểu Telex — ví dụ{' '}
                  <strong className="text-foreground">sachs</strong> → sách,{' '}
                  <strong className="text-foreground">dduowngf</strong> → đường
                </>
              ) : (
                VOICE_MESSAGE[speech.status]
              )}
            </p>

            <button
              type="button"
              onClick={() => navigate('/kiosk/ai-chat')}
              className="inline-flex items-center gap-2 font-heading font-semibold text-[var(--live-ink)] underline-offset-4 hover:underline"
              style={{ fontSize: 'var(--text-eyebrow)' }}
            >
              <Sparkles className="size-4" aria-hidden />
              Không chắc cần sách gì? Hỏi trợ lý AI
            </button>
          </div>
        </div>
      </div>

      <OnScreenKeyboard
        onKey={(key) => setSearchQuery(applyTelexKey(searchQuery, key))}
        onBackspace={() => setSearchQuery(searchQuery.slice(0, -1))}
        onSubmit={handleSubmit}
      />

      <KioskFooter />
    </div>
  )
}
