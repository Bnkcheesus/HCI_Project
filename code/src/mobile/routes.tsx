import type { RouteObject } from 'react-router-dom'
import { HomePage } from './HomePage'
import { LocationPage } from './LocationPage'
import { PhieuMuonPage } from './PhieuMuonPage'
import { QrPage } from './QrPage'

// Route tree for the phone-companion surface. Mounted at /mobile/* in App.tsx.
export const mobileRoutes: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: 'qr', element: <QrPage /> },
  { path: 'location', element: <LocationPage /> },
  { path: 'phieu-muon', element: <PhieuMuonPage /> },
]
