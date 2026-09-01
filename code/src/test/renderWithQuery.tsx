/**
 * Render a screen with a Query client around it.
 *
 * Every test gets a *fresh* client. A shared one would carry a previous test's cached
 * books into the next, which is exactly the kind of order-dependent pass that hides a
 * real bug — and after a checkout test, the cached copy counts would be wrong as well.
 *
 * `retry: false` matters more than it looks: Query retries failed requests three times
 * with backoff by default, so a screen asserting on a 404 empty state would sit in its
 * loading state well past the test's timeout and fail as "element not found" rather than
 * as the network error it is.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor, type RenderOptions } from '@testing-library/react'
import { expect } from 'vitest'
import type { ReactElement, ReactNode } from 'react'

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

export function renderWithQuery(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const client = createTestQueryClient()

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }

  return { client, ...render(ui, { wrapper: Wrapper, ...options }) }
}

/**
 * Render, then wait until the screen has the data it asked for.
 *
 * Screens fetch what they draw now, so a `getBy` immediately after render looks at a
 * loading state rather than at the content — which is why almost every page test needed
 * this. Waiting on `isFetching` rather than on a particular element keeps the helper
 * general: a test asserts about what it cares about, not about whichever element happens
 * to arrive last.
 *
 * The alternative was rewriting every assertion as `findBy`. This is one line per test
 * instead, and it leaves each test still saying what it was always saying.
 */
export async function renderSettled(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const result = renderWithQuery(ui, options)
  await waitFor(() => expect(result.client.isFetching()).toBe(0))
  return result
}
