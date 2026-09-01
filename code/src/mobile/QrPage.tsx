// Implements Gain 2 / Gain Creator 2 — the receiving end of the kiosk's QR handoff, so
// the shelf directions travel to the reader's phone instead of into their memory.
// Figma frame: Phone-QR (41:598).
import { AlertCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileFrame } from '@/components/mobile/MobileFrame'
import { ScannerViewport } from '@/components/kiosk/ScannerViewport'
import { HANDOFF_FAILURE_MESSAGE, locationPath, resolveHandoff } from '@/lib/qrHandoff'
import { apiGetOrNull } from '@/api/client'
import { useBorrowableBooks } from '@/api/queries'
import type { Book } from '@/shared/types'

/**
 * The Figma frame is a single static tile: a grey QR glyph over "Quét mã QR trên màn hình
 * Kiosk". It says what to do and offers no way to do it, which would leave the QR the
 * kiosk actually paints pointing at a screen that cannot receive it.
 *
 * So this keeps the frame's tile and shape, and puts the kiosk's own `ScannerViewport`
 * inside it — the same dashed window, scanline and "mô phỏng" button used at the two scan
 * steps. That component exists precisely because there is no camera behind this build, and
 * its rule holds here: never draw a fake live feed, name the simulation as a simulation.
 * Manual entry sits underneath for the same reason the kiosk pairs its scanner with a code
 * field — a barcode too worn to read still has digits a person can type.
 */
export function QrPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { data: borrowable } = useBorrowableBooks()

  /** Everything a scan or a typed code funnels through, so both take the same route out. */
  async function open(raw: string) {
    const result = resolveHandoff(raw)
    if (!result.ok) {
      setError(HANDOFF_FAILURE_MESSAGE[result.failure])
      return
    }

    /*
     * A typed ISBN is the one code the resolver cannot finish on its own: turning it into
     * a book needs the catalogue, which lives on the server now. A scanned kiosk URL
     * already carries the book id and never gets here.
     */
    if (result.kind === 'isbn') {
      const found = await apiGetOrNull<{ book: Book }>(
        `/api/books/by-isbn/${encodeURIComponent(result.isbn)}`,
      ).catch(() => null)

      if (!found) {
        setError(HANDOFF_FAILURE_MESSAGE['not-found'])
        return
      }
      setError(null)
      navigate(locationPath(found.book.id))
      return
    }

    setError(null)
    navigate(result.path)
  }

  /**
   * Stands in for the camera. Builds the *same URL string* `LocationQr` encodes rather
   * than jumping straight to the path, so the simulated scan exercises the real resolver:
   * if the two ever drift apart, this is where it shows.
   *
   * The book it "reads" is one with a copy on the shelf, so the screen it opens is the
   * useful one — walking a demo to a shelf with nothing on it proves nothing.
   */
  function simulateScan() {
    const target = borrowable?.books[0]
    if (target) void open(`${window.location.origin}/mobile/location?book=${target.id}`)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void open(code)
  }

  return (
    <MobileFrame title="Quét mã QR từ kiosk" backTo="/mobile">
      {/*
        No white card around the viewport. The Figma frame nests one, but the viewport is
        already a bordered surface, and on a 667px phone that outer box cost 32px of
        padding to draw a box inside a box — which is 32px taken from "Mở chỉ dẫn", the
        one control on this screen that was ending up clipped.

        The frame's caption ("Quét mã QR trên màn hình Kiosk") is not dropped, it is moved:
        the title pill above now reads "Quét mã QR từ kiosk", which says the same thing in
        the space the screen was already spending. A separate line of instruction cost 40px
        and the viewport needed them: at anything under h-56 it clipped its own note. h-56 is
        also exactly the band the kiosk gives this component, so it is used at its natural
        size on both surfaces rather than squeezed on one.
      */}
      <div className="h-56">
        <ScannerViewport kind="book" onSimulate={simulateScan} simulateLabel="Mô phỏng quét" />
      </div>


      <form onSubmit={submit} className="flex flex-col gap-2">
        <label
          htmlFor="mobile-handoff-code"
          className="font-heading font-semibold text-foreground"
          style={{ fontSize: 'var(--text-meta)' }}
        >
          Hoặc nhập mã ISBN sau bìa sách
        </label>

        <div
          data-kiosk-surface
          className="flex items-center rounded-[6px] border border-[var(--sunken)] bg-card px-4 shadow-[var(--field-shadow)] focus-within:border-primary"
        >
          <input
            id="mobile-handoff-code"
            data-inner-focus
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setError(null)
            }}
            placeholder="Ví dụ: 9780262046305"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'mobile-handoff-error' : undefined}
            // No inputMode="numeric": a slip number carries letters, and a phone that
            // offers only digits would make one of the two accepted codes untypable.
            className="min-h-[var(--touch-min)] w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-[var(--ink-faint)]"
            style={{ fontSize: 'var(--text-body)' }}
          />
        </div>

        {/* aria-live: the reader may be looking at the shelf, not at the screen. */}
        <p
          id="mobile-handoff-error"
          role="status"
          aria-live="polite"
          className="flex min-h-6 items-start gap-2 text-[var(--destructive)]"
          style={{ fontSize: 'var(--text-meta)' }}
        >
          {error && (
            <>
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </>
          )}
        </p>

        <button
          type="submit"
          className="inline-flex min-h-[var(--touch-min)] w-full items-center justify-center rounded-[6px] bg-primary px-6 font-heading font-bold text-primary-foreground shadow-[var(--btn-shadow)] transition-[background,box-shadow] duration-150 active:brightness-95"
          style={{ fontSize: 'var(--text-tab)' }}
        >
          Mở chỉ dẫn
        </button>
      </form>
    </MobileFrame>
  )
}
