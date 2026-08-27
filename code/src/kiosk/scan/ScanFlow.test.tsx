import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { MAX_BOOKS_PER_LOAN } from '@/lib/borrow'
import { IDLE_SECONDS, IDLE_WARN_AT } from '@/lib/kioskSession'
import { availability, books } from '@/mocks'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const codeField = () => screen.getByLabelText(/Nhập mã/)
const keypad = () => within(screen.getByRole('group', { name: 'Bàn phím số' }))

const inStock = books.filter((b) => (availability[b.id]?.copiesAvailable ?? 0) > 0)
const outOfStock = books.find((b) => (availability[b.id]?.copiesAvailable ?? 0) === 0)!

/** Put books in the cart without going through the UI, for tests about later steps. */
function seedCart(count: number) {
  const store = useBorrowSessionStore.getState()
  for (const book of inStock.slice(0, count)) store.addScannedBook(book.id)
}

beforeEach(() => {
  useBorrowSessionStore.getState().reset()
})

describe('Step 1 — scanning books', () => {
  it('adds a book scanned by ISBN and announces it', async () => {
    const user = userEvent.setup()
    renderAt('/kiosk/scan/step-1')

    await user.type(codeField(), inStock[0].isbn)
    await user.click(keypad().getByRole('button', { name: 'OK' }))

    expect(screen.getByText(new RegExp(`Đã thêm.*${inStock[0].title}`))).toBeInTheDocument()
    expect(useBorrowSessionStore.getState().scannedBookIds).toEqual([inStock[0].id])
  })

  /** The whole point of the change from the prototype: more than one book per trip. */
  it('collects several books in one checkout', async () => {
    const user = userEvent.setup()
    renderAt('/kiosk/scan/step-1')

    for (const book of inStock.slice(0, 3)) {
      await user.clear(codeField())
      await user.type(codeField(), book.isbn)
      await user.click(keypad().getByRole('button', { name: 'OK' }))
    }

    expect(useBorrowSessionStore.getState().scannedBookIds).toHaveLength(3)
    expect(screen.getByText(`3/${MAX_BOOKS_PER_LOAN} cuốn`)).toBeInTheDocument()
  })

  it('lets a mis-scanned book be taken back off the slip', async () => {
    const user = userEvent.setup()
    seedCart(2)
    renderAt('/kiosk/scan/step-1')

    await user.click(screen.getByRole('button', { name: `Bỏ "${inStock[0].title}" khỏi phiếu mượn` }))

    expect(useBorrowSessionStore.getState().scannedBookIds).toEqual([inStock[1].id])
  })

  // kiosk-book-scan-step1-fail (39:82) — rendered as state, not a separate route.
  it('explains an invalid code instead of failing silently', async () => {
    const user = userEvent.setup()
    renderAt('/kiosk/scan/step-1')

    await user.type(codeField(), '0000000000000')
    await user.click(keypad().getByRole('button', { name: 'OK' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/Mã sách không hợp lệ/)
    expect(useBorrowSessionStore.getState().scannedBookIds).toEqual([])
  })

  it('refuses a book with no copies left, before the reader walks to the shelf', async () => {
    const user = userEvent.setup()
    renderAt('/kiosk/scan/step-1')

    await user.type(codeField(), outOfStock.isbn)
    await user.click(keypad().getByRole('button', { name: 'OK' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/không còn bản nào/)
  })

  it('refuses the same book twice', async () => {
    const user = userEvent.setup()
    seedCart(1)
    renderAt('/kiosk/scan/step-1')

    await user.type(codeField(), inStock[0].isbn)
    await user.click(keypad().getByRole('button', { name: 'OK' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/đã có trong phiếu mượn/)
    expect(useBorrowSessionStore.getState().scannedBookIds).toHaveLength(1)
  })

  it('cannot move on with an empty slip', () => {
    renderAt('/kiosk/scan/step-1')
    expect(screen.getByRole('button', { name: /Tiếp tục/ })).toBeDisabled()
  })

  it('refuses a sixth book and disables the scanner once the slip is full', async () => {
    const user = userEvent.setup()
    seedCart(MAX_BOOKS_PER_LOAN)
    renderAt('/kiosk/scan/step-1')

    expect(screen.getByRole('button', { name: /Mô phỏng quét một cuốn/ })).toBeDisabled()

    const spare = inStock[MAX_BOOKS_PER_LOAN]
    await user.type(codeField(), spare.isbn)
    await user.click(keypad().getByRole('button', { name: 'OK' }))

    expect(screen.getByRole('alert')).toHaveTextContent(new RegExp(`tối đa ${MAX_BOOKS_PER_LOAN} cuốn`))
    expect(useBorrowSessionStore.getState().scannedBookIds).toHaveLength(MAX_BOOKS_PER_LOAN)
  })

  it('types digits through the numeric keypad', async () => {
    const user = userEvent.setup()
    renderAt('/kiosk/scan/step-1')

    await user.click(keypad().getByRole('button', { name: '9' }))
    await user.click(keypad().getByRole('button', { name: '7' }))
    expect(codeField()).toHaveValue('97')

    await user.click(keypad().getByRole('button', { name: 'Xoá một chữ số' }))
    expect(codeField()).toHaveValue('9')
  })
})

describe('Leaving the checkout', () => {
  /**
   * "Quay về" used to be navigate(-1). Step 1's own back button pushes a second
   * /kiosk/scan entry, so history read … → scan → step-1 → scan and stepping back one
   * landed on step 1 — the screen the reader had just left.
   */
  it('goes back to the book, not forward into step 1', async () => {
    const user = userEvent.setup()
    useBorrowSessionStore.getState().selectBook(inStock[0].id)
    renderAt('/kiosk/scan')

    // Walk into step 1 and back, the sequence that used to corrupt the history.
    await user.click(screen.getByRole('button', { name: /Bắt đầu quy trình mượn sách/ }))
    await user.click(screen.getByRole('button', { name: /Quay lại/ }))
    expect(screen.getByText('Tự mượn sách tại kiosk')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Quay về$/ }))

    expect(screen.queryByText(/Bước 1 — Quét mã QR/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mượn sách|Đã mượn hết/ })).toBeInTheDocument()
  })

  /**
   * The fix above pushes a fresh /kiosk/books entry on the way out of the checkout, which
   * left the detail screen's own navigate(-1) landing back on the scan flow. Both back
   * buttons now go to named routes, so the whole loop has to be walked to prove it.
   */
  it('returns to the results list from the book screen after a checkout detour', async () => {
    const user = userEvent.setup()
    useBorrowSessionStore.getState().setSearchQuery('giải tích')
    renderAt('/kiosk/search/results')

    await user.click(screen.getByRole('button', { name: /Giải tích 1/ }))
    await user.click(screen.getByRole('button', { name: /Mượn sách/ }))
    expect(screen.getByText('Tự mượn sách tại kiosk')).toBeInTheDocument()

    // Out of the checkout, back onto the book screen.
    await user.click(screen.getByRole('button', { name: /^Quay về$/ }))
    expect(screen.getByRole('button', { name: /Mượn sách|Đã mượn hết/ })).toBeInTheDocument()

    // …and the book screen's own back must reach the results, not the scan flow again.
    await user.click(screen.getByRole('button', { name: /^Quay về$/ }))
    expect(screen.queryByText('Tự mượn sách tại kiosk')).not.toBeInTheDocument()
    expect(screen.getByText('Kết quả tìm kiếm')).toBeInTheDocument()
  })

  /**
   * Entering the checkout from the home screen must come back to the home screen — even
   * when a book was viewed earlier in the session. The exit used to be chosen from
   * selectedBookId, which survives in the store, so it sent the reader to a book they had
   * looked at minutes before and never asked to borrow now.
   */
  it('returns home from a checkout started on the home screen, ignoring a stale selection', async () => {
    const user = userEvent.setup()
    // A book was viewed earlier in the session and is still selected in the store.
    useBorrowSessionStore.getState().selectBook(inStock[0].id)
    renderAt('/kiosk')

    await user.click(screen.getByRole('tab', { name: 'Mượn sách' }))
    expect(screen.getByText('Tự mượn sách tại kiosk')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Quay về$/ }))

    // The mode tabs only exist on the home screen; the detail screen's heading must not.
    expect(screen.getByRole('tab', { name: 'Tìm sách thông minh' })).toBeInTheDocument()
    expect(screen.queryByText('Thông tin sách')).not.toBeInTheDocument()
  })

  it('goes to the home screen when no book was picked first', async () => {
    const user = userEvent.setup()
    renderAt('/kiosk/scan')

    await user.click(screen.getByRole('button', { name: /^Quay về$/ }))

    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })
})

describe('Step 2 — the card check', () => {
  beforeEach(() => seedCart(1))

  it('accepts a card in good standing and shows the due date before committing', async () => {
    const user = userEvent.setup()
    renderAt('/kiosk/scan/step-2')

    await user.type(codeField(), '20215012')
    await user.click(keypad().getByRole('button', { name: 'OK' }))

    expect(screen.getByText('Nguyễn Minh Khang')).toBeInTheDocument()
    expect(screen.getByText('Thẻ thư viện hợp lệ')).toBeInTheDocument()
    // The review the prototype skipped: what, and until when.
    expect(screen.getByText(/Bạn sắp mượn/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xác nhận mượn/ })).toBeEnabled()
  })

  it('refuses an expired card and says how to fix it', async () => {
    const user = userEvent.setup()
    renderAt('/kiosk/scan/step-2')

    await user.type(codeField(), '20219999')
    await user.click(keypad().getByRole('button', { name: 'OK' }))

    expect(screen.getByText('Thẻ chưa đủ điều kiện mượn')).toBeInTheDocument()
    expect(screen.getByText(/Thẻ thư viện đã hết hạn/)).toBeInTheDocument()
    expect(screen.getByText(/gia hạn thẻ tại quầy thủ thư/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xác nhận mượn/ })).toBeDisabled()
  })

  it('refuses a card with overdue books and names them', async () => {
    const user = userEvent.setup()
    renderAt('/kiosk/scan/step-2')

    await user.type(codeField(), '20218888')
    await user.click(keypad().getByRole('button', { name: 'OK' }))

    expect(screen.getByText(/quá hạn trả/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xác nhận mượn/ })).toBeDisabled()
  })

  it('refuses a card that has hit the borrowing limit', async () => {
    const user = userEvent.setup()
    renderAt('/kiosk/scan/step-2')

    await user.type(codeField(), '20217777')
    await user.click(keypad().getByRole('button', { name: 'OK' }))

    expect(screen.getByText(new RegExp(`giới hạn là ${MAX_BOOKS_PER_LOAN} cuốn`))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xác nhận mượn/ })).toBeDisabled()
  })

  it('explains an unknown card', async () => {
    const user = userEvent.setup()
    renderAt('/kiosk/scan/step-2')

    await user.type(codeField(), '11112222')
    await user.click(keypad().getByRole('button', { name: 'OK' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/Mã thẻ không hợp lệ/)
  })

  it('sends the reader back to scanning if the cart emptied underneath them', () => {
    useBorrowSessionStore.getState().resetCheckout()
    renderAt('/kiosk/scan/step-2')
    expect(screen.getByText(/Bước 1 — Quét mã QR/)).toBeInTheDocument()
  })
})

describe('The whole checkout, end to end', () => {
  it('scans two books, checks the card, and prints a slip for both', async () => {
    const user = userEvent.setup()
    renderAt('/kiosk/scan')

    await user.click(screen.getByRole('button', { name: /Bắt đầu quy trình mượn sách/ }))

    for (const book of inStock.slice(0, 2)) {
      await user.clear(codeField())
      await user.type(codeField(), book.isbn)
      await user.click(keypad().getByRole('button', { name: 'OK' }))
    }
    await user.click(screen.getByRole('button', { name: /Tiếp tục/ }))

    await user.type(codeField(), '20215012')
    await user.click(keypad().getByRole('button', { name: 'OK' }))
    await user.click(screen.getByRole('button', { name: /Xác nhận mượn 2 cuốn/ }))

    expect(screen.getByText('Mượn sách thành công!')).toBeInTheDocument()
    const slip = within(screen.getByRole('region', { name: 'Phiếu mượn sách' }))
    expect(slip.getByText('Nguyễn Minh Khang')).toBeInTheDocument()
    expect(slip.getByText(/2 cuốn đã mượn/)).toBeInTheDocument()
    for (const book of inStock.slice(0, 2)) {
      expect(slip.getByText(book.title)).toBeInTheDocument()
    }
  })

  it('offers the phone hand-off as well as the paper slip', async () => {
    const user = userEvent.setup()
    seedCart(1)
    renderAt('/kiosk/scan/step-2')

    await user.type(codeField(), '20215012')
    await user.click(keypad().getByRole('button', { name: 'OK' }))
    await user.click(screen.getByRole('button', { name: /Xác nhận mượn/ }))

    // Gain Creator 3 — "in phiếu HOẶC đồng bộ app"; paper alone drops half the promise.
    expect(screen.getByText(/Quét để lưu phiếu vào app/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /In lại phiếu mượn/ })).toBeInTheDocument()
  })

  it('redirects away from the receipt when nothing was borrowed', () => {
    renderAt('/kiosk/borrow-complete')
    expect(screen.queryByText('Mượn sách thành công!')).not.toBeInTheDocument()
  })

  it('confirms the reprint so the reader is not left tapping', async () => {
    const user = userEvent.setup()
    seedCart(1)
    renderAt('/kiosk/scan/step-2')

    await user.type(codeField(), '20215012')
    await user.click(keypad().getByRole('button', { name: 'OK' }))
    await user.click(screen.getByRole('button', { name: /Xác nhận mượn/ }))
    await user.click(screen.getByRole('button', { name: /In lại phiếu mượn/ }))

    expect(screen.getByText(/Đã gửi lệnh in/)).toBeInTheDocument()
  })

  /** The next reader at the kiosk must not inherit the previous one's slip. */
  it('clears the session on the way back to the home screen', async () => {
    const user = userEvent.setup()
    seedCart(1)
    renderAt('/kiosk/scan/step-2')

    await user.type(codeField(), '20215012')
    await user.click(keypad().getByRole('button', { name: 'OK' }))
    await user.click(screen.getByRole('button', { name: /Xác nhận mượn/ }))
    await user.click(screen.getByRole('button', { name: /Quay về trang chủ/ }))

    const state = useBorrowSessionStore.getState()
    expect(state.slip).toBeNull()
    expect(state.scannedBookIds).toEqual([])
    expect(state.studentCardCode).toBeNull()
  })
})

describe('The idle watchdog', () => {
  /**
   * A reader who walks off mid-checkout must not leave a live session with their card in
   * it for the next person at the machine.
   */
  it('warns, then clears the session and leaves', () => {
    vi.useFakeTimers()
    try {
      seedCart(1)
      useBorrowSessionStore.getState().setStudentCard('20215012')
      renderAt('/kiosk/scan/step-2')

      act(() => void vi.advanceTimersByTime((IDLE_SECONDS - IDLE_WARN_AT) * 1000))
      expect(screen.getByRole('alertdialog', { name: 'Phiên mượn sắp hết hạn' })).toBeInTheDocument()

      act(() => void vi.advanceTimersByTime(IDLE_WARN_AT * 1000))
      expect(useBorrowSessionStore.getState().scannedBookIds).toEqual([])
      expect(useBorrowSessionStore.getState().studentCardCode).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not interrupt a reader who is still working', () => {
    vi.useFakeTimers()
    try {
      seedCart(1)
      renderAt('/kiosk/scan/step-1')

      // Stop one second short of the warning, touch the screen, then run past where the
      // original deadline would have been.
      act(() => void vi.advanceTimersByTime((IDLE_SECONDS - IDLE_WARN_AT - 1) * 1000))
      act(() => window.dispatchEvent(new Event('pointerdown')))
      act(() => void vi.advanceTimersByTime((IDLE_WARN_AT + 1) * 1000))

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(useBorrowSessionStore.getState().scannedBookIds).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
