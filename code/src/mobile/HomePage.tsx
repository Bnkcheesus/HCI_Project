// Implements Goal 4 / Job 4 / Pain 4 / Pain Reliever 4 / Product-Service 4 — the mobile
// companion's landing screen: what is on loan, when it is due, and the two ways in.
// Figma frame: Phone-home-screen (39:286).
import { ChevronRight, QrCode, ScrollText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MobileFrame } from '@/components/mobile/MobileFrame'
import { DueBadge } from '@/components/mobile/DueBadge'
import { useAccount, useBooksByIds } from '@/api/queries'
import { openBooks } from '@/lib/accountSlips'
import { mostUrgentLoan } from '@/lib/loans'
import { MOBILE_ACCOUNT_CARD } from '@/mobile/account'

export function MobileHomePage() {
  const navigate = useNavigate()

  // Same request as the slip list, so the two screens cannot disagree about what is out —
  // a book borrowed at the kiosk shows up on both or on neither.
  const { data: account } = useAccount(MOBILE_ACCOUNT_CARD)
  const student = account?.student

  const stillOut = openBooks(account?.slips ?? [])
  const urgent = mostUrgentLoan(stillOut)

  // Only the one book the banner names — the rest of the list is counted, not titled.
  const { data: urgentSet } = useBooksByIds(urgent ? [urgent.bookId] : [])
  const urgentBook = urgentSet?.books[0]

  return (
    <MobileFrame>
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
          Xin chào,
        </p>
        <h1
          className="font-heading font-extrabold tracking-tight text-foreground"
          style={{ fontSize: 'var(--text-brand)' }}
        >
          {student?.name ?? 'Bạn đọc'}
        </h1>
      </div>

      {/*
        The Figma frame is a two-button menu and nothing else. scenario.md has the reader
        "liếc nhanh ứng dụng và thấy ngay lịch sử mượn cùng lời nhắc hạn trả" on their way
        out of the library — a glance, not a tap — and Pain Reliever 4 promises the app
        *nhắc* rather than merely stores. A menu reminds nobody of anything, so the most
        urgent loan is lifted onto the first screen. The two buttons below are unchanged.
      */}
      {urgent && urgentBook ? (
        <button
          type="button"
          onClick={() => navigate('/mobile/phieu-muon')}
          data-kiosk-surface
          /*
           * items-stretch is load-bearing, not tidiness. The HTML rendering spec gives
           * <button> a UA rule of `align-items: flex-start`, which Chromium ignores and
           * WebKit applies. In a flex *column* the cross axis is horizontal, so under that
           * rule every row inside this card shrink-wraps to its text: the chip walks in
           * from the right edge, the chevron follows it, and the card looks fine in
           * headless Chromium while being visibly wrong on the reader's phone. Naming the
           * value in author CSS beats the UA sheet outright.
           */
          className="flex w-full min-w-0 flex-col items-stretch gap-3 rounded-[8px] border border-[var(--rule)] bg-card p-4 text-left shadow-[var(--card-shadow)] transition-colors active:bg-secondary"
        >
          <div className="flex items-center justify-between gap-3">
            <p
              className="font-heading font-bold uppercase tracking-[0.14em] text-muted-foreground"
              style={{ fontSize: 'var(--text-eyebrow)' }}
            >
              Sắp đến hạn trả
            </p>
            <DueBadge dueAt={urgent.dueAt} />
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <span className="h-16 w-12 shrink-0 overflow-hidden rounded-[6px] border border-[var(--rule)] bg-secondary">
              {urgentBook.coverUrl && (
                <img src={urgentBook.coverUrl} alt="" className="size-full object-cover" />
              )}
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className="line-clamp-2 font-heading font-semibold leading-snug text-foreground"
                style={{ fontSize: 'var(--text-body)' }}
              >
                {urgentBook.title}
              </span>
              <span
                className="truncate text-muted-foreground"
                style={{ fontSize: 'var(--text-meta)' }}
              >
                {urgentBook.author}
              </span>
            </span>

            {/*
              -mr-1.5 on every chevron on this screen, and a 16px gutter on every card, so
              the three arrows land on one vertical line together with the chip's right
              edge. Lucide draws chevron-right centred in a 24-unit box with the stroke
              ending around x=16, so a size-5 icon carries ~6px of empty box on its right:
              box-flush and ink-flush are not the same edge, and the eye reads the ink.
            */}
            <ChevronRight className="-mr-1.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          </div>

          <p className="text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
            Bạn đang mượn {stillOut.length} cuốn.
          </p>
        </button>
      ) : (
        <p
          data-kiosk-surface
          className="rounded-[8px] border border-[var(--rule)] bg-card p-4 text-muted-foreground shadow-[var(--card-shadow)]"
          style={{ fontSize: 'var(--text-body)' }}
        >
          Bạn chưa mượn cuốn nào. Ghé kiosk ở thư viện để mượn sách nhé.
        </p>
      )}

      {/* The two actions the Figma frame specifies, in its order. */}
      <nav className="flex flex-col gap-3" aria-label="Chức năng chính">
        <MobileAction
          icon={QrCode}
          label="Quét QR"
          hint="Mở chỉ dẫn tới kệ sách"
          onClick={() => navigate('/mobile/qr')}
        />
        <MobileAction
          icon={ScrollText}
          label="Lịch sử phiếu mượn"
          hint="Sách đang mượn và đã trả"
          onClick={() => navigate('/mobile/phieu-muon')}
        />
      </nav>
    </MobileFrame>
  )
}

interface MobileActionProps {
  icon: typeof QrCode
  label: string
  hint: string
  onClick: () => void
}

function MobileAction({ icon: Icon, label, hint, onClick }: MobileActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-kiosk-surface
      // min-w-0 on the text column so a long hint truncates instead of stretching the
      // button past the screen — same trap the kiosk book cards hit.
      // px-4, not px-5: one 16px gutter for every card on this screen, so the icons down
      // the left and the chevrons down the right each form a single column.
      className="flex w-full min-h-[var(--touch-min)] items-center gap-3 rounded-[8px] border border-[var(--rule)] bg-card px-4 py-3 text-left shadow-[var(--btn-shadow)] transition-colors active:bg-secondary"
    >
      <Icon className="size-5 shrink-0 text-[var(--live-ink)]" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className="font-heading font-bold text-foreground"
          style={{ fontSize: 'var(--text-title)' }}
        >
          {label}
        </span>
        <span className="truncate text-muted-foreground" style={{ fontSize: 'var(--text-meta)' }}>
          {hint}
        </span>
      </span>
      <ChevronRight className="-mr-1.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )
}
