import { TimerReset } from 'lucide-react'

/**
 * Last call before the checkout clears itself — see lib/useKioskIdle.ts for why the
 * session expires at all.
 *
 * It is a warning, not a question: the reader who is still there taps "Tôi vẫn ở đây"
 * (or anything else on screen) and carries on, and the one who has left loses nothing
 * because nothing was committed. Announced assertively because a low-vision reader may
 * not see a banner appear in their periphery.
 */

interface IdleWarningProps {
  secondsLeft: number
  onStay: () => void
}

export function IdleWarning({ secondsLeft, onStay }: IdleWarningProps) {
  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Phiên mượn sắp hết hạn"
      className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-5 border-t-4 border-[var(--destructive)] bg-card px-10 py-5 shadow-[var(--lift-2)]"
    >
      <TimerReset className="size-7 shrink-0 text-[var(--destructive)]" aria-hidden />

      <p className="font-heading font-semibold text-foreground" style={{ fontSize: 'var(--text-body)' }}>
        Bạn còn ở đây chứ? Phiên mượn sẽ tự huỷ sau{' '}
        <strong className="tabular-nums text-[var(--destructive)]">{secondsLeft} giây</strong> để bảo
        vệ thẻ của bạn.
      </p>

      <button
        type="button"
        onClick={onStay}
        className="min-h-[var(--touch-min)] rounded-[6px] bg-primary px-8 font-heading font-bold text-primary-foreground transition-[background,box-shadow] duration-150 active:brightness-95"
        style={{ fontSize: 'var(--text-body)' }}
      >
        Tôi vẫn ở đây
      </button>
    </div>
  )
}
