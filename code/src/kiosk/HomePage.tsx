// Implements Goal 1–3 / Product-Service 1–3 — kiosk landing screen, entry point into
// search, AI chat and the self-checkout flow. Figma frame: kiosk-home (5:715).
import { Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BookCard } from '@/components/kiosk/BookCard'
import { KioskHeader } from '@/components/kiosk/KioskHeader'
import { KioskFooter } from '@/components/kiosk/KioskFooter'
import { ModeTabs, type KioskMode } from '@/components/kiosk/ModeTabs'
import { SearchField } from '@/components/kiosk/SearchField'
import { SubjectChips } from '@/components/kiosk/SubjectChips'
import { useSpeechSearch } from '@/lib/useSpeechSearch'
import { suggestedBooks } from '@/mocks'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'

export function HomePage() {
  const navigate = useNavigate()
  const searchQuery = useBorrowSessionStore((s) => s.searchQuery)
  const setSearchQuery = useBorrowSessionStore((s) => s.setSearchQuery)
  const selectBook = useBorrowSessionStore((s) => s.selectBook)
  // Only used to decide whether the mic is worth showing; the listening itself happens
  // on the search screen, where the transcript has somewhere to go.
  const { isSupported: speechSupported } = useSpeechSearch({ onFinal: setSearchQuery })

  function handleModeChange(mode: KioskMode) {
    navigate(mode === 'search' ? '/kiosk/search' : '/kiosk/scan')
  }

  // Tapping the field hands off to the search screen. `viewTransition` morphs the bar
  // down into its docked position above the keyboard instead of cutting between routes.
  function openSearch() {
    navigate('/kiosk/search', { viewTransition: true })
  }

  // The mic does the same hand-off, but asks the search screen to start listening on
  // arrival — the user tapped a microphone, so they expect to be able to just talk.
  // Carried in navigation state rather than a global store: it is a one-shot instruction
  // about this navigation, not app state.
  function openSearchListening() {
    navigate('/kiosk/search', { viewTransition: true, state: { autoListen: true } })
  }

  function handleSelectBook(bookId: string) {
    selectBook(bookId)
    navigate(`/kiosk/books/${bookId}`)
  }

  function handleSelectSubject(subject: string) {
    setSearchQuery(subject)
    navigate('/kiosk/search/results')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <KioskHeader statusLabel="Trang chủ" />

      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 px-10 py-8">
        <div className="kiosk-rise" style={{ animationDelay: '60ms' }}>
          <ModeTabs value="search" onChange={handleModeChange} />
        </div>

        <div className="kiosk-rise" style={{ animationDelay: '140ms' }}>
          <SearchField
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={openSearch}
            onActivate={openSearch}
            voiceSupported={speechSupported}
            onVoiceToggle={openSearchListening}
          />
        </div>

        <section className="flex flex-col gap-6">
          <header
            className="kiosk-rise flex flex-col gap-2 border-b border-[var(--rule)] pb-4"
            style={{ animationDelay: '220ms' }}
          >
            <p
              className="font-heading font-bold uppercase tracking-[0.18em] text-[var(--live-ink)]"
              style={{ fontSize: 'var(--text-eyebrow)' }}
            >
              Gợi ý cho bạn
            </p>
            <h1
              className="font-heading font-bold tracking-tight text-foreground"
              style={{ fontSize: 'var(--text-section)' }}
            >
              Sách được mượn nhiều trong học kỳ này
            </h1>
          </header>

          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {suggestedBooks.map((book, i) => (
              <li
                key={book.id}
                className="kiosk-rise"
                style={{ animationDelay: `${300 + i * 70}ms` }}
              >
                <BookCard book={book} onSelect={handleSelectBook} />
              </li>
            ))}
          </ul>
        </section>

        {/* Subject shortcuts share this band with the floating AI button, so the list is
            capped short of the right edge to keep the two from colliding. */}
        <div
          className="kiosk-rise mt-auto max-w-[calc(100%-16rem)]"
          style={{ animationDelay: '600ms' }}
        >
          <SubjectChips onSelect={handleSelectSubject} />
        </div>
      </main>

      <KioskFooter />

      {/* AI assistant entry — Gain Creator 1 / Product-Service 1. Figma: ReaderIcon (16:372). */}
      <button
        type="button"
        onClick={() => navigate('/kiosk/ai-chat')}
        aria-label="Mở trợ lý AI gợi ý sách"
        className="fixed bottom-28 right-10 inline-flex min-h-16 items-center gap-3 rounded-full bg-[var(--live-ink)] px-7 font-heading font-bold text-white shadow-[0_12px_32px_-8px_rgb(10_122_84/55%)] transition-transform hover:scale-105 active:scale-95"
        style={{ fontSize: 'var(--text-body)' }}
      >
        <Sparkles className="size-6" aria-hidden />
        Hỏi trợ lý AI
      </button>
    </div>
  )
}
