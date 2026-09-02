import { Navigate, useRoutes } from 'react-router-dom'
import { adminRoutes } from './admin/routes'
import { kioskRoutes } from './kiosk/routes'
import { mobileRoutes } from './mobile/routes'

// Two product surfaces sharing one app: /kiosk/* (large touchscreen) and /mobile/*
// (phone companion) — see .claude/skills/code-generator/SKILL.md for why this is
// one codebase instead of two.
//
// /admin/* is not a third surface. It holds internal tools that exist so a demo can be
// driven — today, just returning a book — and nothing in it traces back to the value
// proposition. Kept out of both trees so that distinction stays visible in the routing.
function App() {
  return useRoutes([
    { path: '/', element: <Navigate to="/kiosk" replace /> },
    { path: '/kiosk', children: kioskRoutes },
    { path: '/mobile', children: mobileRoutes },
    { path: '/admin', children: adminRoutes },
  ])
}

export default App
