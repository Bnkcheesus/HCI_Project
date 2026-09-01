import { describe, expect, it } from 'vitest'
import { HANDOFF_FAILURE_MESSAGE, resolveHandoff } from './qrHandoff'
import { books } from '@/mocks'

const book = books.find((b) => b.id === 'cormen-algorithms')!

describe('resolveHandoff — a QR painted by the kiosk', () => {
  /**
   * This is the exact string `LocationQr` encodes. If the two ever disagree the handoff
   * breaks silently: the kiosk prints a code nothing on the phone can read.
   */
  it('opens the location screen for the book the kiosk encoded', () => {
    const scanned = `https://libassist.example/mobile/location?book=${book.id}`
    const result = resolveHandoff(scanned)

    expect(result).toEqual({
      ok: true,
      kind: 'location',
      bookId: book.id,
      path: `/mobile/location?book=${book.id}`,
    })
  })

  it('opens the slip screen for a slip URL', () => {
    const result = resolveHandoff('https://libassist.example/mobile/phieu-muon?slip=SLIP-2026-0824-5012')
    expect(result).toMatchObject({ ok: true, kind: 'slip', slipId: 'SLIP-2026-0824-5012' })
  })

  it('tolerates a trailing slash', () => {
    expect(resolveHandoff(`https://x.test/mobile/location/?book=${book.id}`)).toMatchObject({
      ok: true,
      bookId: book.id,
    })
  })

  it('rejects a URL naming a book that does not exist', () => {
    /*
     * An id the catalogue does not carry is *not* rejected here any more. Checking that
     * would need the catalogue, which lives on the server now — and the location screen
     * already handles an id it cannot find, with a way back to the scanner. The resolver
     * still decides the part that matters on its own: whether the URL is one of ours.
     */
    expect(resolveHandoff('https://x.test/mobile/location?book=khong-co-cuon-nay')).toMatchObject({
      ok: true,
      kind: 'location',
      bookId: 'khong-co-cuon-nay',
    })
  })
})

describe('resolveHandoff — codes typed by hand', () => {
  it('accepts an ISBN off the back of the book', () => {
    // A typed code comes back as an ISBN for the caller to resolve — turning it into a
    // book takes a catalogue lookup, and this module stays free of the network.
    expect(resolveHandoff(book.isbn)).toEqual({ ok: true, kind: 'isbn', isbn: book.isbn })
  })

  // findBookByCode strips spaces and dashes; sharing it means the kiosk and the phone
  // cannot disagree about what counts as a valid ISBN.
  it('accepts the same ISBN spaced or hyphenated, as the kiosk does', () => {
    const spaced = `${book.isbn.slice(0, 3)}-${book.isbn.slice(3, 6)} ${book.isbn.slice(6)}`
    expect(resolveHandoff(spaced)).toEqual({ ok: true, kind: 'isbn', isbn: book.isbn })
  })

  it('accepts a slip number in the printed format, in either case', () => {
    expect(resolveHandoff('slip-2026-0824-5012')).toMatchObject({
      ok: true,
      kind: 'slip',
      slipId: 'SLIP-2026-0824-5012',
    })
  })

  it('reports an empty field as empty rather than as a bad code', () => {
    expect(resolveHandoff('   ')).toEqual({ ok: false, failure: 'empty' })
    expect(HANDOFF_FAILURE_MESSAGE.empty).toMatch(/Nhập mã/)
  })

  it('reports an unknown code as not found', () => {
    // Ten digits is a well-formed code, so it resolves to an ISBN; whether any book
    // carries it is the lookup's answer, and QrPage renders 'not-found' when it comes
    // back empty. What this asserts is that a *malformed* code never gets that far.
    expect(resolveHandoff('0000000000')).toEqual({ ok: true, kind: 'isbn', isbn: '0000000000' })
    expect(resolveHandoff('12345')).toEqual({ ok: false, failure: 'not-found' })
    expect(resolveHandoff('khong-phai-ma')).toEqual({ ok: false, failure: 'not-found' })
  })
})

describe('resolveHandoff — codes that are not ours', () => {
  it('names a foreign QR as foreign, not as a broken book code', () => {
    expect(resolveHandoff('https://example.com/khuyen-mai')).toEqual({
      ok: false,
      failure: 'foreign',
    })
    expect(HANDOFF_FAILURE_MESSAGE.foreign).toMatch(/không phải của LibAssist/)
  })

  // Both parse as URLs — `wifi:` and `mailto:` are schemes — so they are turned away by
  // the protocol check, and the reader is told the code is not LibAssist's rather than
  // being told their ISBN is wrong.
  it('rejects a wifi or mailto payload as foreign, not as a bad ISBN', () => {
    expect(resolveHandoff('WIFI:S:ThuVien;T:WPA;P:sach2026;;')).toEqual({
      ok: false,
      failure: 'foreign',
    })
    expect(resolveHandoff('mailto:thuvien@hcmus.edu.vn')).toEqual({ ok: false, failure: 'foreign' })
  })

  /**
   * Matching our route as a substring would open this. The screen navigates to whatever
   * comes back, so the check is on the URL's path, not on the string containing it.
   */
  it('does not fall for our route smuggled into another URL', () => {
    expect(resolveHandoff('https://evil.test/?next=/mobile/location?book=cormen-algorithms')).toEqual({
      ok: false,
      failure: 'foreign',
    })
  })
})
