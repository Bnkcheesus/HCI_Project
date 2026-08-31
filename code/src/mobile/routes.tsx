import type { RouteObject } from 'react-router-dom'
import { MobileHomePage } from './HomePage'
import { LocationPage } from './LocationPage'
import { LoanSlipsPage } from './LoanSlipsPage'
import { QrPage } from './QrPage'

// Route tree for the phone-companion surface. Mounted at /mobile/* in App.tsx.
export const mobileRoutes: RouteObject[] = [
  { index: true, element: <MobileHomePage /> },
  { path: 'qr', element: <QrPage /> },
  { path: 'location', element: <LocationPage /> },
  { path: 'phieu-muon', element: <LoanSlipsPage /> },
]
