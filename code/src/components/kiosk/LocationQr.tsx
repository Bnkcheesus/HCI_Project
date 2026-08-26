import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/**
 * Scannable QR that carries the route onto the reader's phone — Product/Service 2 /
 * Gain Creator 2 ("bản đồ định vị… xuất QR sang di động"). The Figma frame had the
 * caption but no code; this generates a real one pointing at the mobile location screen,
 * so the hand-off can actually be demonstrated.
 */

interface LocationQrProps {
  bookId: string
  caption: string
}

export function LocationQr({ bookId, caption }: LocationQrProps) {
  const [src, setSrc] = useState<string | null>(null)
  const target = `${window.location.origin}/mobile/location?book=${encodeURIComponent(bookId)}`

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
        className="grid size-28 place-items-center overflow-hidden rounded-xl border border-[var(--rule)] bg-white p-1.5"
      >
        {src ? (
          <img src={src} alt={`Mã QR mở chỉ dẫn tới sách trên điện thoại: ${target}`} className="size-full" />
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
