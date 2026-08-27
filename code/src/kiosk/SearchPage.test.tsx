import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'
import { useKeyboardStore } from '@/state/useKeyboardStore'
import { SearchPage } from './SearchPage'

function renderSearch() {
  return render(
    <MemoryRouter initialEntries={['/kiosk/search']}>
      <SearchPage />
    </MemoryRouter>,
  )
}

describe('Kiosk SearchPage', () => {
  beforeEach(() => {
    useBorrowSessionStore.getState().reset()
    useKeyboardStore.getState().setLayout('full')
  })

  /**
   * The home screen clears the query on arrival; this screen must not. Going search →
   * results → back is a normal loop, and losing the query there would mean retyping it
   * on an on-screen keyboard.
   */
  it('keeps the query when the search screen is re-entered', () => {
    useBorrowSessionStore.getState().setSearchQuery('giải tích')
    renderSearch()
    expect(screen.getByRole('searchbox')).toHaveValue('giải tích')
  })

  // The keyboard's enter key is configurable so the AI chat can label it "Gửi"; this
  // screen must keep its own default.
  it('keeps "Tìm kiếm" on the on-screen keyboard enter key', () => {
    renderSearch()
    const keyboard = within(screen.getByRole('group', { name: 'Bàn phím ảo' }))
    expect(keyboard.getByRole('button', { name: 'Tìm kiếm' })).toBeInTheDocument()
  })

  // The caret must already be in the field on arrival — the on-screen keyboard is
  // useless without focus, and users should not have to tap twice.
  it('focuses the search field on arrival', () => {
    renderSearch()
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })

  it('keeps focus in the field while typing on the on-screen keyboard', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.click(screen.getByRole('button', { name: 'a' }))

    expect(screen.getByRole('searchbox')).toHaveFocus()
  })

  it('docks the keyboard to either side and back', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.click(screen.getByRole('button', { name: /sang phải/i }))
    expect(useKeyboardStore.getState().layout).toBe('right')

    await user.click(screen.getByRole('button', { name: /sang trái/i }))
    expect(useKeyboardStore.getState().layout).toBe('left')

    await user.click(screen.getByRole('button', { name: /toàn chiều rộng/i }))
    expect(useKeyboardStore.getState().layout).toBe('full')
  })

  it('shows suggested books before the user types anything', () => {
    renderSearch()
    expect(screen.getByText('Gợi ý cho bạn')).toBeInTheDocument()
    expect(screen.getByText('Giải tích 1')).toBeInTheDocument()
  })

  // Telex on the on-screen keyboard: g-i-a-i-r must render "giải", not "giair".
  it('types Vietnamese tones through the on-screen keyboard', async () => {
    const user = userEvent.setup()
    renderSearch()

    for (const key of ['g', 'i', 'a', 'i', 'r']) {
      await user.click(screen.getByRole('button', { name: key }))
    }

    expect(screen.getByRole('searchbox')).toHaveValue('giải')
  })

  it('replaces the suggestions with live matches once the user types', async () => {
    const user = userEvent.setup()
    renderSearch()

    for (const key of ['g', 'i', 'a', 'i', 'r']) {
      await user.click(screen.getByRole('button', { name: key }))
    }

    expect(screen.queryByText('Gợi ý cho bạn')).not.toBeInTheDocument()
    expect(screen.getByText(/1 kết quả cho/i)).toBeInTheDocument()
    expect(screen.getByText('Còn 3 cuốn')).toBeInTheDocument()
  })

  // Typing without tones must still find the book — Telex is optional, not required.
  it('matches a query typed without diacritics', async () => {
    const user = userEvent.setup()
    renderSearch()

    for (const key of ['v', 'a', 't']) {
      await user.click(screen.getByRole('button', { name: key }))
    }

    expect(screen.getByText('Vật lý đại cương')).toBeInTheDocument()
  })

  it('reports when nothing matches', async () => {
    const user = userEvent.setup()
    renderSearch()

    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: 'z' }))
    }

    expect(screen.getByText(/không tìm thấy sách nào/i)).toBeInTheDocument()
  })

  it('backspace deletes the last character', async () => {
    const user = userEvent.setup()
    renderSearch()

    await user.click(screen.getByRole('button', { name: 'a' }))
    await user.click(screen.getByRole('button', { name: 'b' }))
    await user.click(screen.getByRole('button', { name: 'Xoá ký tự' }))

    expect(screen.getByRole('searchbox')).toHaveValue('a')
  })
})
