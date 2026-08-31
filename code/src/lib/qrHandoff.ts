/**
 * Resolving what a scanned code means — the receiving half of Gain Creator 2, the kiosk's
 * "bản đồ định vị… xuất QR sang di động".
 *
 * The kiosk paints its QR with `LocationQr`, which encodes a full URL:
 *
 *     https://<host>/mobile/location?book=<bookId>
 *
 * So a real scan yields a URL, not a code. But the same screen also has to accept what a
 * person types when the camera is not an option — an ISBN off the back of the book — and
 * a slip number, because `/mobile/phieu-muon?slip=` is still a route a QR could carry.
 * All three settle into the same answer: a path to send the reader to.
 *
 * Pure on purpose: no router, no DOM. The screen decides how to *show* a failure; this
 * decides what the code *is*, and that is the part worth testing on its own.
 */
import { findBookByCode } from './borrow'
import { books } from '@/mocks'

/** Printed by `createLoanSlip` and `historySlipId` — e.g. SLIP-2026-0824-5012. */
const SLIP_PATTERN = /^SLIP-\d{4}-\d{4}-\d{4}$/i

export type HandoffFailure =
  /** Nothing to resolve — an empty field, or a scan that read no payload. */
  | 'empty'
  /** A well-formed URL, but not one of ours: someone scanned a poster or a wifi code. */
  | 'foreign'
  /** Looks like one of our codes but names nothing in the catalogue. */
  | 'not-found'

export const HANDOFF_FAILURE_MESSAGE: Record<HandoffFailure, string> = {
  empty: 'Chưa có mã nào để mở. Nhập mã ISBN sau bìa sách hoặc mã phiếu mượn.',
  foreign: 'Mã này không phải của LibAssist. Hãy quét mã QR hiện trên màn hình kiosk.',
  'not-found':
    'Không tìm thấy tài liệu ứng với mã này. Kiểm tra lại mã ISBN sau bìa sách rồi thử lần nữa.',
}

export type Handoff =
  | { ok: true; kind: 'location'; bookId: string; path: string }
  | { ok: true; kind: 'slip'; slipId: string; path: string }
  | { ok: false; failure: HandoffFailure }

const toLocation = (bookId: string): Handoff => ({
  ok: true,
  kind: 'location',
  bookId,
  path: `/mobile/location?book=${encodeURIComponent(bookId)}`,
})

const toSlip = (slipId: string): Handoff => ({
  ok: true,
  kind: 'slip',
  slipId,
  path: `/mobile/phieu-muon?slip=${encodeURIComponent(slipId)}`,
})

/**
 * A URL is only ours if its *path* is one of the two handoff routes. Matching on substring
 * would let `https://evil.example/?next=/mobile/location?book=x` through, and a screen
 * that navigates wherever a scanned code tells it to is a screen worth being careful with
 * even when the navigation is internal.
 */
function fromUrl(raw: string): Handoff | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, failure: 'foreign' }

  const path = url.pathname.replace(/\/+$/, '')

  if (path === '/mobile/location') {
    const bookId = url.searchParams.get('book')?.trim()
    if (!bookId) return { ok: false, failure: 'not-found' }
    return books.some((b) => b.id === bookId)
      ? toLocation(bookId)
      : { ok: false, failure: 'not-found' }
  }

  if (path === '/mobile/phieu-muon') {
    const slipId = url.searchParams.get('slip')?.trim()
    if (!slipId) return { ok: false, failure: 'not-found' }
    return toSlip(slipId.toUpperCase())
  }

  return { ok: false, failure: 'foreign' }
}

/** What a scanned QR, or a typed code, should open. */
export function resolveHandoff(raw: string): Handoff {
  const input = raw.trim()
  if (!input) return { ok: false, failure: 'empty' }

  const fromScannedUrl = fromUrl(input)
  if (fromScannedUrl) return fromScannedUrl

  if (SLIP_PATTERN.test(input)) return toSlip(input.toUpperCase())

  // Reuses the kiosk's own ISBN lookup, spaces and dashes and all, so a code that works at
  // the kiosk works here — two spellings of "valid ISBN" would be a bug waiting to happen.
  const book = findBookByCode(input)
  return book ? toLocation(book.id) : { ok: false, failure: 'not-found' }
}
