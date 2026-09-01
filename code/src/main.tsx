import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

/**
 * Cache defaults, chosen for a machine that stands in a hallway all day.
 *
 * `staleTime` of 30s: the catalogue barely changes, but copy counts do, and a kiosk that
 * has been showing the same screen for ten minutes must not tell the next reader that a
 * book borrowed since is still on the shelf. Short enough to stay honest, long enough
 * that walking between screens is not a series of spinners.
 *
 * `refetchOnWindowFocus` stays on: coming back to the tab is exactly when a stale copy
 * count is most likely and most misleading.
 *
 * One retry, not three. A kiosk with a flaky network should say so quickly rather than
 * appear frozen — the persona has minutes between classes, and a screen that spends eight
 * seconds retrying in silence has spent them.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
