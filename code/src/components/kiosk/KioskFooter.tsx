import { useEffect, useState } from 'react'
import { useLibraryInfo } from '@/api/queries'

/**
 * One footer shared by every kiosk screen. Merges the two different footers the Figma
 * prototype used (home: nothing; search: campus + terms + support line) into a single
 * bar so the chrome never shifts between screens.
 *
 * The live count is Gain Creator 4 at collection level; the clock is deliberate —
 * the persona works in the gaps between classes (scenario.md, "chỉ có 15 phút"), so
 * "how long have I got" is real context. The terms link from the prototype is dropped:
 * reading a legal page while standing at a kiosk is not a real task.
 */

const numberFormat = new Intl.NumberFormat('vi-VN')

export function KioskFooter() {
  const now = useClock()
  const { data } = useLibraryInfo()

  /*
   * The footer is on every screen, so it is the one place a loading state would be seen
   * constantly. It renders its chrome regardless and fills the live figures in when they
   * arrive — a bar that appears and disappears under the content would shift every screen
   * on the first paint.
   *
   * The clock never waits on the network: it is the piece the persona actually reads
   * ("how long have I got"), and it is local.
   */
  const status = data?.status

  return (
    <footer
      data-kiosk-surface
      // shrink-0: the footer carries the live status and the support number, so it must
      // never be compressed away when a screen runs short of room.
      className="flex shrink-0 flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-[var(--rule)] bg-[var(--chrome)] px-10 py-4"
      style={{ fontSize: 'var(--text-meta)' }}
    >
      <p className="flex items-center gap-3 font-semibold text-foreground">
        <span className="kiosk-pulse size-2.5 rounded-full bg-[var(--live)]" aria-hidden />
        {status?.isOpen === false ? 'Thư viện đã đóng cửa' : 'Thư viện đang mở cửa'}
        <span className="font-normal text-muted-foreground">
          {status ? `${status.opensAt} – ${status.closesAt}` : '\u00a0'}
        </span>
      </p>

      {status && (
        <p className="text-muted-foreground">
          <strong className="font-semibold text-[var(--live-ink)]">
            {numberFormat.format(status.titlesAvailable)}
          </strong>{' '}
          trong {numberFormat.format(status.titlesTotal)} đầu sách đang sẵn sàng cho mượn
        </p>
      )}

      {status && (
        <p className="text-muted-foreground">
          Hỗ trợ kỹ thuật:{' '}
          <strong className="font-semibold text-foreground">{status.supportPhone}</strong>
        </p>
      )}

      <p className="font-heading font-semibold tabular-nums text-foreground">
        <span className="sr-only">Bây giờ là </span>
        {now}
      </p>
    </footer>
  )
}

function useClock() {
  const [now, setNow] = useState(formatTime)

  useEffect(() => {
    const id = setInterval(() => setNow(formatTime()), 1000)
    return () => clearInterval(id)
  }, [])

  return now
}

function formatTime() {
  return new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
