/**
 * A controllable stand-in for the Web Speech API.
 *
 * jsdom has no SpeechRecognition and no microphone, and Chrome's real recognizer is a
 * cloud service — so driving a fake is the only way to exercise the voice-search flow
 * automatically. `useSpeechSearch` reads the constructor off `window` at call time
 * precisely so this can be installed before a render.
 */

interface Handlers {
  onresult: ((event: unknown) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

export class FakeSpeechRecognition implements Handlers {
  static instances: FakeSpeechRecognition[] = []
  /** The most recently constructed recognizer — the one a test just triggered. */
  static get last(): FakeSpeechRecognition {
    return FakeSpeechRecognition.instances[FakeSpeechRecognition.instances.length - 1]
  }

  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  started = false
  aborted = false

  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onend: (() => void) | null = null

  constructor() {
    FakeSpeechRecognition.instances.push(this)
  }

  start() {
    this.started = true
  }

  stop() {
    this.started = false
    this.onend?.()
  }

  abort() {
    this.aborted = true
    this.started = false
  }

  /** Emit a partial transcript, as the API does while the user is still speaking. */
  emitInterim(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [Object.assign([{ transcript }], { isFinal: false })],
    })
  }

  /** Emit the settled transcript, then end the session like the real API does. */
  emitFinal(transcript: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [Object.assign([{ transcript }], { isFinal: true })],
    })
    this.onend?.()
  }

  emitError(error: string) {
    this.onerror?.({ error })
  }
}

/** Install the fake and return a teardown that removes it again. */
export function installFakeSpeechRecognition() {
  FakeSpeechRecognition.instances = []
  ;(window as unknown as Record<string, unknown>).SpeechRecognition = FakeSpeechRecognition
  return () => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition
    FakeSpeechRecognition.instances = []
  }
}

export function removeSpeechRecognition() {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
}
