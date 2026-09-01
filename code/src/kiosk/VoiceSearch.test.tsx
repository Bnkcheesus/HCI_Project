import { act, screen } from '@testing-library/react'
import { renderSettled } from '@/test/renderWithQuery'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '@/App'
import { useBorrowSessionStore } from '@/state/useBorrowSessionStore'
import {
  FakeSpeechRecognition,
  installFakeSpeechRecognition,
  removeSpeechRecognition } from '@/test/fakeSpeechRecognition'

async function renderAt(path: string) {
  return renderSettled(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const micButton = () => screen.getByRole('button', { name: /giọng nói|Dừng nghe/ })

describe('Voice search — when the browser supports it', () => {
  let teardown: () => void

  beforeEach(() => {
    useBorrowSessionStore.getState().reset()
    teardown = installFakeSpeechRecognition()
  })
  afterEach(() => teardown())

  it('listens in place when the mic is tapped on the search screen', async () => {
    const user = userEvent.setup()
    await renderAt('/kiosk/search')

    await user.click(micButton())

    expect(FakeSpeechRecognition.last.started).toBe(true)
    expect(FakeSpeechRecognition.last.lang).toBe('vi-VN')
    expect(micButton()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Đang nghe/)).toBeInTheDocument()
  })

  it('previews the partial transcript while the user is still speaking', async () => {
    const user = userEvent.setup()
    await renderAt('/kiosk/search')
    await user.click(micButton())

    act(() => FakeSpeechRecognition.last.emitInterim('giải'))

    expect(screen.getByRole('searchbox')).toHaveValue('giải')
  })

  /**
   * The settled transcript fills the field and the live suggestions follow — it must not
   * jump to the results page, because Vietnamese titles are easy to mishear.
   */
  it('fills the field and updates the suggestions when speech settles', async () => {
    const user = userEvent.setup()
    await renderAt('/kiosk/search')
    await user.click(micButton())

    act(() => FakeSpeechRecognition.last.emitFinal('giải tích'))

    expect(screen.getByRole('searchbox')).toHaveValue('giải tích')
    expect(useBorrowSessionStore.getState().searchQuery).toBe('giải tích')
    // The field fills the instant speech settles; the suggestions are a search away, so
    // they arrive a moment later.
    expect(await screen.findByText('Giải tích 1')).toBeInTheDocument()
    expect(screen.queryByText(/Đang nghe/)).not.toBeInTheDocument()
  })

  // A transcript is already accented; running it through Telex would eat the trailing s.
  it('does not re-encode an accented transcript through Telex', async () => {
    const user = userEvent.setup()
    await renderAt('/kiosk/search')
    await user.click(micButton())

    act(() => FakeSpeechRecognition.last.emitFinal('sách'))

    expect(screen.getByRole('searchbox')).toHaveValue('sách')
  })

  it('explains a denied microphone and points at the keyboard', async () => {
    const user = userEvent.setup()
    await renderAt('/kiosk/search')
    await user.click(micButton())

    act(() => FakeSpeechRecognition.last.emitError('not-allowed'))

    expect(screen.getByText(/Chưa được cấp quyền micro/)).toBeInTheDocument()
    expect(micButton()).toHaveAttribute('aria-pressed', 'false')
  })

  it('explains a network failure', async () => {
    const user = userEvent.setup()
    await renderAt('/kiosk/search')
    await user.click(micButton())

    act(() => FakeSpeechRecognition.last.emitError('network'))

    expect(screen.getByText(/Không kết nối được dịch vụ nhận diện/)).toBeInTheDocument()
  })

  it('stops listening when the mic is tapped again', async () => {
    const user = userEvent.setup()
    await renderAt('/kiosk/search')

    await user.click(micButton())
    expect(micButton()).toHaveAttribute('aria-pressed', 'true')

    await user.click(micButton())
    expect(micButton()).toHaveAttribute('aria-pressed', 'false')
  })

  // The whole point of the request: the mic on the home screen must do both things.
  it('hands off from the home screen and starts listening on arrival', async () => {
    const user = userEvent.setup()
    await renderAt('/kiosk')

    expect(screen.queryByRole('group', { name: 'Bàn phím ảo' })).not.toBeInTheDocument()

    await user.click(micButton())

    expect(screen.getByRole('group', { name: 'Bàn phím ảo' })).toBeInTheDocument()
    expect(FakeSpeechRecognition.last.started).toBe(true)
    expect(screen.getByText(/Đang nghe/)).toBeInTheDocument()
  })

  it('does not listen when the search screen is opened by tapping the field', async () => {
    const user = userEvent.setup()
    await renderAt('/kiosk')

    await user.click(screen.getByRole('searchbox'))

    expect(screen.getByRole('group', { name: 'Bàn phím ảo' })).toBeInTheDocument()
    expect(FakeSpeechRecognition.instances).toHaveLength(0)
    expect(screen.queryByText(/Đang nghe/)).not.toBeInTheDocument()
  })
})

describe('Voice search — when the browser does not support it', () => {
  beforeEach(() => {
    useBorrowSessionStore.getState().reset()
    removeSpeechRecognition()
  })

  // A dead mic button is worse than no button, so it is not rendered at all.
  it('hides the mic on both screens', async () => {
    const { unmount } = await renderAt('/kiosk/search')
    expect(screen.queryByRole('button', { name: /giọng nói/ })).not.toBeInTheDocument()
    unmount()

    await renderAt('/kiosk')
    expect(screen.queryByRole('button', { name: /giọng nói/ })).not.toBeInTheDocument()
  })
})
