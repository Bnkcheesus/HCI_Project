/**
 * The domain shapes, shared by the browser and the server.
 *
 * These interfaces used to live next to the mock data that happened to be the only thing
 * with those shapes. Now they are the *wire* contract: what the API sends, what the
 * database rows map onto, and what the React components render. One definition, so a
 * column rename cannot quietly disagree with a component's prop type.
 *
 * Data lives elsewhere — `src/mocks/` (seed + test fixtures) and the database. This file
 * is types only, plus the label maps that pair with the string unions.
 */

/* ----------------------------------------------------------------------- catalogue */

/** Document type, used by the result-type filter chips on the results screen. */
export type DocumentType = 'book' | 'journal' | 'magazine'

/** Catalogue language, used by the advanced-filter language checkboxes. */
export type Language = 'vi' | 'en'

export const LANGUAGE_LABEL: Record<Language, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
}

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  book: 'Sách',
  journal: 'Báo khoa học',
  magazine: 'Tạp chí',
}

export interface Book {
  id: string
  title: string
  /** ISBN-13, the code the self-checkout scanner reads off the back cover. */
  isbn: string
  author: string
  subject: string
  type: DocumentType
  coverUrl?: string
  /** Fallback spine color when no cover art exists — the editorial motif on book cards. */
  spine: 1 | 2 | 3 | 4
  description: string
  shelfCode: string
  /** Floor the shelf sits on — shown as "Kệ A3 · Tầng 2". */
  floor: number
  /** Publication year, filtered by the advanced-filter year range. */
  year: number
  language: Language
}

/* --------------------------------------------------------------------- availability */

export type AvailabilityStatus = 'available' | 'borrowed' | 'reserved'

export interface Availability {
  bookId: string
  status: AvailabilityStatus
  copiesTotal: number
  copiesAvailable: number
  /**
   * When every copy is out, when the next one is due back.
   *
   * A display string in `dd/MM` ("Chờ trả: 25/11"), not an ISO date — which is why the
   * column holding it is a short string and not a `date`. Every other date in the system
   * is ISO; this one is the exception, and it is deliberate.
   */
  dueBack?: string
}

/* ------------------------------------------------------------------------ the map */

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

/**
 * Number of shelf runs drawn on the floor plan.
 *
 * Geometry rather than data, which is why it is a constant here and not a column: the map
 * component draws this many aisles, and the catalogue generator places shelves into them.
 * The two have to agree or a shelf lands outside the drawing.
 */
export const AISLE_COUNT = 5

/* --------------------------------------------------------------------- library card */

export interface Student {
  /** The number printed on the card and typed on the numeric keypad. */
  cardCode: string
  name: string
  studentId: string
  faculty: string
  /** ISO date the card stops being valid. */
  expiresAt: string
}

/* --------------------------------------------------------------------------- loans */

export interface LoanRecord {
  id: string
  /**
   * The slip this book went out on. Books borrowed in one visit share it — that is what
   * makes a four-book loan one slip rather than four coincidences with matching dates.
   */
  slipId: string
  /** Card the loan sits against. */
  studentId: string
  bookId: string
  borrowedAt: string // ISO date
  dueAt: string // ISO date
  returnedAt: string | null
}

export interface LoanSlip {
  id: string
  studentName: string
  studentId: string
  bookIds: string[]
  borrowedAt: string
  dueAt: string
}

/* ------------------------------------------------------------------ borrowing rules */

export type BlockCode = 'card-expired' | 'overdue' | 'limit'

export interface BorrowBlock {
  code: BlockCode
  message: string
  /** What the reader can actually do about it — a refusal without a way out is a dead end. */
  hint: string
}

/* --------------------------------------------------------------------- the account */

export interface AccountSlipBook {
  bookId: string
  /** ISO date, or null while the book is still out. */
  returnedAt: string | null
}

export interface AccountSlip {
  id: string
  borrowedAt: string
  dueAt: string
  books: AccountSlipBook[]
  /** Where the slip came from. Both carry a real slip number; only the display differs. */
  source: 'history' | 'kiosk'
}

/* ------------------------------------------------------------------ library status */

export interface LibraryStatus {
  isOpen: boolean
  opensAt: string
  closesAt: string
  titlesTotal: number
  titlesAvailable: number
  supportPhone: string
}
