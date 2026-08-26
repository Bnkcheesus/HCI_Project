import { create } from 'zustand'

// Cross-screen session state for the search -> locate -> scan -> borrow flow.
// Backs Job 1–4 / Product-Service 1–4 across kiosk-search-results, kiosk-book-info,
// kiosk-book-scan-*, kiosk-borrow-complete.

interface BorrowSessionState {
  searchQuery: string
  selectedBookId: string | null
  scanStep: 'instruction' | 'step-1' | 'step-2' | 'complete' | null
  setSearchQuery: (query: string) => void
  selectBook: (bookId: string | null) => void
  setScanStep: (step: BorrowSessionState['scanStep']) => void
  reset: () => void
}

export const useBorrowSessionStore = create<BorrowSessionState>((set) => ({
  searchQuery: '',
  selectedBookId: null,
  scanStep: null,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  selectBook: (selectedBookId) => set({ selectedBookId }),
  setScanStep: (scanStep) => set({ scanStep }),
  reset: () => set({ searchQuery: '', selectedBookId: null, scanStep: null }),
}))
