import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { availability, suggestedBooks } from '@/mocks'
import { useAccessibilityStore } from '@/state/useAccessibilityStore'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'
import { HomePage } from './HomePage'

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/kiosk']}>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('Kiosk HomePage', () => {
  beforeEach(() => {
    useAccessibilityStore.getState().setEnabled(false)
    useBorrowSessionStore.getState().reset()
  })

  /**
   * Reaching home ends the previous session. On a kiosk in a public hallway the next
   * person must not walk up to whatever a stranger was searching for.
   */
  it('clears a leftover search when the home screen is reached', () => {
    useBorrowSessionStore.getState().setSearchQuery('giải tích')

    renderHome()

    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(useBorrowSessionStore.getState().searchQuery).toBe('')
  })

  it('lists the four suggested books', () => {
    renderHome()
    // Read from the mocks: which four books are featured is a curation decision that can
    // change, and this test is about the home screen showing all of them, not about the
    // titles themselves.
    expect(suggestedBooks).toHaveLength(4)
    for (const book of suggestedBooks) {
      expect(screen.getByText(book.title)).toBeInTheDocument()
    }
  })

  it('exposes an accessible search field', () => {
    renderHome()
    expect(screen.getByRole('searchbox', { name: /tìm sách/i })).toBeInTheDocument()
  })

  // Pain Reliever 2 / Gain Creator 4 — the persona must not have to walk to the shelf
  // to discover a book is gone, so availability is on the card itself.
  it('shows live availability on every suggested book', () => {
    renderHome()
    for (const book of suggestedBooks) {
      const stock = availability[book.id]
      const label = stock.copiesAvailable > 0 ? `Còn ${stock.copiesAvailable} cuốn` : 'Đã mượn hết'
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  /**
   * The four featured books carry four different states on purpose. A reader who only
   * ever sees green chips has no reason to trust the black one when it finally appears —
   * and "đã mượn hết before you walk" is the persona's whole complaint about the old
   * system, so the home screen has to demonstrate it.
   */
  it('puts a different availability state on each featured card', () => {
    const labels = suggestedBooks.map((b) => {
      const stock = availability[b.id]
      return stock.copiesAvailable > 0 ? `Còn ${stock.copiesAvailable} cuốn` : 'Đã mượn hết'
    })
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels).toContain('Đã mượn hết')
  })

  it('offers one-tap subject shortcuts and the library status bar', () => {
    renderHome()
    expect(screen.getByRole('button', { name: 'Công nghệ thông tin' })).toBeInTheDocument()
    expect(screen.getByText(/thư viện đang mở cửa/i)).toBeInTheDocument()
  })

  // Product/Service 5 — the toggle must actually flip the document-level a11y flag.
  it('toggles accessibility mode from the header', async () => {
    const user = userEvent.setup()
    renderHome()

    const toggle = screen.getByRole('button', { name: /trợ năng/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.getAttribute('data-a11y')).toBe('true')
  })
})
