import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '@/App'
import { availability } from '@/mocks'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'
import { useChatStore } from '@/state/useChatStore'
import {
  FakeSpeechRecognition,
  installFakeSpeechRecognition,
  removeSpeechRecognition,
} from '@/test/fakeSpeechRecognition'

function renderChat() {
  return render(
    <MemoryRouter initialEntries={['/kiosk/ai-chat']}>
      <App />
    </MemoryRouter>,
  )
}

const composer = () => screen.getByLabelText('Câu hỏi cho trợ lý LibAssist')
const sidePanel = () => within(screen.getByRole('complementary'))
const transcript = () => within(screen.getByRole('log'))

/**
 * Wait for the assistant's reply, which lands after THINKING_MS.
 *
 * Scoped to the transcript and matched on wording unique to the reply — the whole
 * screen contains the reader's own question, the starter chips and the footer's opening
 * hours, so a loose `screen.findByText` resolves before the answer has arrived and the
 * assertion that follows tests nothing.
 */
function findAnswer(matcher: RegExp) {
  return transcript().findByText(matcher, undefined, { timeout: 3000 })
}

const ASK_HOURS = 'Thư viện mở cửa mấy giờ?'
const ASK_LOCATION = 'Sách Giải tích 1 nằm ở kệ nào?'
const ASK_AI_BOOKS = 'Sách về trí tuệ nhân tạo còn trên kệ'

/** Phrases that appear only in an assistant reply, never in the question or the chrome. */
const ANSWER_HOURS = /Cần hỗ trợ gấp/
const ANSWER_LOCATION = /Rẽ trái ở quầy thủ thư/
const ANSWER_BOOKS = /Mình tìm thấy/

beforeEach(() => {
  useChatStore.getState().reset()
  useBorrowSessionStore.getState().reset()
})

describe('AI chat — the empty state', () => {
  it('invites the reader and offers one-tap starters', () => {
    renderChat()

    expect(screen.getByText('Trò chuyện với chatbot để tìm sách')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: ASK_AI_BOOKS })).toBeInTheDocument()
    expect(screen.getByText(/Chưa có gợi ý nào/)).toBeInTheDocument()
  })

  it('cannot send an empty question', () => {
    renderChat()
    expect(screen.getByRole('button', { name: 'Gửi câu hỏi' })).toBeDisabled()
  })
})

describe('AI chat — asking a question', () => {
  it('answers a tapped starter and keeps both turns in the transcript', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: ASK_HOURS }))

    expect(transcript().getByText(ASK_HOURS)).toBeInTheDocument()
    expect(await findAnswer(ANSWER_HOURS)).toHaveTextContent('07:00')
  })

  it('answers a typed question', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.type(composer(), 'sach vaatj lys')
    // Physical-keyboard input is routed through Telex, same as the search screen.
    expect(composer()).toHaveValue('sach vật lý')

    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))

    expect(await findAnswer(ANSWER_BOOKS)).toBeInTheDocument()
    // The field empties so the next question starts clean.
    expect(composer()).toHaveValue('')
  })

  /** A silent gap after sending reads as a broken kiosk. */
  it('shows a thinking indicator, then replaces it with the answer', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: ASK_HOURS }))

    expect(screen.getByLabelText('Trợ lý đang soạn câu trả lời')).toBeInTheDocument()

    await findAnswer(ANSWER_HOURS)
    expect(screen.queryByLabelText('Trợ lý đang soạn câu trả lời')).not.toBeInTheDocument()
  })

  // The persona has low vision: a new answer has to be announced, not merely drawn.
  it('publishes the transcript as a live region', () => {
    renderChat()
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite')
  })

  it('sends from the on-screen keyboard', async () => {
    const user = userEvent.setup()
    renderChat()

    const keyboard = within(screen.getByRole('group', { name: 'Bàn phím ảo' }))
    // The enter key must say what it does here — "Tìm kiếm" would promise a search.
    expect(keyboard.queryByRole('button', { name: 'Tìm kiếm' })).not.toBeInTheDocument()

    await user.click(keyboard.getByRole('button', { name: 'l' }))
    await user.click(keyboard.getByRole('button', { name: 'y' }))
    expect(composer()).toHaveValue('ly')

    await user.click(keyboard.getByRole('button', { name: 'Gửi' }))
    expect(await findAnswer(/Mình chưa tìm được|Mình tìm thấy/)).toBeInTheDocument()
  })
})

describe('AI chat — the suggestion panel', () => {
  it('lists the answered books with shelf and availability', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: ASK_AI_BOOKS }))
    await findAnswer(ANSWER_BOOKS)

    const row = sidePanel().getByRole('button', { name: /Hands-On Machine Learning/ })
    expect(row).toHaveTextContent('Kệ A4')
    expect(row).toHaveTextContent(`Còn ${availability['hands-on-ml'].copiesAvailable} cuốn`)
  })

  it('marks the answered shelves on the floor map legend', async () => {
    const user = userEvent.setup()
    renderChat()

    expect(screen.getByText(/Kệ sách sẽ được đánh dấu ở đây/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: ASK_LOCATION }))
    await findAnswer(ANSWER_LOCATION)

    expect(sidePanel().getByText(/Kệ MA-101 — Khu Toán đại cương, tầng 1/)).toBeInTheDocument()
  })

  it('opens a suggested book on the detail screen', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: ASK_LOCATION }))
    await findAnswer(ANSWER_LOCATION)

    await user.click(sidePanel().getByRole('button', { name: /Giải tích 1/ }))

    expect(screen.getByRole('button', { name: /Mượn sách|Đã mượn hết/ })).toBeInTheDocument()
    expect(useBorrowSessionStore.getState().selectedBookId).toBe('giai-tich-1')
  })

  /**
   * Answering "mấy giờ" after a book question must not blank the panel — the reader is
   * still standing there deciding which of those books to walk to.
   */
  it('keeps the last real suggestions when a later answer has no books', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: ASK_LOCATION }))
    await findAnswer(ANSWER_LOCATION)

    await user.click(composer())
    await user.paste('Thư viện mở cửa mấy giờ')
    await user.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }))
    await findAnswer(ANSWER_HOURS)

    expect(sidePanel().getByRole('button', { name: /Giải tích 1/ })).toBeInTheDocument()
  })
})

describe('AI chat — the conversation survives a detour', () => {
  /**
   * The assistant suggests books, the reader opens one, then comes back. Losing the
   * transcript would mean re-typing the whole question on an on-screen keyboard.
   */
  it('still has the transcript after visiting a book and returning', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: ASK_LOCATION }))
    await findAnswer(ANSWER_LOCATION)

    await user.click(sidePanel().getByRole('button', { name: /Giải tích 1/ }))
    await user.click(screen.getByRole('button', { name: /^Quay về$/ }))

    expect(screen.getByRole('log')).toHaveTextContent(ASK_LOCATION)
  })
})

describe('AI chat — voice input', () => {
  let teardown: () => void
  beforeEach(() => {
    teardown = installFakeSpeechRecognition()
  })
  afterEach(() => teardown())

  it('fills the question box from speech without re-encoding it through Telex', async () => {
    const user = userEvent.setup()
    renderChat()

    await user.click(screen.getByRole('button', { name: 'Hỏi bằng giọng nói' }))
    expect(FakeSpeechRecognition.last.lang).toBe('vi-VN')

    // "sách" already carries its tone mark; Telex would read the trailing s as one.
    FakeSpeechRecognition.last.emitFinal('sách vật lý')
    expect(await screen.findByDisplayValue('sách vật lý')).toBeInTheDocument()
  })
})

describe('AI chat — when the browser has no speech support', () => {
  beforeEach(() => removeSpeechRecognition())

  it('hides the mic rather than showing a dead button', () => {
    renderChat()
    expect(screen.queryByRole('button', { name: 'Hỏi bằng giọng nói' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gửi câu hỏi' })).toBeInTheDocument()
  })
})
