import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'
import { BookInfoPage } from './BookInfoPage'

function renderBook(bookId: string) {
  return render(
    <MemoryRouter initialEntries={[`/kiosk/books/${bookId}`]}>
      <Routes>
        <Route path="/kiosk/books/:bookId" element={<BookInfoPage />} />
        <Route path="/kiosk/scan" element={<p>Màn hình quét mượn</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Kiosk BookInfoPage', () => {
  beforeEach(() => {
    useBorrowSessionStore.getState().reset()
  })

  it('shows the book, its availability and its metadata', () => {
    renderBook('statistical-learning')

    expect(
      screen.getByRole('heading', { name: 'An Introduction to Statistical Learning' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Gareth James')).toBeInTheDocument()
    expect(screen.getByText('Còn 2 cuốn')).toBeInTheDocument()
    expect(screen.getByText('2021')).toBeInTheDocument()
    expect(screen.getByText('2 còn / 3 tổng')).toBeInTheDocument()
  })

  /**
   * Pain Reliever 5 / Gain 6: the persona's complaint is that a picture-only map is
   * unusable, so the route must also exist as readable text, not just as a drawing.
   */
  it('gives the route in words as well as on the map', () => {
    renderBook('statistical-learning')

    expect(screen.getByText('Đi thẳng khoảng 15m')).toBeInTheDocument()
    expect(screen.getByText('Rẽ phải vào dãy kệ A')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: /Sơ đồ đường đi từ kiosk tới kệ A3/ }),
    ).toBeInTheDocument()
  })

  it('starts the borrow flow and remembers which book was chosen', async () => {
    const user = userEvent.setup()
    renderBook('statistical-learning')

    await user.click(screen.getByRole('button', { name: /Mượn sách/ }))

    expect(screen.getByText('Màn hình quét mượn')).toBeInTheDocument()
    expect(useBorrowSessionStore.getState().selectedBookId).toBe('statistical-learning')
  })

  // A book with no copies on the shelf cannot be borrowed at the kiosk.
  it('disables borrowing when every copy is out', () => {
    renderBook('pattern-recognition')

    const button = screen.getByRole('button', { name: /Đã mượn hết/ })
    expect(button).toBeDisabled()
  })

  it('handles an unknown book id', () => {
    renderBook('khong-ton-tai')
    expect(screen.getByText('Không tìm thấy tài liệu này')).toBeInTheDocument()
  })
})
