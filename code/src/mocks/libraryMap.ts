// Mock library floor map / shelf location — backs Product-Service 2 / Gain Creator 2
// (bản đồ định vị kệ sách trên kiosk, xuất QR sang di động).
// Maps to the "MapView" / "FloorMap" nodes shared across kiosk-book-info, Phone-Location.

export interface ShelfLocation {
  shelfCode: string
  floor: number
  zone: string
  x: number // relative position on the floor map, 0–1
  y: number
}

export const shelfLocations: Record<string, ShelfLocation> = {
  'CS-519': {
    shelfCode: 'CS-519',
    floor: 2,
    zone: 'Khu Công nghệ thông tin',
    x: 0.62,
    y: 0.34,
  },
}
