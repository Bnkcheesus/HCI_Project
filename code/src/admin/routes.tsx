import type { RouteObject } from 'react-router-dom'
import { AdminReturnPage } from './ReturnPage'

// Route tree for the internal demo tools. Mounted at /admin/* in App.tsx, deliberately
// separate from the two product surfaces — see ReturnPage.tsx for why.
export const adminRoutes: RouteObject[] = [{ index: true, element: <AdminReturnPage /> }]
