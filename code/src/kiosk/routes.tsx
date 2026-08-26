import type { RouteObject } from 'react-router-dom'
import { AiChatPage } from './AiChatPage'
import { BookInfoPage } from './BookInfoPage'
import { BorrowCompletePage } from './BorrowCompletePage'
import { HomePage } from './HomePage'
import { ScanInstructionPage } from './scan/InstructionPage'
import { ScanStep1Page } from './scan/Step1Page'
import { ScanStep2Page } from './scan/Step2Page'
import { SearchPage } from './SearchPage'
import { SearchResultsPage } from './SearchResultsPage'

// Route tree for the large-touchscreen kiosk surface. Mounted at /kiosk/* in App.tsx.
export const kioskRoutes: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: 'search', element: <SearchPage /> },
  { path: 'search/results', element: <SearchResultsPage /> },
  { path: 'ai-chat', element: <AiChatPage /> },
  { path: 'books/:bookId', element: <BookInfoPage /> },
  { path: 'scan', element: <ScanInstructionPage /> },
  { path: 'scan/step-1', element: <ScanStep1Page /> },
  { path: 'scan/step-2', element: <ScanStep2Page /> },
  { path: 'borrow-complete', element: <BorrowCompletePage /> },
]
