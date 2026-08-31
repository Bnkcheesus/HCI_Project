import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { availability, books, shelfLocations } from '@/mocks'
import { LocationPage } from './LocationPage'

function renderAt(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/mobile/location${search}`]}>
      <Routes>
        <Route path="/mobile/location" element={<LocationPage />} />
        <Route path="/mobile/qr" element={<p>Màn quét QR</p>} />
        <Route path="/mobile" element={<p>Màn trang chủ</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const book = books.find((b) => b.id === 'cormen-algorithms')!
const location = shelfLocations[book.shelfCode]

describe('Mobile shelf location', () => {
  it('names the book the route is for', () => {
    renderAt(`?book=${book.id}`)
    expect(screen.getByText(book.title)).toBeInTheDocument()
    expect(screen.getByText(book.author)).toBeInTheDocument()
  })

  // Worded and punctuated exactly as ResultCard writes it on the kiosk — "Kệ X · Tầng N",
  // middle dot, not bullet.
  it('shows the shelf and floor', () => {
    renderAt(`?book=${book.id}`)
    expect(screen.getByText(`Kệ ${book.shelfCode} · Tầng ${book.floor}`)).toBeInTheDocument()
  })

  /**
   * Pain Reliever 5 names a picture-only map as the pain itself, so every turn has to be
   * readable. Asserting all of them, not just the first: dropping the tail of the list
   * would still leave a screen that looks right.
   */
  it('writes out every turn, not only the map', () => {
    renderAt(`?book=${book.id}`)
    for (const step of location.directions) {
      expect(screen.getByText(step)).toBeInTheDocument()
    }
  })

  it('draws the route to this book’s own aisle', () => {
    renderAt(`?book=${book.id}`)
    expect(
      screen.getByRole('img', {
        name: new RegExp(`kệ ${location.shelfCode}, dãy số ${location.aisle + 1}`),
      }),
    ).toBeInTheDocument()
  })

  /**
   * Pain 2 is "phải đến tận kệ mới biết sách đã hết". This screen is the last moment
   * before the walk, so the count has to be here — not only back on the kiosk.
   */
  it('says whether a copy is actually on the shelf', () => {
    renderAt(`?book=${book.id}`)
    const record = availability[book.id]
    const label = record.copiesAvailable > 0 ? `Còn ${record.copiesAvailable} cuốn` : 'Đã mượn hết'
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})

describe('Mobile shelf location — codes that lead nowhere', () => {
  it('offers the scanner when no book was named', async () => {
    const user = userEvent.setup()
    renderAt('')

    expect(screen.getByText(/Chưa chọn cuốn sách nào/)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Quét mã QR/ }))
    expect(screen.getByText('Màn quét QR')).toBeInTheDocument()
  })

  it('distinguishes an unknown book from a missing one', () => {
    renderAt('?book=khong-co-cuon-nay')
    expect(screen.getByText(/Không tìm thấy tài liệu/)).toBeInTheDocument()
    expect(screen.queryByText(/Chưa chọn cuốn sách nào/)).not.toBeInTheDocument()
  })

  it('returns to the home screen', async () => {
    const user = userEvent.setup()
    renderAt(`?book=${book.id}`)

    await user.click(screen.getByRole('button', { name: /Quay về/ }))
    expect(screen.getByText('Màn trang chủ')).toBeInTheDocument()
  })
})
