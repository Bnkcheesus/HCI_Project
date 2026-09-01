/**
 * Every read the app makes, as a hook.
 *
 * The rule these enforce: **a page fetches, a leaf component receives props.** Before the
 * backend existed, any component anywhere could reach for `availability[book.id]` — a
 * global read from the bottom of the component tree. That is what made the cut to an API
 * a 27-file change. Keeping the fetches at page level means a future change of data source
 * is again a change to a handful of files, not to everything that draws a chip.
 *
 * Availability is deliberately never fetched on its own alongside a book list: the
 * endpoints return `{ books, availability }` together, because the chip sits on the same
 * card as the title and two requests would let them disagree on screen.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AccountSlip,
  Availability,
  Book,
  BorrowBlock,
  LibraryStatus,
  LoanSlip,
  ShelfLocation,
  Student,
} from '@/shared/types'
import type { LibrarianIntent } from '@/shared/librarian'
import { apiGet, apiGetOrNull, apiPost, idsParam } from './client'

/* ------------------------------------------------------------------ response shapes */

export interface BookList {
  books: Book[]
  availability: Record<string, Availability>
}

/** `by-ids` also carries the shelves those books sit on — see the route for why. */
export interface BookSet extends BookList {
  shelves: Record<string, ShelfLocation>
}

export interface BookDetail {
  book: Book
  availability: Availability | undefined
  shelf: ShelfLocation | undefined
}

export interface LibraryInfo {
  status: LibraryStatus
  popularSubjects: string[]
  /** Bounds of the advanced filter's year slider — the catalogue's real span. */
  yearMin: number
  yearMax: number
}

export interface CardCheck {
  student: Student
  /** Every reason this card cannot borrow. Empty means it can. */
  blocks: BorrowBlock[]
}

export interface AccountView {
  student: Student
  slips: AccountSlip[]
}

export interface LibrarianAnswer {
  intent: LibrarianIntent
  text: string
  bookIds: string[]
}

/* ------------------------------------------------------------------------ query keys */

/**
 * Keys in one place so an invalidation cannot miss a cache by spelling its key
 * differently. `['books']` is the prefix every catalogue query shares, which is what
 * lets a confirmed borrow invalidate all of them at once.
 */
export const keys = {
  books: ['books'] as const,
  search: (q: string) => ['books', 'search', q] as const,
  suggested: () => ['books', 'suggested'] as const,
  byIds: (ids: string[]) => ['books', 'by-ids', ids.join(',')] as const,
  book: (id: string) => ['books', 'detail', id] as const,
  library: ['library'] as const,
  card: (code: string, cartSize: number) => ['card', code, cartSize] as const,
  account: (code: string) => ['account', code] as const,
  slip: (id: string) => ['slip', id] as const,
}

/* --------------------------------------------------------------------------- reads */

/**
 * Search results — Job 1.
 *
 * Disabled on an empty query rather than fetching one: the results screen shows its own
 * empty state, and asking the server for "" would be a round trip whose answer is known.
 */
export function useSearchBooks(query: string) {
  const q = query.trim()
  return useQuery({
    queryKey: keys.search(q),
    queryFn: () => apiGet<BookList>(`/api/books?q=${encodeURIComponent(q)}`),
    enabled: q.length > 0,
  })
}

/**
 * Books with a copy on the shelf. Used by the kiosk's simulated scanner, which must not
 * "read" a book the checkout would then refuse for having none left.
 */
export function useBorrowableBooks() {
  return useQuery({
    queryKey: [...keys.books, 'borrowable'] as const,
    queryFn: () => apiGet<BookList>('/api/books/borrowable'),
  })
}

/** The four curated books on the kiosk home screen — Gain Creator 1. */
export function useSuggestedBooks() {
  return useQuery({
    queryKey: keys.suggested(),
    queryFn: () => apiGet<BookList>('/api/books/suggested'),
  })
}

/**
 * A named set of books — the contents of a loan slip or a checkout cart, which hold ids.
 * One request for the set, not one per book.
 */
export function useBooksByIds(ids: string[]) {
  return useQuery({
    queryKey: keys.byIds(ids),
    queryFn: () => apiGet<BookSet>(`/api/books/by-ids?ids=${idsParam(ids)}`),
    enabled: ids.length > 0,
  })
}

/**
 * One book with its copy count and its route to the shelf — Job 2.
 *
 * `null` means the id names nothing, which the detail screen renders as "Không tìm thấy
 * tài liệu này" rather than treating as an error.
 */
export function useBookDetail(bookId: string | undefined) {
  return useQuery({
    queryKey: keys.book(bookId ?? ''),
    queryFn: () => apiGetOrNull<BookDetail>(`/api/books/${encodeURIComponent(bookId!)}`),
    enabled: Boolean(bookId),
  })
}

/**
 * Opening hours, collection counts, subject shortcuts and the year bounds.
 *
 * All four used to be module-level constants the client computed from the catalogue at
 * import time. With the catalogue in a database there is nothing to compute from, so they
 * arrive together — one request the whole app shares through the cache.
 */
export function useLibraryInfo() {
  return useQuery({
    queryKey: keys.library,
    queryFn: () => apiGet<LibraryInfo>('/api/library/status'),
  })
}

/**
 * The card check at step 2 of the self-checkout, with every reason it cannot borrow.
 *
 * `cartSize` is part of the key because it changes the answer: the same card is fine for
 * two books and refused for four.
 */
export function useCardCheck(cardCode: string | null, cartSize: number) {
  return useQuery({
    queryKey: keys.card(cardCode ?? '', cartSize),
    queryFn: () =>
      apiGetOrNull<CardCheck>(
        `/api/students/${encodeURIComponent(cardCode!)}?cartSize=${cartSize}`,
      ),
    enabled: Boolean(cardCode),
  })
}

/** Everything a reader has borrowed, grouped into slips — Job 4. */
export function useAccount(cardCode: string) {
  return useQuery({
    queryKey: keys.account(cardCode),
    queryFn: () => apiGetOrNull<AccountView>(`/api/accounts/${encodeURIComponent(cardCode)}/slips`),
  })
}

/** One slip by number — what a QR code or a `?slip=` link resolves to. */
export function useSlip(slipId: string | undefined) {
  return useQuery({
    queryKey: keys.slip(slipId ?? ''),
    queryFn: () => apiGetOrNull<AccountSlip>(`/api/slips/${encodeURIComponent(slipId!)}`),
    enabled: Boolean(slipId),
  })
}

/* -------------------------------------------------------------------------- writes */

/**
 * Ask the librarian — Gain Creator 1.
 *
 * A mutation rather than a query even though it changes nothing: each question is a
 * distinct event the reader triggers, and caching answers by question text would replay
 * a stale reply about copies that have since been borrowed.
 */
export function useAskLibrarian() {
  return useMutation({
    mutationFn: (question: string) => apiPost<LibrarianAnswer>('/api/librarian', { question }),
  })
}

/**
 * Confirm a borrow — Job 3 / Gain Creator 3.
 *
 * On success every catalogue query is invalidated, because the copy counts they carry
 * have just changed. Without that, a reader who borrows the last copy and taps back to
 * the results sees the chip still saying "Còn 1 cuốn" — the app contradicting the receipt
 * it printed a second ago. That is Gain Creator 4, and this line is where it is kept.
 */
export function useCheckout() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (request: { cardCode: string; bookIds: string[] }) =>
      apiPost<{ slip: LoanSlip }>('/api/loans', request),
    onSuccess: (_data, request) => {
      void client.invalidateQueries({ queryKey: keys.books })
      void client.invalidateQueries({ queryKey: keys.library })
      void client.invalidateQueries({ queryKey: keys.account(request.cardCode) })
    },
  })
}
