// Mock library floor map / shelf location — backs Product-Service 2 / Gain Creator 2
// (bản đồ định vị kệ sách trên kiosk, xuất QR sang di động).
// Maps to the "MapView" / "FloorMap" nodes shared across kiosk-book-info, Phone-Location.

export interface ShelfLocation {
  shelfCode: string
  floor: number
  zone: string
  /** Which shelf run on the floor plan this book sits in (0 = nearest the entrance). */
  aisle: number
  /** How far along that run, 0 = aisle mouth, 1 = far wall. */
  alongAisle: number
  /** Walking distance from this kiosk, in metres. */
  distanceMetres: number
  /**
   * Turn-by-turn wording. The persona's pain point is explicitly that a picture-only map
   * is hard to use (Pain Reliever 5 / Gain 6 — "chỉ dẫn vị trí bằng văn bản rõ ràng"),
   * so the route must be readable, not only drawable.
   */
  directions: string[]
}

export const shelfLocations: Record<string, ShelfLocation> = {
  A3: {
    shelfCode: 'A3',
    floor: 2,
    zone: 'Khu Machine Learning',
    aisle: 2,
    alongAisle: 0.35,
    distanceMetres: 15,
    directions: ['Đi thẳng khoảng 15m', 'Rẽ phải vào dãy kệ A', 'Kệ số 3, hàng thứ 2 từ trên xuống'],
  },
  A4: {
    shelfCode: 'A4',
    floor: 2,
    zone: 'Khu Machine Learning',
    aisle: 3,
    alongAisle: 0.3,
    distanceMetres: 17,
    directions: ['Đi thẳng khoảng 17m', 'Rẽ phải vào dãy kệ A', 'Kệ số 4, hàng thứ 1 từ trên xuống'],
  },
  A5: {
    shelfCode: 'A5',
    floor: 2,
    zone: 'Khu Machine Learning',
    aisle: 4,
    alongAisle: 0.45,
    distanceMetres: 19,
    directions: ['Đi thẳng khoảng 19m', 'Rẽ phải vào dãy kệ A', 'Kệ số 5, hàng thứ 3 từ trên xuống'],
  },
  B2: {
    shelfCode: 'B2',
    floor: 2,
    zone: 'Khu Toán ứng dụng',
    aisle: 1,
    alongAisle: 0.55,
    distanceMetres: 22,
    directions: ['Đi thẳng khoảng 22m', 'Rẽ trái vào dãy kệ B', 'Kệ số 2, hàng thứ 2 từ trên xuống'],
  },
  'MA-101': {
    shelfCode: 'MA-101',
    floor: 1,
    zone: 'Khu Toán đại cương',
    aisle: 0,
    alongAisle: 0.3,
    distanceMetres: 12,
    directions: ['Đi thẳng khoảng 12m', 'Rẽ trái ở quầy thủ thư', 'Kệ MA-101, hàng thứ 1 từ trên xuống'],
  },
  'MA-215': {
    shelfCode: 'MA-215',
    floor: 1,
    zone: 'Khu Toán đại cương',
    aisle: 1,
    alongAisle: 0.35,
    distanceMetres: 14,
    directions: ['Đi thẳng khoảng 14m', 'Rẽ trái ở quầy thủ thư', 'Kệ MA-215, hàng thứ 3 từ trên xuống'],
  },
  'PH-204': {
    shelfCode: 'PH-204',
    floor: 1,
    zone: 'Khu Vật lý',
    aisle: 2,
    alongAisle: 0.6,
    distanceMetres: 18,
    directions: ['Đi thẳng khoảng 18m', 'Rẽ phải vào khu Vật lý', 'Kệ PH-204, hàng thứ 2 từ trên xuống'],
  },
  'CS-312': {
    shelfCode: 'CS-312',
    floor: 2,
    zone: 'Khu Công nghệ thông tin',
    aisle: 3,
    alongAisle: 0.65,
    distanceMetres: 25,
    directions: ['Lên tầng 2 bằng thang bộ bên trái', 'Đi thẳng khoảng 25m', 'Kệ CS-312, hàng thứ 2'],
  },
  J1: {
    shelfCode: 'J1',
    floor: 3,
    zone: 'Khu Báo & Tạp chí',
    aisle: 0,
    alongAisle: 0.55,
    distanceMetres: 30,
    directions: ['Lên tầng 3 bằng thang máy', 'Rẽ phải vào khu Báo & Tạp chí', 'Kệ J1'],
  },
  J2: {
    shelfCode: 'J2',
    floor: 3,
    zone: 'Khu Báo & Tạp chí',
    aisle: 1,
    alongAisle: 0.7,
    distanceMetres: 32,
    directions: ['Lên tầng 3 bằng thang máy', 'Rẽ phải vào khu Báo & Tạp chí', 'Kệ J2'],
  },
  M1: {
    shelfCode: 'M1',
    floor: 3,
    zone: 'Khu Báo & Tạp chí',
    aisle: 4,
    alongAisle: 0.25,
    distanceMetres: 34,
    directions: ['Lên tầng 3 bằng thang máy', 'Đi thẳng tới cuối dãy', 'Kệ M1'],
  },
}

/** Number of shelf runs drawn on the floor plan. */
export const AISLE_COUNT = 5
