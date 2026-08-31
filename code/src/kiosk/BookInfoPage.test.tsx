import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { books } from '@/mocks'
import { findBookByCode } from '@/lib/borrow'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'
import { BookInfoPage } from './BookInfoPage'

const BOOK = 'statistical-learning'

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
    // Read from the catalogue rather than hardcoded: the bibliographic data is real, and
    // re-running scripts/fetch-catalog.mjs can legitimately pick up a newer edition.
    expect(screen.getByText(String(books.find((b) => b.id === BOOK)!.year))).toBeInTheDocument()
    expect(screen.getByText('2 còn / 3 tổng')).toBeInTheDocument()
  })

  /**
   * The ISBN is the one field here that has to survive being copied. Step 1 of the
   * checkout asks the reader to key it in when a barcode will not scan, and the phone's
   * QR screen falls back to the same code — both resolve it through `findBookByCode`,
   * so the digits shown here have to be the digits that lookup accepts.
   */
  it('shows an ISBN the checkout would actually accept', () => {
    renderBook(BOOK)

    const isbn = books.find((b) => b.id === BOOK)!.isbn
    expect(screen.getByText(isbn)).toBeInTheDocument()
    expect(findBookByCode(isbn)?.id).toBe(BOOK)
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
