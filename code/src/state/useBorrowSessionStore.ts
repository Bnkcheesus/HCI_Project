import { create } from 'zustand'
import type { LoanSlip } from '@/lib/borrow'

// Cross-screen session state for the search -> locate -> scan -> borrow flow.
// Backs Job 1–4 / Product-Service 1–4 across kiosk-search-results, kiosk-book-info,
// kiosk-book-scan-*, kiosk-borrow-complete.

interface BorrowSessionState {
  searchQuery: string
  selectedBookId: string | null
  scanStep: 'instruction' | 'step-1' | 'step-2' | 'complete' | null

  /** Books scanned into this checkout, in scan order. Up to MAX_BOOKS_PER_LOAN. */
  scannedBookIds: string[]
  /** Card code read in step 2, once it has matched a real student. */
  studentCardCode: string | null
  /** Set when the borrow is confirmed; the receipt screen renders from it. */
  slip: LoanSlip | null

  setSearchQuery: (query: string) => void
  selectBook: (bookId: string | null) => void
  setScanStep: (step: BorrowSessionState['scanStep']) => void

  addScannedBook: (bookId: string) => void
  removeScannedBook: (bookId: string) => void
  setStudentCard: (cardCode: string | null) => void
  completeBorrow: (slip: LoanSlip) => void
  /** Abandon the checkout but keep what the reader searched for. */
  resetCheckout: () => void

  reset: () => void
}

const EMPTY_CHECKOUT = {
  scannedBookIds: [] as string[],
  studentCardCode: null,
  slip: null,
  scanStep: null,
} as const

export const useBorrowSessionStore = create<BorrowSessionState>((set) => ({
  searchQuery: '',
  selectedBookId: null,
  ...EMPTY_CHECKOUT,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  selectBook: (selectedBookId) => set({ selectedBookId }),
  setScanStep: (scanStep) => set({ scanStep }),

  addScannedBook: (bookId) =>
    set((s) =>
      // Guarded here as well as in scanBook: the store is the last line of defence
      // against the same book landing on a slip twice.
      s.scannedBookIds.includes(bookId)
        ? s
        : { scannedBookIds: [...s.scannedBookIds, bookId] },
    ),

  removeScannedBook: (bookId) =>
    set((s) => ({ scannedBookIds: s.scannedBookIds.filter((id) => id !== bookId) })),

  setStudentCard: (studentCardCode) => set({ studentCardCode }),
  completeBorrow: (slip) => set({ slip, scanStep: 'complete' }),

  resetCheckout: () => set({ ...EMPTY_CHECKOUT }),

  reset: () => set({ searchQuery: '', selectedBookId: null, ...EMPTY_CHECKOUT }),
}))
