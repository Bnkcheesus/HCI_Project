// Implements Job 4 / Pain 4 / Pain Reliever 4 / Product-Service 4 — every slip on the
// reader's account, what is still out and what came back.
// Figma frame: Phone-PhieuMuon (49:122), with its three status variants.
import { MobileFrame } from '@/components/mobile/MobileFrame'
import { SlipCard } from '@/components/mobile/SlipCard'
import { useAccount, useBooksByIds } from '@/api/queries'
import { closedSlips, openSlips } from '@/lib/accountSlips'
import type { Book } from '@/shared/types'
import { MOBILE_ACCOUNT_CARD } from './account'

export function LoanSlipsPage() {
  const { data: account } = useAccount(MOBILE_ACCOUNT_CARD)
  const slips = account?.slips ?? []
  const open = openSlips(slips)
  const closed = closedSlips(slips)

  /*
   * Every book across every slip, in one request.
   *
   * A slip holds ids; the card needs titles, authors and cover art. Fetching from inside
   * `SlipCard` would mean one request per book per card — a reader with six slips would
   * open a dozen connections to draw one screen.
   */
  const bookIds = [...new Set(slips.flatMap((s) => s.books.map((b) => b.bookId)))]
  const { data: bookSet } = useBooksByIds(bookIds)
  const booksById = Object.fromEntries((bookSet?.books ?? []).map((b) => [b.id, b]))

  return (
    <MobileFrame title="Danh sách phiếu mượn" backTo="/mobile">
      {slips.length === 0 ? (
        <p
          data-kiosk-surface
          className="rounded-[8px] border border-[var(--rule)] bg-card p-4 text-muted-foreground shadow-[var(--card-shadow)]"
          style={{ fontSize: 'var(--text-body)' }}
        >
          Bạn chưa mượn cuốn nào. Ghé kiosk ở thư viện để mượn sách nhé.
        </p>
      ) : (
        <>
          {/*
            Two sections rather than one chronological list. The Figma frame shows a flat
            list, but what a reader owes the library and what they have already returned
            are different questions — and the first one has a deadline attached. Sorting
            the open slips by due date puts anything overdue at the very top.
          */}
          <SlipSection
            id="open"
            title="Đang mượn"
            count={open.length}
            empty="Bạn không còn cuốn nào chưa trả."
            slips={open}
            booksById={booksById}
          />
          <SlipSection
            id="returned"
            title="Đã trả"
            count={closed.length}
            empty="Chưa có phiếu nào hoàn tất."
            slips={closed}
            booksById={booksById}
          />
        </>
      )}
    </MobileFrame>
  )
}

interface SlipSectionProps {
  /**
   * Plain ASCII, no spaces. aria-labelledby takes a space-separated list of IDREFs, so an
   * id built from the Vietnamese heading ("slips-Đang mượn") is read as two ids that do
   * not exist — the section then has no accessible name and loses its region role
   * entirely, taking it out of reach of assistive technology.
   */
  id: string
  title: string
  count: number
  empty: string
  slips: ReturnType<typeof openSlips>
  /** Catalogue records for every book on these slips, fetched once by the page. */
  booksById: Record<string, Book>
}

function SlipSection({ id, title, count, empty, slips, booksById }: SlipSectionProps) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby={`slips-${id}`}>
      <h2
        id={`slips-${id}`}
        className="font-heading font-bold uppercase tracking-[0.14em] text-muted-foreground"
        style={{ fontSize: 'var(--text-eyebrow)' }}
      >
        {title} ({count})
      </h2>

      {slips.length === 0 ? (
        <p className="text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
          {empty}
        </p>
      ) : (
        slips.map((slip) => <SlipCard key={slip.id} slip={slip} booksById={booksById} />)
      )}
    </section>
  )
}
