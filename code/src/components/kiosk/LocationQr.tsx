import { KioskQr } from '@/components/kiosk/KioskQr'

/**
 * Scannable QR that carries the shelf directions onto the reader's phone —
 * Product/Service 2 / Gain Creator 2 ("bản đồ định vị… xuất QR sang di động"). The Figma
 * frame had the caption but no code; this generates a real one pointing at the mobile
 * location screen, so the hand-off can actually be demonstrated.
 */

interface LocationQrProps {
  bookId: string
  caption: string
}

export function LocationQr({ bookId, caption }: LocationQrProps) {
  const target = `${window.location.origin}/mobile/location?book=${encodeURIComponent(bookId)}`

  return (
    <KioskQr
      target={target}
      alt={`Mã QR mở chỉ dẫn tới sách trên điện thoại: ${target}`}
      caption={caption}
    />
  )
}
