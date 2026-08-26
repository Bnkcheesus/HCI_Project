// Implements Job 1 / Pain Reliever 1 / Product-Service 1 — keyword search with an
// on-screen keyboard for the kiosk touchscreen. Figma frame: kiosk-search (12:2).
import { Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BookCard } from '@/components/kiosk/BookCard'
import { KioskFooter } from '@/components/kiosk/KioskFooter'
import { KioskHeader } from '@/components/kiosk/KioskHeader'
import { OnScreenKeyboard } from '@/components/kiosk/OnScreenKeyboard'
import { SearchField } from '@/components/kiosk/SearchField'
import { SearchSuggestions } from '@/components/kiosk/SearchSuggestions'
import { applyTelexKey } from '@/lib/telex'
import { suggestedBooks } from '@/mocks'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'

export function SearchPage() {
  const navigate = useNavigate()
  const searchQuery = useBorrowSessionStore((s) => s.searchQuery)
  const setSearchQuery = useBorrowSessionStore((s) => s.setSearchQuery)
  const selectBook = useBorrowSessionStore((s) => s.selectBook)

  const isTyping = searchQuery.trim().length > 0

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
          <SearchSuggestions query={searchQuery} onSelect={handleSelectBook} />
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
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={handleSubmit}
            autoFocus
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground" style={{ fontSize: 'var(--text-eyebrow)' }}>
              Gõ tiếng Việt kiểu Telex — ví dụ <strong className="text-foreground">sachs</strong> →
              sách, <strong className="text-foreground">dduowngf</strong> → đường
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
