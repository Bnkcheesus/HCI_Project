// Mock library cards — backs Job 3 / Pain Reliever 3 / Product-Service 3 (tự mượn tại
// kiosk). Maps to the DetectedStudent block in kiosk-book-scan-step2 (24:72).
//
// Four cards, one per outcome the self-checkout has to handle. A real library blocks a
// borrow for concrete reasons; the prototype only ever showed "Thẻ thư viện hợp lệ",
// so these exist to make each refusal demonstrable at the kiosk.

export interface Student {
  /** The number printed on the card and typed on the numeric keypad. */
  cardCode: string
  name: string
  studentId: string
  faculty: string
  /** ISO date the card stops being valid. */
  expiresAt: string
}

/** Days from today as an ISO date — keeps the demo data correct whenever it is run. */
export function isoDaysFromNow(days: number, now = new Date()): string {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export const students: Student[] = [
  {
    // The persona this whole project is built for (persona.md).
    cardCode: '20215012',
    name: 'Nguyễn Minh Khang',
    studentId: '20215012',
    faculty: 'Khoa Công nghệ Thông tin',
    expiresAt: isoDaysFromNow(300),
  },
  {
    cardCode: '20219999',
    name: 'Trần Thu Hà',
    studentId: '20219999',
    faculty: 'Khoa Toán — Tin học',
    // Already lapsed: demonstrates the expired-card refusal.
    expiresAt: isoDaysFromNow(-30),
  },
  {
    cardCode: '20218888',
    name: 'Lê Văn Nam',
    studentId: '20218888',
    faculty: 'Khoa Vật lý',
    expiresAt: isoDaysFromNow(200),
  },
  {
    cardCode: '20217777',
    name: 'Phạm Gia Bảo',
    studentId: '20217777',
    faculty: 'Khoa Công nghệ Thông tin',
    expiresAt: isoDaysFromNow(150),
  },
]

export function findStudentByCard(cardCode: string): Student | undefined {
  return students.find((s) => s.cardCode === cardCode.trim())
}
