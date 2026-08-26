import { Navigate, useRoutes } from 'react-router-dom'
import { kioskRoutes } from './kiosk/routes'
import { mobileRoutes } from './mobile/routes'

// Two route trees sharing one app: /kiosk/* (large touchscreen) and /mobile/*
// (phone companion) — see .claude/skills/code-generator/SKILL.md for why this is
// one codebase instead of two.
function App() {
  return useRoutes([
    { path: '/', element: <Navigate to="/kiosk" replace /> },
    { path: '/kiosk', children: kioskRoutes },
    { path: '/mobile', children: mobileRoutes },
  ])
}

export default App
