import { screen, within } from '@testing-library/react'
import { renderSettled } from '@/test/renderWithQuery'
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
  removeSpeechRecognition } from '@/test/fakeSpeechRecognition'

async function renderChat() {
  return renderSettled(
    <MemoryRouter initialEntries={['/kiosk/ai-chat']}>
      <App />
    </MemoryRouter>,
  )
}

const composer = () => screen.getByLabelText('Câu hỏi cho trợ lý LibAssist')
/**
 * The on-screen keyboard's enter key is the only send control on this screen — the
 * composer used to carry a second one beside the mic, which is a needless choice to put
 * in front of someone standing at a kiosk.
 */
const sendKey = () =>
  within(screen.getByRole('group', { name: 'Bàn phím ảo' })).getByRole('button', { name: 'Gửi' })
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
  it('invites the reader and offers one-tap starters', async () => {
    await renderChat()

    expect(screen.getByText('Trò chuyện với chatbot để tìm sách')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: ASK_AI_BOOKS })).toBeInTheDocument()
    expect(screen.getByText(/Chưa có gợi ý nào/)).toBeInTheDocument()
  })

  it('cannot send an empty question', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.click(sendKey())

    // Nothing was said, so the starter chips are still the whole screen.
    expect(screen.getByRole('button', { name: ASK_AI_BOOKS })).toBeInTheDocument()
    expect(transcript().queryByRole('article')).not.toBeInTheDocument()
  })
})

describe('AI chat — asking a question', () => {
  it('answers a tapped starter and keeps both turns in the transcript', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.click(screen.getByRole('button', { name: ASK_HOURS }))

    expect(transcript().getByText(ASK_HOURS)).toBeInTheDocument()
    expect(await findAnswer(ANSWER_HOURS)).toHaveTextContent('07:00')
  })

  it('answers a typed question', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.type(composer(), 'sach vaatj lys')
    // Physical-keyboard input is routed through Telex, same as the search screen.
    expect(composer()).toHaveValue('sach vật lý')

    await user.click(sendKey())

    expect(await findAnswer(ANSWER_BOOKS)).toBeInTheDocument()
    // The field empties so the next question starts clean.
    expect(composer()).toHaveValue('')
  })

  /**
   * With the composer's own send button gone, the form has a single text field and no
   * submit button — which is exactly the case where the browser submits on Enter by
   * itself. Someone on a physical keyboard must not be forced down to the on-screen one.
   */
  it('sends on Enter from a physical keyboard', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.type(composer(), 'sach vaatj lys{Enter}')

    expect(await findAnswer(ANSWER_BOOKS)).toBeInTheDocument()
    expect(composer()).toHaveValue('')
  })

  /** A silent gap after sending reads as a broken kiosk. */
  it('shows a thinking indicator, then replaces it with the answer', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.click(screen.getByRole('button', { name: ASK_HOURS }))

    expect(screen.getByLabelText('Trợ lý đang soạn câu trả lời')).toBeInTheDocument()

    await findAnswer(ANSWER_HOURS)
    expect(screen.queryByLabelText('Trợ lý đang soạn câu trả lời')).not.toBeInTheDocument()
  })

  // The persona has low vision: a new answer has to be announced, not merely drawn.
  it('publishes the transcript as a live region', async () => {
    await renderChat()
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite')
  })

  it('sends from the on-screen keyboard', async () => {
    const user = userEvent.setup()
    await renderChat()

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
    await renderChat()

    await user.click(screen.getByRole('button', { name: ASK_AI_BOOKS }))
    await findAnswer(ANSWER_BOOKS)

    /*
     * `findBy`, not `getBy`. The reply names book *ids*; the panel then fetches the
     * records for them, so the list fills a beat after the answer text appears. That gap
     * is real on the kiosk too — this is the assertion noticing it, not working around it.
     */
    const row = await sidePanel().findByRole('button', { name: /Hands-On Machine Learning/ })
    expect(row).toHaveTextContent('Kệ A4')
    expect(row).toHaveTextContent(`Còn ${availability['hands-on-ml'].copiesAvailable} cuốn`)
  })

  it('marks the answered shelves on the floor map legend', async () => {
    const user = userEvent.setup()
    await renderChat()

    expect(screen.getByText(/Kệ sách sẽ được đánh dấu ở đây/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: ASK_LOCATION }))
    await findAnswer(ANSWER_LOCATION)

    // The legend is drawn from the shelves that come back with the suggested books, so
    // it lands a moment after the reply text.
    expect(await sidePanel().findByText(/Kệ MA-101 — Khu Toán đại cương, tầng 1/)).toBeInTheDocument()
  })

  it('opens a suggested book on the detail screen', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.click(screen.getByRole('button', { name: ASK_LOCATION }))
    await findAnswer(ANSWER_LOCATION)

    await user.click(await sidePanel().findByRole('button', { name: /Giải tích 1/ }))

    expect(await screen.findByRole('button', { name: /Mượn sách|Đã mượn hết/ })).toBeInTheDocument()
    expect(useBorrowSessionStore.getState().selectedBookId).toBe('giai-tich-1')
  })

  /**
   * Answering "mấy giờ" after a book question must not blank the panel — the reader is
   * still standing there deciding which of those books to walk to.
   */
  it('keeps the last real suggestions when a later answer has no books', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.click(screen.getByRole('button', { name: ASK_LOCATION }))
    await findAnswer(ANSWER_LOCATION)

    await user.click(composer())
    await user.paste('Thư viện mở cửa mấy giờ')
    await user.click(sendKey())
    await findAnswer(ANSWER_HOURS)

    expect(await sidePanel().findByRole('button', { name: /Giải tích 1/ })).toBeInTheDocument()
  })
})

describe('AI chat — the conversation survives a detour', () => {
  /**
   * The assistant suggests books, the reader opens one, then comes back. Losing the
   * transcript would mean re-typing the whole question on an on-screen keyboard.
   */
  it('still has the transcript after visiting a book and returning', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.click(screen.getByRole('button', { name: ASK_LOCATION }))
    await findAnswer(ANSWER_LOCATION)

    await user.click(await sidePanel().findByRole('button', { name: /Giải tích 1/ }))
    await user.click(await screen.findByRole('button', { name: /^Quay về$/ }))

    expect(screen.getByRole('log')).toHaveTextContent(ASK_LOCATION)
  })
})

describe('AI chat — clearing the conversation', () => {
  const clearButton = () => screen.getByRole('button', { name: 'Xoá hội thoại' })

  /**
   * A kiosk is shared. The next reader should not find the last one's questions waiting.
   *
   * Asserted on the *answer*, not the question: `ASK_HOURS` is also one of the starter
   * chips, so it reappears in the empty state the moment the clear succeeds. Matching on
   * it would fail on a working screen and pass on a broken one.
   */
  it('empties the transcript and returns to the starter state', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.click(screen.getByRole('button', { name: ASK_HOURS }))
    await findAnswer(ANSWER_HOURS)

    await user.click(clearButton())

    expect(screen.getByRole('log')).not.toHaveTextContent(ANSWER_HOURS)
    expect(screen.getByText('Trò chuyện với chatbot để tìm sách')).toBeInTheDocument()
  })

  /** The panel is derived from the transcript, so it has to go with it. */
  it('takes the suggested books and the shelf pins away too', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.click(screen.getByRole('button', { name: ASK_LOCATION }))
    await findAnswer(ANSWER_LOCATION)
    expect(await sidePanel().findByRole('button', { name: /Giải tích 1/ })).toBeInTheDocument()

    await user.click(clearButton())

    expect(screen.getByText(/Chưa có gợi ý nào/)).toBeInTheDocument()
    expect(screen.getByText(/Kệ sách sẽ được đánh dấu ở đây/)).toBeInTheDocument()
  })

  /** Nothing to clear yet — an enabled control that does nothing is worse than no control. */
  it('is absent until there is something to clear', async () => {
    await renderChat()
    expect(screen.queryByRole('button', { name: 'Xoá hội thoại' })).not.toBeInTheDocument()
  })

  /**
   * Clearing mid-answer would leave the reply to land in an empty transcript — an answer
   * with no question above it, because `ask` appends to whatever `messages` holds when the
   * request resolves. The button is disabled for exactly that window.
   */
  it('cannot be pressed while the assistant is still answering', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.click(screen.getByRole('button', { name: ASK_HOURS }))
    expect(clearButton()).toBeDisabled()

    await findAnswer(ANSWER_HOURS)
    expect(clearButton()).toBeEnabled()
  })

  /**
   * The button removes itself along with the transcript. Without moving the caret, focus
   * falls to <body> and a keyboard or screen-reader user loses their place on the screen.
   */
  it('puts the caret back in the question box', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.click(screen.getByRole('button', { name: ASK_HOURS }))
    await findAnswer(ANSWER_HOURS)

    await user.click(clearButton())

    expect(composer()).toHaveFocus()
  })

  /** A question being typed is not part of the conversation, so it stays. */
  it('leaves a half-typed question alone', async () => {
    const user = userEvent.setup()
    await renderChat()

    await user.click(screen.getByRole('button', { name: ASK_HOURS }))
    await findAnswer(ANSWER_HOURS)

    await user.type(composer(), 'vat ly')
    await user.click(clearButton())

    expect(composer()).toHaveValue('vat ly')
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
    await renderChat()

    await user.click(screen.getByRole('button', { name: 'Hỏi bằng giọng nói' }))
    expect(FakeSpeechRecognition.last.lang).toBe('vi-VN')

    // "sách" already carries its tone mark; Telex would read the trailing s as one.
    FakeSpeechRecognition.last.emitFinal('sách vật lý')
    expect(await screen.findByDisplayValue('sách vật lý')).toBeInTheDocument()
  })
})

describe('AI chat — when the browser has no speech support', () => {
  beforeEach(() => removeSpeechRecognition())

  it('hides the mic rather than showing a dead button', async () => {
    await renderChat()
    expect(screen.queryByRole('button', { name: 'Hỏi bằng giọng nói' })).not.toBeInTheDocument()
    expect(sendKey()).toBeInTheDocument()
  })
})
