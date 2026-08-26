import { useEffect, useState } from 'react'
import { libraryStatus } from '@/mocks'

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

  return (
    <footer
      data-kiosk-surface
      className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-[var(--rule)] bg-card px-10 py-4"
      style={{ fontSize: 'var(--text-meta)' }}
    >
      <p className="flex items-center gap-3 font-semibold text-foreground">
        <span className="kiosk-pulse size-2.5 rounded-full bg-[var(--live)]" aria-hidden />
        {libraryStatus.isOpen ? 'Thư viện đang mở cửa' : 'Thư viện đã đóng cửa'}
        <span className="font-normal text-muted-foreground">
          {libraryStatus.opensAt} – {libraryStatus.closesAt}
        </span>
      </p>

      <p className="text-muted-foreground">
        <strong className="font-semibold text-[var(--live-ink)]">
          {numberFormat.format(libraryStatus.titlesAvailable)}
        </strong>{' '}
        trong {numberFormat.format(libraryStatus.titlesTotal)} đầu sách đang sẵn sàng cho mượn
      </p>

      <p className="text-muted-foreground">
        Hỗ trợ kỹ thuật:{' '}
        <strong className="font-semibold text-foreground">{libraryStatus.supportPhone}</strong>
      </p>

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
