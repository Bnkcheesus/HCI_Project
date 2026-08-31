import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

/**
 * The book cover, enlarged over a dimmed page — Product/Service 5 / Pain Reliever 5.
 *
 * Not decoration. The persona has thị lực kém, and the cover on the detail screen is a
 * 160px thumbnail: the edition, the subtitle and the volume number printed on real cover
 * art are simply unreadable at that size. Job 2 is "confirm this is the right book before
 * walking to the shelf", and for this reader that confirmation needs the artwork legible.
 *
 * Hand-rolled rather than pulled from a dialog library: the repo carries only the `button`
 * and `input` shadcn primitives, and this needs one control and one image.
 */

interface CoverLightboxProps {
  src: string
  title: string
  onClose: () => void
}

export function CoverLightbox({ src, title, onClose }: CoverLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    /*
     * Focus moves into the dialog and is held there. There is exactly one control inside,
     * so the trap is "Tab does nothing" rather than a ring of focusable nodes — without it
     * a keyboard user tabs straight out into the page behind the dim, which is still there
     * and still clickable to a screen reader even though nobody can see it.
     */
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        event.preventDefault()
        closeRef.current?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Back to the cover the reader opened, not to the top of the document.
      previous?.focus?.()
    }
  }, [onClose])

  return (
    // Fixed, not absolute: the page behind must not scroll or shift, and a kiosk has no
    // scrollbar to recover with if it does.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cover-lightbox-title"
      // Plain black rather than a token: accessibility mode collapses --ink and --rule onto
      // the same black, and a dim built from either would stop being a dim the moment the
      // surface behind it turned white.
      className="kiosk-rise fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/75 p-10"
      onClick={onClose}
    >
      {/*
        stopPropagation on the image only. Everything else in the overlay — the dim, the
        margins either side of a portrait cover — closes on tap, which is how a reader
        expects to dismiss this and the only gesture that works without aiming.
      */}
      {/*
        The width is *set*, not capped. Left to `max-w` the image renders at its natural
        size, and these covers are small: the median is 371px and fourteen of them are
        128px — narrower than the 158px thumbnail this button sits on, so "enlarge" would
        have handed the reader a smaller picture than the one they tapped.
        Upscaling costs sharpness. For a reader who cannot read the thumbnail at all, a
        soft 480px cover is the one that answers the question; a crisp 128px one is not.
      */}
      <img
        src={src}
        alt={`Bìa sách ${title}`}
        onClick={(e) => e.stopPropagation()}
        className="h-auto max-h-[70vh] w-[min(90vw,480px)] rounded-[8px] object-contain shadow-[var(--lift-2)]"
      />

      <p
        id="cover-lightbox-title"
        onClick={(e) => e.stopPropagation()}
        className="max-w-[min(90vw,720px)] text-center font-heading font-bold text-white"
        style={{ fontSize: 'var(--text-title)' }}
      >
        {title}
      </p>

      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        className="inline-flex min-h-[var(--touch-min)] items-center gap-3 rounded-[6px] bg-card px-8 font-heading font-bold text-foreground shadow-[var(--btn-shadow)] transition-colors hover:bg-secondary"
        style={{ fontSize: 'var(--text-tab)' }}
      >
        <X className="size-6 shrink-0" aria-hidden />
        Đóng
      </button>
    </div>
  )
}
