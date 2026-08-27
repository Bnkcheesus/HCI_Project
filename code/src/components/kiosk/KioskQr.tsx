import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { cn } from '@/lib/utils'

/**
 * Scannable hand-off from the kiosk to the reader's phone. Used for the shelf directions
 * (Gain Creator 2 — "xuất QR sang di động") and for the loan slip (Gain Creator 3 —
 * "in phiếu hoặc đồng bộ app").
 */

interface KioskQrProps {
  /** Absolute or app-relative URL the code points at. */
  target: string
  alt: string
  caption: string
  size?: 'sm' | 'lg'
}

export function KioskQr({ target, alt, caption, size = 'sm' }: KioskQrProps) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(target, {
      margin: 1,
      width: 320,
      color: { dark: '#16192b', light: '#ffffff' },
    })
      .then((url) => {
        if (alive) setSrc(url)
      })
      .catch(() => {
        if (alive) setSrc(null)
      })
    return () => {
      alive = false
    }
  }, [target])

  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        data-kiosk-surface
        className={cn(
          'grid place-items-center overflow-hidden rounded-[8px] border border-[var(--rule)] bg-white p-1.5',
          size === 'lg' ? 'size-40' : 'size-28',
        )}
      >
        {src ? (
          <img src={src} alt={alt} className="size-full" />
        ) : (
          <span className="sr-only">Đang tạo mã QR</span>
        )}
      </div>
      <figcaption
        className="text-center font-heading font-semibold text-muted-foreground"
        style={{ fontSize: 'var(--text-eyebrow)' }}
      >
        {caption}
      </figcaption>
    </figure>
  )
}
