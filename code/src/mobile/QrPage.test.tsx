import { screen } from '@testing-library/react'
import { renderSettled } from '@/test/renderWithQuery'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { books } from '@/mocks'
import { QrPage } from './QrPage'

/** Echoes the query the handoff landed on, so a test can assert where the reader went. */
function LocationStub() {
  const [params] = useSearchParams()
  return <p>Định vị: {params.get('book')}</p>
}

async function renderQr() {
  return renderSettled(
    <MemoryRouter initialEntries={['/mobile/qr']}>
      <Routes>
        <Route path="/mobile/qr" element={<QrPage />} />
        <Route path="/mobile/location" element={<LocationStub />} />
        <Route path="/mobile" element={<p>Màn trang chủ</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const book = books.find((b) => b.id === 'cormen-algorithms')!

describe('Mobile QR handoff', () => {
  /**
   * There is no camera behind this build. The kiosk's ScannerViewport says so in words
   * rather than drawing a fake feed, and that honesty has to survive onto the phone —
   * a demo that implies a working camera is a demo that lies.
   */
  it('says the scan is simulated instead of implying a live camera', async () => {
    await renderQr()
    expect(screen.getByRole('button', { name: /Mô phỏng quét/ })).toBeInTheDocument()
    expect(screen.getByText(/chưa nối camera/i)).toBeInTheDocument()
  })

  it('takes a simulated scan straight to the shelf directions', async () => {
    const user = userEvent.setup()
    await renderQr()

    await user.click(screen.getByRole('button', { name: /Mô phỏng quét/ }))
    expect(screen.getByText(/^Định vị:/)).toBeInTheDocument()
  })

  it('opens the same screen from an ISBN typed by hand', async () => {
    const user = userEvent.setup()
    await renderQr()

    await user.type(screen.getByLabelText(/nhập mã ISBN/i), book.isbn)
    await user.click(screen.getByRole('button', { name: 'Mở chỉ dẫn' }))

    expect(screen.getByText(`Định vị: ${book.id}`)).toBeInTheDocument()
  })

  it('explains a bad code and stays put', async () => {
    const user = userEvent.setup()
    await renderQr()

    await user.type(screen.getByLabelText(/nhập mã ISBN/i), '0000000000')
    await user.click(screen.getByRole('button', { name: 'Mở chỉ dẫn' }))

    expect(screen.getByRole('status')).toHaveTextContent(/Không tìm thấy tài liệu/)
    expect(screen.queryByText(/^Định vị:/)).not.toBeInTheDocument()
  })

  it('clears the error once the reader starts correcting it', async () => {
    const user = userEvent.setup()
    await renderQr()

    const field = screen.getByLabelText(/nhập mã ISBN/i)
    await user.type(field, '1')
    await user.click(screen.getByRole('button', { name: 'Mở chỉ dẫn' }))
    expect(screen.getByRole('status')).toHaveTextContent(/Không tìm thấy/)

    await user.type(field, '2')
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('returns to the home screen', async () => {
    const user = userEvent.setup()
    await renderQr()

    await user.click(screen.getByRole('button', { name: /Quay về/ }))
    expect(screen.getByText('Màn trang chủ')).toBeInTheDocument()
  })
})
