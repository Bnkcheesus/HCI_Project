import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeSpeechRecognition, installFakeSpeechRecognition } from '@/test/fakeSpeechRecognition'
import { useSpeechSearch } from './useSpeechSearch'

/**
 * Safari's recognizer is known to hang: "listening" forever with no onresult, onerror,
 * or onend — most often when the spoken language has no Dictation pack installed. The
 * fake never fires those callbacks on its own, so it stands in for that hang.
 */
describe('useSpeechSearch — watchdog', () => {
  let teardown: () => void

  beforeEach(() => {
    teardown = installFakeSpeechRecognition()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    teardown()
  })

  it('gives up and aborts when the browser never responds', () => {
    const onFinal = vi.fn()
    const { result } = renderHook(() => useSpeechSearch({ onFinal }))

    act(() => result.current.start())
    expect(result.current.status).toBe('listening')

    act(() => vi.advanceTimersByTime(10_000))

    expect(result.current.status).toBe('timeout')
    expect(FakeSpeechRecognition.last.aborted).toBe(true)
  })

  it('pushes the deadline out while speech keeps arriving', () => {
    const onFinal = vi.fn()
    const { result } = renderHook(() => useSpeechSearch({ onFinal }))

    act(() => result.current.start())
    act(() => vi.advanceTimersByTime(9_000))
    act(() => FakeSpeechRecognition.last.emitInterim('giải'))
    // 18s have now passed since start — past the original 10s deadline — but the interim
    // result at 9s pushed it out, so a long sentence is not cut off mid-utterance.
    act(() => vi.advanceTimersByTime(9_000))

    expect(result.current.status).toBe('listening')

    act(() => FakeSpeechRecognition.last.emitFinal('giải tích'))
    expect(onFinal).toHaveBeenCalledWith('giải tích')
  })

  it('does not fire once a final result has already landed', () => {
    const onFinal = vi.fn()
    const { result } = renderHook(() => useSpeechSearch({ onFinal }))

    act(() => result.current.start())
    act(() => FakeSpeechRecognition.last.emitFinal('sách'))
    act(() => vi.advanceTimersByTime(10_000))

    expect(result.current.status).toBe('idle')
  })
})
