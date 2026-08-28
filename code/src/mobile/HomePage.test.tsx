import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { books, findStudentByCard, openLoansFor } from '@/mocks'
import { dueCountdown, mostUrgentLoan } from '@/lib/loans'
import { useAccessibilityStore } from '@/state/useAccessibilityStore'
import { MOBILE_ACCOUNT_CARD } from './account'
import { MobileHomePage } from './HomePage'

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/mobile']}>
      <Routes>
        <Route path="/mobile" element={<MobileHomePage />} />
        <Route path="/mobile/qr" element={<p>Màn quét QR</p>} />
        <Route path="/mobile/phieu-muon" element={<p>Màn phiếu mượn</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const openLoans = openLoansFor(MOBILE_ACCOUNT_CARD)
const urgent = mostUrgentLoan(openLoans)!
const urgentBook = books.find((b) => b.id === urgent.bookId)!

beforeEach(() => {
  if (useAccessibilityStore.getState().enabled) useAccessibilityStore.getState().toggle()
})

describe('Mobile home', () => {
  it('greets the account holder by name', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: findStudentByCard(MOBILE_ACCOUNT_CARD)!.name })).toBeInTheDocument()
  })

  /**
   * The whole reason this block exists. The Figma frame is a two-button menu, but
   * scenario.md has the reader glance at the app on their way out and see the reminder
   * without tapping — Pain Reliever 4 promises the app *nhắc*, not merely stores.
   */
  it('shows the nearest due date without the reader tapping anything', () => {
    renderHome()
    expect(screen.getByText(urgentBook.title)).toBeInTheDocument()
    expect(screen.getByText(dueCountdown(urgent.dueAt))).toBeInTheDocument()
  })

  it('leads with the loan that runs out of time first', () => {
    renderHome()
    // Derived, not hardcoded: the seeded loans move with today's date.
    const soonest = [...openLoans].sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0]
    expect(soonest.id).toBe(urgent.id)
    expect(screen.getByText(new RegExp(`đang mượn ${openLoans.length} cuốn`))).toBeInTheDocument()
  })

  it('offers the two actions the design specifies', async () => {
    const user = userEvent.setup()
    renderHome()

    const nav = within(screen.getByRole('navigation', { name: 'Chức năng chính' }))
    await user.click(nav.getByRole('button', { name: /Quét QR/ }))
    expect(screen.getByText('Màn quét QR')).toBeInTheDocument()
  })

  it('opens the loan list from the reminder as well as from the menu', async () => {
    const user = userEvent.setup()
    renderHome()

    await user.click(screen.getByText(urgentBook.title))
    expect(screen.getByText('Màn phiếu mượn')).toBeInTheDocument()
  })

  /**
   * Product/Service 5 scopes the accessibility mode to the kiosk, but the persona's
   * eyesight is the same on a phone. The toggle is shared, so the state must survive the
   * hand-off rather than being a separate switch that silently disagrees.
   */
  it('carries the accessibility toggle', async () => {
    const user = userEvent.setup()
    renderHome()

    const toggle = screen.getByRole('button', { name: /Chế độ trợ năng/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)
    expect(useAccessibilityStore.getState().enabled).toBe(true)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })
})
