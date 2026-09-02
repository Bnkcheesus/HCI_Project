import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { books } from '@/mocks'
import { MOBILE_ACCOUNT_CARD } from '@/mobile/account'
import { fakeApiState } from '@/test/fakeApi'
import { renderSettled } from '@/test/renderWithQuery'
import { AdminReturnPage } from './ReturnPage'

async function renderAdmin() {
  return renderSettled(
    <MemoryRouter initialEntries={['/admin']}>
      <AdminReturnPage />
    </MemoryRouter>,
  )
}

const title = (bookId: string) => books.find((b) => b.id === bookId)!.title

/** What the persona's card has out in the fixture, straight from the fake API's state. */
function openBookIds(cardCode: string): string[] {
  return fakeApiState
    .loans()
    .filter((l) => l.studentId === cardCode && l.returnedAt === null)
    .map((l) => l.bookId)
}

describe('Admin return page', () => {
  it('lists the books the card still has out', async () => {
    await renderAdmin()
    const out = openBookIds(MOBILE_ACCOUNT_CARD)

    expect(screen.getByRole('heading', { name: `Đang mượn (${out.length})` })).toBeInTheDocument()
    for (const bookId of out) {
      expect(screen.getByText(title(bookId))).toBeInTheDocument()
    }
  })

  /**
   * The point of the whole feature: the copy goes back on the shelf.
   *
   * Asserted against the fake API's own state rather than against a rendered number,
   * because the count the kiosk shows comes from a different screen — what has to be true
   * here is that the write happened.
   */
  it('returns a book and puts the copy back', async () => {
    await renderAdmin()
    const [bookId] = openBookIds(MOBILE_ACCOUNT_CARD)
    const before = fakeApiState.copies()[bookId].copiesAvailable

    await userEvent.click(screen.getAllByRole('button', { name: 'Trả sách' })[0])

    await waitFor(() => {
      expect(fakeApiState.copies()[bookId].copiesAvailable).toBe(before + 1)
    })
    expect(openBookIds(MOBILE_ACCOUNT_CARD)).not.toContain(bookId)
  })

  it('drops the returned book out of the list', async () => {
    await renderAdmin()
    const out = openBookIds(MOBILE_ACCOUNT_CARD)

    await userEvent.click(screen.getAllByRole('button', { name: 'Trả sách' })[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: `Đang mượn (${out.length - 1})` })).toBeInTheDocument()
    })
  })

  it('confirms the return in words, not just by the row disappearing', async () => {
    await renderAdmin()
    const [bookId] = openBookIds(MOBILE_ACCOUNT_CARD)

    await userEvent.click(screen.getAllByRole('button', { name: 'Trả sách' })[0])

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent(title(bookId))
  })

  /** Switching cards is the fastest path through a demo; it must actually refetch. */
  it('shows another card\'s loans when one of the shortcuts is used', async () => {
    await renderAdmin()

    await userEvent.click(screen.getByRole('button', { name: /20217777/ }))

    const out = openBookIds('20217777')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: `Đang mượn (${out.length})` })).toBeInTheDocument()
    })
    expect(screen.getByText(title(out[0]))).toBeInTheDocument()
  })

  it('says so when the card has nothing out', async () => {
    await renderAdmin()

    // 25215012 borrows fine but starts with an empty history.
    await userEvent.click(screen.getByRole('button', { name: /25215012/ }))

    expect(await screen.findByText('Thẻ này không còn cuốn nào đang mượn.')).toBeInTheDocument()
  })
})
