// Chrome shared by every /mobile/* screen — the header bar, the title pill and the
// "Quay về" button that the Figma phone frames all carry (39:286, 41:598, 41:630, 49:122).
//
// Colour, type and radius come from the project's design tokens, not from the Figma
// mobile frames: the palette was replaced wholesale during the kiosk work, and a phone
// companion that looks like a different product would be worse than one that matches.
// What the frames settle is the *structure* — that is what is reproduced here.
import { ArrowLeft, BookOpen, Contrast } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAccessibilityStore } from '@/state/useAccessibilityStore'

interface MobileFrameProps {
  /** Pill label at the top of the content area. Omitted on the home screen. */
  title?: string
  children: ReactNode
  /**
   * Where the bottom "Quay về" button goes. Omitted on the home screen, which is the hub
   * every other screen returns to.
   */
  backTo?: string
  backLabel?: string
}

export function MobileFrame({
  title,
  children,
  backTo,
  backLabel = 'Quay về',
}: MobileFrameProps) {
  const navigate = useNavigate()

  return (
    // Same split as every kiosk screen: fixed chrome, one scrolling region between.
    // h-dvh, not h-screen — on a phone the browser's own bars eat into the viewport, and
    // h-screen would push the back button underneath them.
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--page)]">
      <MobileHeader />

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 py-4">
          {title && (
            <p
              data-kiosk-surface
              className="self-start rounded-[8px] border border-[var(--rule)] bg-card px-5 py-2.5 font-heading font-bold text-foreground shadow-[var(--card-shadow)]"
              style={{ fontSize: 'var(--text-title)' }}
            >
              {title}
            </p>
          )}

          {children}
        </div>
      </main>

      {backTo && (
        // Fixed chrome, outside the scrolling region — the way back must be reachable
        // without scrolling to the end of a long list of slips. shrink-0 so a screen that
        // runs out of room compresses the content, never the way out of it.
        <footer
          data-kiosk-surface
          className="shrink-0 border-t border-[var(--rule)] bg-[var(--chrome)] px-4 py-3"
        >
          <button
            type="button"
            onClick={() => navigate(backTo)}
            // Same classes as the kiosk's own "Quay về" (BookInfoPage), down to the radius
            // and the shadow token — only the sizing differs, because a thumb and a
            // fingertip on a 32" panel are not the same target.
            className="inline-flex min-h-[var(--touch-min)] w-full items-center justify-center gap-3 rounded-[6px] border border-[var(--rule)] bg-card px-6 py-3 font-heading font-bold text-foreground shadow-[var(--btn-shadow)] transition-colors active:bg-secondary"
            style={{ fontSize: 'var(--text-tab)' }}
          >
            <ArrowLeft className="size-5 shrink-0" aria-hidden />
            {backLabel}
          </button>
        </footer>
      )}
    </div>
  )
}

function MobileHeader() {
  const a11yEnabled = useAccessibilityStore((s) => s.enabled)
  const toggleA11y = useAccessibilityStore((s) => s.toggle)

  return (
    <header
      data-kiosk-surface
      className="flex shrink-0 items-center gap-3 border-b border-[var(--rule)] bg-[var(--chrome)] px-4 py-3"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-primary text-primary-foreground">
        <BookOpen className="size-5" strokeWidth={2.25} aria-hidden />
      </div>

      <p
        className="mr-auto font-heading font-extrabold tracking-tight text-foreground"
        style={{ fontSize: 'var(--text-title)' }}
      >
        LibAssist
      </p>

      {/*
        Product/Service 5 scopes the accessibility mode to the kiosk, but the persona's
        eyesight does not improve when they pick up their phone. The store and the token
        overrides already exist and are global, so honouring it here costs one button.

        It is a full --touch-min square. The Figma header also carries a VI/EN switch, but
        five items cannot all clear the touch floor inside a 375px header — and that switch
        is decorative on the kiosk too, since i18n is not in the value proposition. A
        control that does nothing does not get to push a real one under the floor.
      */}
      <button
        type="button"
        onClick={toggleA11y}
        aria-pressed={a11yEnabled}
        aria-label="Chế độ trợ năng: chữ lớn, tương phản cao"
        className={cn(
          'grid size-[var(--touch-min)] shrink-0 place-items-center rounded-[8px] border transition-colors',
          a11yEnabled
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-[var(--rule)] bg-secondary text-foreground',
        )}
      >
        <Contrast className="size-5" aria-hidden />
      </button>

      <Avatar />
    </header>
  )
}

/**
 * Initials, not a photo. The Figma header shows a stock portrait; shipping one would put
 * a stranger's face on the persona's account, and there is no real user to photograph.
 */
function Avatar() {
  return (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--navy-soft)] font-heading font-bold text-white"
      style={{ fontSize: 'var(--text-meta)' }}
    >
      NK
    </span>
  )
}
