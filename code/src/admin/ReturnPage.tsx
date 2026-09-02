/**
 * Trả sách — a demo tool, not a product screen.
 *
 * **Nothing here traces back to the value proposition, and that is deliberate.** Returning
 * a book is not one of the persona's jobs, has no Figma frame, and in a real library
 * happens at a desk or a drop box rather than at the catalogue kiosk. It exists so a demo
 * can show the whole loop — borrow, stock drops, return, stock comes back — instead of the
 * half that borrowing alone can prove. Without it, a few demo runs strand a card at the
 * five-book limit with `npm run db:seed` as the only way out.
 *
 * Kept plain on purpose: no `KioskShell`, no `MobileFrame`, no new component in
 * `src/components/`. Dressing an internal tool in the product's design system is how the
 * next person comes to believe it is part of the product. It borrows the app's colour
 * tokens so it is not unreadable, and stops there.
 *
 * There is no authentication. Anyone who can open the app can open this.
 */
import { useState } from 'react'
import { useAccount, useBooksByIds, useReturnBook } from '@/api/queries'
import { formatDate } from '@/lib/borrow'
import { dueCountdown, loanStatus } from '@/lib/loans'
import { MOBILE_ACCOUNT_CARD } from '@/mobile/account'
import type { AccountSlip, Book } from '@/shared/types'

/**
 * The seeded cards, as one-tap buttons.
 *
 * Typing a card number during a live demo is a way to mistype it in front of an audience.
 * The labels say what each card *demonstrates*, because that is what someone reaching for
 * one is actually choosing between — the numbers are not memorable and are not the point.
 */
const DEMO_CARDS: { code: string; label: string }[] = [
  { code: MOBILE_ACCOUNT_CARD, label: 'Nguyễn Minh Khang — persona, mượn được' },
  { code: '25215012', label: 'Lê Trang Anh — mượn được' },
  { code: '20217777', label: 'Phạm Gia Bảo — chạm giới hạn 5 cuốn' },
  { code: '20218888', label: 'Lê Văn Nam — có sách quá hạn' },
  { code: '20219999', label: 'Trần Thu Hà — thẻ hết hạn' },
]

interface OpenLoan {
  bookId: string
  slipId: string
  dueAt: string
}

/** Every book still out on this card, soonest due first. */
function openLoansOf(slips: AccountSlip[]): OpenLoan[] {
  return slips
    .flatMap((slip) =>
      slip.books
        .filter((book) => book.returnedAt === null)
        .map((book) => ({ bookId: book.bookId, slipId: slip.id, dueAt: slip.dueAt })),
    )
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
}

export function AdminReturnPage() {
  const [cardCode, setCardCode] = useState(MOBILE_ACCOUNT_CARD)

  const { data: account, isPending, isError } = useAccount(cardCode)
  const open = openLoansOf(account?.slips ?? [])

  const { data: bookSet } = useBooksByIds(open.map((l) => l.bookId))
  const booksById = Object.fromEntries((bookSet?.books ?? []).map((b) => [b.id, b]))

  const returnBook = useReturnBook()

  /*
   * The title is captured at the click, not read back afterwards.
   *
   * `booksById` is derived from the *open* loans, so the moment a return succeeds the book
   * leaves that set and its title is no longer resolvable — the confirmation went out
   * reading "Đã trả dai-so-tuyen-tinh", a raw slug, in front of whoever is watching.
   */
  const [returned, setReturned] = useState<{ title: string; wasLate: boolean } | null>(null)

  function handleReturn(bookId: string, bookTitle: string) {
    setReturned(null)
    returnBook.mutate(
      { cardCode, bookId },
      { onSuccess: (data) => setReturned({ title: bookTitle, wasLate: data.loan.wasLate }) },
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 bg-background p-6 text-foreground">
      <header className="flex flex-col gap-1 border-b border-[var(--rule)] pb-4">
        <h1 className="font-heading text-2xl font-bold">Trả sách</h1>
        <p className="text-sm text-muted-foreground">
          Công cụ nội bộ phục vụ demo — không thuộc ứng dụng kiosk hay điện thoại.
        </p>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="admin-card">
        <h2 id="admin-card" className="font-heading text-sm font-bold uppercase tracking-wider">
          Thẻ sinh viên
        </h2>

        <input
          value={cardCode}
          onChange={(event) => setCardCode(event.target.value.trim())}
          aria-label="Mã thẻ sinh viên"
          className="w-56 rounded-[6px] border border-[var(--rule)] bg-card px-3 py-2 font-mono tabular-nums"
        />

        <div className="flex flex-wrap gap-2">
          {DEMO_CARDS.map((card) => (
            <button
              key={card.code}
              type="button"
              onClick={() => setCardCode(card.code)}
              aria-pressed={cardCode === card.code}
              className={`rounded-[6px] border px-3 py-1.5 text-left text-xs ${
                cardCode === card.code
                  ? 'border-[var(--navy)] bg-[var(--navy)] text-white'
                  : 'border-[var(--rule)] bg-card text-muted-foreground'
              }`}
            >
              <span className="font-mono tabular-nums">{card.code}</span> · {card.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="admin-open">
        <h2 id="admin-open" className="font-heading text-sm font-bold uppercase tracking-wider">
          Đang mượn ({open.length})
        </h2>

        {isPending ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : isError || !account ? (
          <p className="text-sm text-[var(--destructive)]">
            Không tìm thấy thẻ <span className="font-mono">{cardCode}</span>.
          </p>
        ) : open.length === 0 ? (
          <p className="text-sm text-muted-foreground">Thẻ này không còn cuốn nào đang mượn.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {open.map((loan) => (
              <LoanRow
                key={`${loan.slipId}::${loan.bookId}`}
                loan={loan}
                record={booksById[loan.bookId]}
                busy={returnBook.isPending}
                onReturn={() =>
                  handleReturn(loan.bookId, booksById[loan.bookId]?.title ?? loan.bookId)
                }
              />
            ))}
          </ul>
        )}
      </section>

      {/* Deliberately not a toast: on a projector, something that fades is something the
          room missed. It stays until the next action replaces it. */}
      {returned && (
        <p role="status" className="text-sm text-[var(--live-ink)]">
          Đã trả <strong>{returned.title}</strong>
          {returned.wasLate ? ' (trả trễ).' : '.'} Số bản trên kệ đã cộng lại.
        </p>
      )}
      {returnBook.isError && (
        <p role="status" className="text-sm text-[var(--destructive)]">
          Không trả được. Thử tải lại trang — có thể cuốn này vừa được trả ở nơi khác.
        </p>
      )}
    </main>
  )
}

function LoanRow({
  loan,
  record,
  busy,
  onReturn,
}: {
  loan: OpenLoan
  record: Book | undefined
  busy: boolean
  onReturn: () => void
}) {
  const overdue = loanStatus({ dueAt: loan.dueAt, returnedAt: null }) === 'overdue'

  return (
    <li className="flex items-center gap-3 rounded-[6px] border border-[var(--rule)] bg-card p-3">
      <span className="flex min-w-0 flex-1 flex-col">
        {/* The id, not a spinner, while the catalogue request is in flight: a demo tool
            should never hide which row is which. */}
        <span className="truncate font-heading font-semibold">{record?.title ?? loan.bookId}</span>
        <span className="text-xs text-muted-foreground">
          Phiếu <span className="font-mono">{loan.slipId}</span> · Hạn trả {formatDate(loan.dueAt)} ·{' '}
          <span className={overdue ? 'font-semibold text-[var(--destructive)]' : ''}>
            {dueCountdown(loan.dueAt)}
          </span>
        </span>
      </span>

      <button
        type="button"
        onClick={onReturn}
        disabled={busy}
        className="shrink-0 rounded-[6px] bg-[var(--navy)] px-4 py-2 font-heading text-sm font-semibold text-white disabled:opacity-50"
      >
        Trả sách
      </button>
    </li>
  )
}
