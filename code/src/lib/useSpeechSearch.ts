import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Voice search over the Web Speech API — an alternative input path into
 * Product/Service 1 (tìm kiếm từ khoá), and the easiest one for a reader with low
 * vision, who finds the on-screen keyboard slow. The mic button itself comes from the
 * Figma prototype (VoiceButton on the search row).
 *
 * Notes that shaped this wrapper:
 * - Chrome's recognition runs server-side, so it needs a network connection.
 * - The microphone needs a secure context: HTTPS, or localhost during development.
 * - Transcripts come back already accented ("giải tích"), so callers must set the value
 *   directly and must NOT push it through the Telex engine, which would read a trailing
 *   "s" as a tone mark.
 * - Safari's recognizer can hang indefinitely — "listening" forever with no onresult,
 *   onerror, or onend — most often when the spoken language has no Dictation pack
 *   installed on the Mac. A watchdog timer (see WATCHDOG_MS) forces a `timeout` status
 *   so the UI never gets stuck waiting on a browser that has silently given up.
 */

export type SpeechStatus = 'idle' | 'listening' | 'denied' | 'error' | 'timeout'

/**
 * Safari's recognizer is known to hang: it can stay "listening" forever without ever
 * firing onresult, onerror, or onend, especially for a language whose Dictation pack
 * isn't installed. This is how long we wait for a chunk of speech before giving up; it
 * resets on every interim result, so a long sentence is never cut off mid-utterance.
 */
const WATCHDOG_MS = 10_000

/** Only the slice of the API this app touches — avoids depending on lib.dom variations. */
interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechResultEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

interface SpeechResultEventLike {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

type RecognitionCtor = new () => RecognitionLike

/**
 * Read the constructor off `window` at call time rather than at module load, so tests
 * can install a stub before rendering.
 */
function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

interface UseSpeechSearchOptions {
  /** Called once with the settled transcript when the user stops speaking. */
  onFinal: (transcript: string) => void
}

export function useSpeechSearch({ onFinal }: UseSpeechSearchOptions) {
  const [isSupported] = useState(() => getRecognitionCtor() !== null)
  const [status, setStatus] = useState<SpeechStatus>('idle')
  const [interim, setInterim] = useState('')

  const recognitionRef = useRef<RecognitionLike | null>(null)
  // Held in a ref so `start` keeps a stable identity no matter how often the caller
  // re-creates its callback. Seeded on first render, refreshed after every commit.
  const onFinalRef = useRef(onFinal)
  useEffect(() => {
    onFinalRef.current = onFinal
  }, [onFinal])

  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }, [])
  const armWatchdog = useCallback(() => {
    clearWatchdog()
    watchdogRef.current = setTimeout(() => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
      setStatus('timeout')
      setInterim('')
    }, WATCHDOG_MS)
  }, [clearWatchdog])

  const stop = useCallback(() => {
    clearWatchdog()
    recognitionRef.current?.stop()
  }, [clearWatchdog])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return

    // Tapping the mic again while it is already live should stop, not stack a second
    // recognizer on top of the first.
    clearWatchdog()
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }

    const recognition = new Ctor()
    recognition.lang = 'vi-VN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let live = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0]?.transcript ?? ''
        if (result.isFinal) {
          clearWatchdog()
          const settled = text.trim()
          if (settled) onFinalRef.current(settled)
          setInterim('')
          return
        }
        live += text
      }
      // Speech is still coming in — push the deadline back out instead of cutting it off.
      armWatchdog()
      setInterim(live)
    }

    recognition.onerror = (event) => {
      clearWatchdog()
      const denied = event.error === 'not-allowed' || event.error === 'service-not-allowed'
      setStatus(denied ? 'denied' : 'error')
      setInterim('')
      recognitionRef.current = null
    }

    recognition.onend = () => {
      clearWatchdog()
      recognitionRef.current = null
      setInterim('')
      // A permission, network, or timeout failure already set its own status; don't
      // overwrite it.
      setStatus((current) => (current === 'listening' ? 'idle' : current))
    }

    recognitionRef.current = recognition
    setInterim('')
    setStatus('listening')
    recognition.start()
    armWatchdog()
  }, [armWatchdog, clearWatchdog])

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop()
    else start()
  }, [start, stop])

  // Never leave the microphone open behind a screen the user has left.
  useEffect(() => {
    return () => {
      clearWatchdog()
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [clearWatchdog])

  return {
    isSupported,
    status,
    isListening: status === 'listening',
    interim,
    start,
    stop,
    toggle,
  }
}
