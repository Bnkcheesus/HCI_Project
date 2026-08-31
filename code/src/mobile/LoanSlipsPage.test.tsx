import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { createLoanSlip, formatDate } from '@/lib/borrow'
import { clearSavedSlips, saveSlip } from '@/lib/loanSlips'
import { accountSlips, closedSlips, openSlips } from '@/lib/accountSlips'
import { books, findStudentByCard } from '@/mocks'
import { MOBILE_ACCOUNT_CARD } from './account'
import { LoanSlipsPage } from './LoanSlipsPage'

function renderSlips() {
  return render(
    <MemoryRouter initialEntries={['/mobile/phieu-muon']}>
      <Routes>
        <Route path="/mobile/phieu-muon" element={<LoanSlipsPage />} />
        <Route path="/mobile" element={<p>Màn trang chủ</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const student = findStudentByCard(MOBILE_ACCOUNT_CARD)!
const section = (name: RegExp) => within(screen.getByRole('region', { name }))
const title = (bookId: string) => books.find((b) => b.id === bookId)!.title

beforeEach(() => clearSavedSlips())

describe('Mobile loan slips', () => {
  it('splits what is still out from what has come back', () => {
    renderSlips()
    const slips = accountSlips(MOBILE_ACCOUNT_CARD)

    expect(screen.getByRole('heading', { name: `Đang mượn (${openSlips(slips).length})` })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: `Đã trả (${closedSlips(slips).length})` })).toBeInTheDocument()
  })

  it('puts an unreturned book under "Đang mượn" and a returned one under "Đã trả"', () => {
    renderSlips()
    const slips = accountSlips(MOBILE_ACCOUNT_CARD)
    const out = openSlips(slips)[0].books[0].bookId
    const back = closedSlips(slips)[0].books[0].bookId

    expect(section(/Đang mượn/).getByText(title(out))).toBeInTheDocument()
    expect(section(/Đã trả/).getByText(title(back))).toBeInTheDocument()
  })

  it('shows the dates and the status word the design specifies', () => {
    renderSlips()
    const slip = openSlips(accountSlips(MOBILE_ACCOUNT_CARD))[0]

    const open = section(/Đang mượn/)
    expect(open.getByText(formatDate(slip.borrowedAt))).toBeInTheDocument()
    expect(open.getByText(formatDate(slip.dueAt))).toBeInTheDocument()
    expect(open.getAllByText('Đang mượn').length).toBeGreaterThan(0)
  })

  /**
   * Pain Reliever 4 promises the app *reminds* rather than merely records. The Figma frame
   * gives a bare date, which makes the reader work out how long they have; the countdown
   * does it for them, and only while something is actually still out.
   */
  it('counts down only on slips that are still open', () => {
    renderSlips()
    expect(section(/Đang mượn/).getByText(/Còn \d+ ngày|Đến hạn|Quá hạn/)).toBeInTheDocument()
    expect(section(/Đã trả/).queryByText(/Còn \d+ ngày|Đến hạn/)).not.toBeInTheDocument()
  })

  /**
   * The kiosk receipt says "đã lưu vào ứng dụng LibAssist". This is where that claim is
   * either true or a lie.
   */
  it('shows a slip the kiosk filed, as one card for all its books', () => {
    const ids = ['cormen-algorithms', 'stewart-calculus', 'campbell-biology']
    const slip = createLoanSlip(student, ids)
    saveSlip(slip)

    renderSlips()
    const open = section(/Đang mượn/)
    for (const id of ids) expect(open.getByText(title(id))).toBeInTheDocument()

    // One card, not three: the dates appear once for the whole slip.
    expect(open.getByText(`Phiếu #${slip.id}`)).toBeInTheDocument()
    expect(open.getAllByText(formatDate(slip.borrowedAt))).toHaveLength(1)
  })

  it('returns to the home screen', async () => {
    const user = userEvent.setup()
    renderSlips()

    await user.click(screen.getByRole('button', { name: /Quay về/ }))
    expect(screen.getByText('Màn trang chủ')).toBeInTheDocument()
  })
})
