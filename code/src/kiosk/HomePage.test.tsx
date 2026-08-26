import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAccessibilityStore } from '@/state/useAccessibilityStore'
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
  })

  it('lists the four suggested books', () => {
    renderHome()
    for (const title of ['Giải tích 1', 'Vật lý đại cương', 'Lập trình C++', 'Đại số tuyến tính']) {
      expect(screen.getByText(title)).toBeInTheDocument()
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
    expect(screen.getByText('Còn 3 cuốn')).toBeInTheDocument() // Giải tích 1
    expect(screen.getByText('Còn 1 cuốn')).toBeInTheDocument() // Vật lý đại cương
    expect(screen.getByText('Đã mượn hết')).toBeInTheDocument() // Lập trình C++
    expect(screen.getByText('Còn 4 cuốn')).toBeInTheDocument() // Đại số tuyến tính
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
