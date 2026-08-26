import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'
import { SearchResultsPage } from './SearchResultsPage'

function renderResults(query = 'machine learning') {
  useBorrowSessionStore.getState().setSearchQuery(query)
  return render(
    <MemoryRouter initialEntries={['/kiosk/search/results']}>
      <SearchResultsPage />
    </MemoryRouter>,
  )
}

function cardTitles() {
  return within(screen.getByRole('main'))
    .getAllByRole('listitem')
    .map((li) => within(li).getByRole('button').textContent ?? '')
}

describe('Kiosk SearchResultsPage', () => {
  beforeEach(() => {
    useBorrowSessionStore.getState().reset()
  })

  it('lists the matching titles for the current query', () => {
    renderResults()
    const titles = cardTitles().join(' ')
    expect(titles).toContain('An Introduction to Statistical Learning')
    expect(titles).toContain('Hands-On Machine Learning')
  })

  // Pain Reliever 2: a book that is out shows when it comes back, not a shelf to walk to.
  it('shows the shelf for available books and the return date for borrowed ones', () => {
    renderResults()
    const titles = cardTitles()
    expect(titles.find((t) => t.includes('Statistical Learning'))).toContain('Kệ A3')
    expect(titles.find((t) => t.includes('Pattern Recognition'))).toContain('Chờ trả: 25/11')
  })

  it('narrows results with the document-type filter', async () => {
    const user = userEvent.setup()
    renderResults()

    await user.click(screen.getByRole('tab', { name: /Tạp chí/ }))

    const titles = cardTitles()
    expect(titles).toHaveLength(1)
    expect(titles[0]).toContain('Tia Sáng')
  })

  it('sorts books that are on the shelf to the front', async () => {
    const user = userEvent.setup()
    renderResults()

    await user.selectOptions(screen.getByLabelText(/sắp xếp/i), 'available')

    // "Pattern Recognition" is the borrowed one, so it must not lead the list.
    expect(cardTitles()[0]).not.toContain('Pattern Recognition')
    expect(cardTitles().at(-1)).toContain('Đã mượn hết')
  })

  it('reports the visible range', () => {
    renderResults()
    expect(screen.getByText(/Hiển thị 1–7 trong 7 kết quả/)).toBeInTheDocument()
  })

  it('offers a way back to search when nothing matches', async () => {
    renderResults('zzzz')
    expect(screen.getByText(/Không tìm thấy tài liệu nào/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tìm lại' })).toBeInTheDocument()
  })
})

describe('Advanced filter popover', () => {
  beforeEach(() => {
    useBorrowSessionStore.getState().reset()
  })

  it('opens from the toolbar button and closes on Escape', async () => {
    const user = userEvent.setup()
    renderResults()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Bộ lọc nâng cao/ }))
    expect(screen.getByRole('dialog', { name: 'Bộ lọc nâng cao' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // Applies live: ticking a box must change the grid behind the panel immediately.
  it('filters the grid the moment a box is ticked, and counts it on the button', async () => {
    const user = userEvent.setup()
    renderResults()
    const before = cardTitles().length

    await user.click(screen.getByRole('button', { name: /Bộ lọc nâng cao/ }))
    await user.click(screen.getByLabelText('Tiếng Việt'))

    expect(cardTitles().length).toBeLessThan(before)
    expect(screen.getByRole('button', { name: /Bộ lọc nâng cao/ })).toHaveTextContent('1')
  })

  it('restores everything with Đặt lại', async () => {
    const user = userEvent.setup()
    renderResults()
    const before = cardTitles().length

    await user.click(screen.getByRole('button', { name: /Bộ lọc nâng cao/ }))
    await user.click(screen.getByLabelText('Tiếng Việt'))
    await user.click(screen.getByRole('button', { name: 'Đặt lại' }))

    expect(cardTitles()).toHaveLength(before)
  })

  it('offers a way out when the filters exclude every result', async () => {
    const user = userEvent.setup()
    renderResults()

    await user.click(screen.getByRole('button', { name: /Bộ lọc nâng cao/ }))
    // Vietnamese + out of stock matches nothing in this result set.
    await user.click(screen.getByLabelText('Tiếng Việt'))
    await user.click(screen.getByLabelText('Hết sách'))

    expect(screen.getByText(/Bộ lọc hiện tại không còn tài liệu nào/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đặt lại bộ lọc' })).toBeInTheDocument()
  })

  it('exposes both slider handles to assistive tech', async () => {
    const user = userEvent.setup()
    renderResults()
    await user.click(screen.getByRole('button', { name: /Bộ lọc nâng cao/ }))

    expect(screen.getByLabelText('Năm xuất bản từ')).toBeInTheDocument()
    expect(screen.getByLabelText('Năm xuất bản đến')).toBeInTheDocument()
  })
})
