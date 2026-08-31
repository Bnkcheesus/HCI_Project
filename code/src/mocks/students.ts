// Mock library cards — backs Job 3 / Pain Reliever 3 / Product-Service 3 (tự mượn tại
// kiosk). Maps to the DetectedStudent block in kiosk-book-scan-step2 (24:72).
//
// Four cards, one per outcome the self-checkout has to handle. A real library blocks a
// borrow for concrete reasons; the prototype only ever showed "Thẻ thư viện hợp lệ",
// so these exist to make each refusal demonstrable at the kiosk.

import { isoDate } from '@/shared/borrowRules'
import type { Student } from '@/shared/types'

export type { Student } from '@/shared/types'

/**
 * Days from today as an ISO date — keeps the demo data correct whenever it is run.
 *
 * Local date, via the shared `isoDate`, not `toISOString().slice(0, 10)`. In UTC+7 those
 * two disagree for the last seven hours of every day, so a card seeded at 9pm got an
 * expiry dated tomorrow while the eligibility check compared it against today. Harmless
 * while both halves guessed the same way; not harmless once the dates are columns in a
 * database read back by a server that may run in a different zone.
 */
export function isoDaysFromNow(days: number, now = new Date()): string {
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return isoDate(date)
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
  {
    // The persona this whole project is built for (persona.md).
    cardCode: '25215012',
    name: 'Lê Trang Anh',
    studentId: '25215012',
    faculty: 'Khoa Công nghệ Thông tin',
    expiresAt: isoDaysFromNow(400),
  },
]

export function findStudentByCard(cardCode: string): Student | undefined {
  return students.find((s) => s.cardCode === cardCode.trim())
}
