// Implements Goal 1–3 / Product-Service 1–3 — kiosk landing screen, entry point into
// search, AI chat and the self-checkout flow. Figma frame: kiosk-home (5:715).
import { Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResultCard } from '@/components/kiosk/ResultCard'
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

  /**
   * The home screen is the start of a session, so it starts empty.
   *
   * The query and the selected book live in the session store because later screens share
   * them, but reaching home means the previous session is over — on a shared kiosk the
   * next person must not walk up to whatever a stranger was looking for. Clearing the
   * selection also stops the checkout's "Bạn vừa chọn …" line from naming a book the
   * reader never picked this time round.
   */
  useEffect(() => {
    setSearchQuery('')
    selectBook(null)
  }, [setSearchQuery, selectBook])

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
    navigate(`/kiosk/books/${bookId}`, { state: { from: '/kiosk' } })
  }

  function handleSelectSubject(subject: string) {
    setSearchQuery(subject)
    navigate('/kiosk/search/results')
  }

  return (
    // h-screen + overflow-hidden, matching every other kiosk screen: the header and the
    // footer are fixed chrome, and only the content between them scrolls. With
    // min-h-screen the whole page scrolled and carried the footer up with it.
    <div className="flex h-screen flex-col overflow-hidden">
      <KioskHeader statusLabel="Trang chủ" />

      {/*
        The home screen never scrolls: it is the first thing a reader sees, and the subject
        shortcuts along the bottom are their fastest route when they know the field but not
        the title. Sizing it to a fixed height only made it fit one screen — 746px of
        content in a 658px frame at 1280x800 pushed the shortcuts out of sight.

        So the card grid carries `flex-1`: the fixed rows (tabs, search field, section
        heading, shortcuts) take what they need and the covers absorb whatever is left over,
        growing on a tall screen and giving the height back on a short one.

        `h-full min-h-[570px]` is the pair that makes both halves work. h-full pins the
        track to the frame, which is what forces the rows to squeeze rather than pile up
        past the bottom — with min-h-full the track just grew to fit and nothing ever
        shrank. The 570px floor is the content's true minimum, once the covers are down to
        theirs; below that the track outgrows the frame and main scrolls, because a
        scrollbar beats rows drawing on top of each other. In practice that floor is a
        712px-tall window, so every kiosk and laptop height above it fits whole.

        All of it is scoped to `lg`, because the guarantee belongs to the kiosk layout —
        one row of four cards. Narrower than that the grid wraps to two rows or four, whose
        combined height no amount of squeezing will fit, and forcing it tried: the second
        row of covers spilled out under the subject shortcuts, which drew straight over the
        cards and buried their availability chips. Below lg the page simply scrolls.

        Full width on the scroll container, max-width on the track inside it: combining the
        two put the scrollbar 320px in from the edge of a 1920px display.
      */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[1280px] flex-col gap-6 px-10 py-6 lg:h-full lg:min-h-[570px]">
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

          <section className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
            <header
              className="kiosk-rise flex flex-col gap-1 border-b border-[var(--rule)] pb-3"
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

            {/*
              lg:grid-rows-1 is what actually lets the covers shrink. An auto-sized grid row
              stretches to fill spare space but never shrinks below its max-content height,
              so flex-1 on this list just made it overflow: the cards stayed 237px tall and
              the shortcuts below them slid off a 768px screen. minmax(0,1fr) — which is
              what grid-rows-1 compiles to — lets the row take exactly the height the list
              was given, in both directions. Scoped to lg because the narrower breakpoints
              lay the same four cards out over two or four rows.
            */}
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-4 lg:grid-rows-1">
              {suggestedBooks.map((book, i) => (
                <li
                  key={book.id}
                  className="kiosk-rise min-w-0"
                  style={{ animationDelay: `${300 + i * 70}ms` }}
                >
                  <ResultCard book={book} onSelect={handleSelectBook} />
                </li>
              ))}
            </ul>
          </section>

          {/*
            Shortcuts and the AI entry share the bottom band as one row.

            The button used to be `fixed` to the viewport's bottom-right, with the shortcut
            list capped at 100%-16rem to dodge it. That kept them apart horizontally but not
            vertically: on a 1366x768 screen the button dipped six pixels into the fourth
            book card. Laying them out as siblings means they cannot collide at any height,
            and the button stays in view because this screen never scrolls.
          */}
          <div
            className="kiosk-rise flex shrink-0 items-end justify-between gap-8"
            style={{ animationDelay: '600ms' }}
          >
            <div className="min-w-0 flex-1">
              <SubjectChips onSelect={handleSelectSubject} />
            </div>

            {/* AI assistant entry — Gain Creator 1 / Product-Service 1. Figma: ReaderIcon (16:372). */}
            <button
              type="button"
              onClick={() => navigate('/kiosk/ai-chat')}
              aria-label="Mở trợ lý AI gợi ý sách"
              className="inline-flex min-h-16 shrink-0 items-center gap-3 rounded-[6px] bg-[var(--live-ink)] px-7 font-heading font-bold text-white shadow-[var(--lift-2)] transition-[background,box-shadow] duration-150 active:brightness-95"
              style={{ fontSize: 'var(--text-body)' }}
            >
              <Sparkles className="size-6" aria-hidden />
              Hỏi trợ lý AI
            </button>
          </div>
        </div>
      </main>

      <KioskFooter />
    </div>
  )
}
