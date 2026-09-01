import { screen } from '@testing-library/react'
import { renderSettled } from '@/test/renderWithQuery'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { findStudentByCard } from '@/mocks'
import { MOBILE_ACCOUNT_CARD } from './mobile/account'

describe('App routing', () => {
  it('redirects / to the kiosk home screen', async () => {
    await renderSettled(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /sách được mượn nhiều/i })).toBeInTheDocument()
  })

  it('renders the mobile home screen at /mobile', async () => {
    await renderSettled(
      <MemoryRouter initialEntries={['/mobile']}>
        <App />
      </MemoryRouter>,
    )
    // The companion app opens straight onto the persona's account — no sign-in step, see
    // mobile/account.ts.
    expect(
      screen.getByRole('heading', { name: findStudentByCard(MOBILE_ACCOUNT_CARD)!.name }),
    ).toBeInTheDocument()
  })

  /**
   * Tapping the home search bar hands off to the search screen, where the on-screen
   * keyboard lives. The morph is a View Transition; jsdom has no such API, so this also
   * covers the fallback path — the navigation must still happen without it.
   */
  it('opens the search screen when the home search bar is tapped', async () => {
    const user = userEvent.setup()
    await renderSettled(
      <MemoryRouter initialEntries={['/kiosk']}>
        <App />
      </MemoryRouter>,
    )

    const field = screen.getByRole('searchbox')
    expect(field).toHaveAttribute('readonly')
    expect(screen.queryByRole('group', { name: 'Bàn phím ảo' })).not.toBeInTheDocument()

    await user.click(field)

    expect(screen.getByRole('group', { name: 'Bàn phím ảo' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).not.toHaveAttribute('readonly')
  })
})
