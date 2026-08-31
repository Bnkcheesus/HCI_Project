import { render, screen, within } from '@testing-library/react'
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
   * Product/Service 5 / Pain Reliever 5. The thumbnail is 160px wide; a reader with thị
   * lực kém cannot read an edition or a volume number off it, and Job 2 asks them to
   * confirm the book before walking to the shelf.
   */
  describe('enlarging the cover', () => {
    const openCover = () => screen.getByRole('button', { name: /Xem bìa sách .* phóng to/ })

    it('opens the cover in a modal dialog', async () => {
      const user = userEvent.setup()
      renderBook(BOOK)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await user.click(openCover())

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      const book = books.find((b) => b.id === BOOK)!
      expect(within(dialog).getByRole('img', { name: `Bìa sách ${book.title}` })).toHaveAttribute(
        'src',
        book.coverUrl,
      )
    })

    it('closes on the button and hands focus back to the cover', async () => {
      const user = userEvent.setup()
      renderBook(BOOK)

      await user.click(openCover())
      await user.click(screen.getByRole('button', { name: 'Đóng' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      // Back where the reader was, not at the top of the document — a keyboard user who
      // loses their place here has to tab through the whole screen again.
      expect(openCover()).toHaveFocus()
    })

    // A kiosk has a keyboard attached; Escape is the reflex for anyone who uses one.
    it('closes on Escape', async () => {
      const user = userEvent.setup()
      renderBook(BOOK)

      await user.click(openCover())
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    // Tapping the dim is how people dismiss a lightbox without aiming at anything.
    it('closes on the backdrop but not on the image itself', async () => {
      const user = userEvent.setup()
      renderBook(BOOK)

      await user.click(openCover())
      await user.click(screen.getByRole('img', { name: /^Bìa sách/ }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      await user.click(screen.getByRole('dialog'))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
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
