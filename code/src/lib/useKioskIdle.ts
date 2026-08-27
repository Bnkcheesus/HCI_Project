import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Idle watchdog for the self-checkout screens.
 *
 * A kiosk stands in a public hallway. If a reader scans their card and then walks off —
 * called away, distracted, thinks it finished — the next person at the machine inherits
 * a live session with someone else's card in it and can borrow books against it. So the
 * checkout counts down while nothing is happening, warns before it acts, and then clears
 * the session itself.
 *
 * Any real interaction anywhere on the page restarts the count, so a reader who is
 * simply reading the screen slowly is never interrupted mid-thought.
 */

export interface UseKioskIdleOptions {
  /** Total idle seconds before `onExpire` runs. */
  seconds: number
  /** Seconds remaining at which the warning appears. */
  warnAt: number
  onExpire: () => void
  /** Pause the watchdog — the receipt screen has nothing left to protect. */
  enabled?: boolean
}

export function useKioskIdle({
  seconds,
  warnAt,
  onExpire,
  enabled = true,
}: UseKioskIdleOptions) {
  const [remaining, setRemaining] = useState(seconds)

  // Held in a ref so the ticking effect never restarts just because the caller passed a
  // freshly-created callback, which would reset the countdown on every render.
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  const reset = useCallback(() => setRemaining(seconds), [seconds])

  useEffect(() => {
    if (!enabled) return

    const tick = setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          clearInterval(tick)
          onExpireRef.current()
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => clearInterval(tick)
  }, [enabled])

  // Restart on any sign of life. Passive + capture so it sees the event no matter which
  // element handles it, without interfering with the interaction itself.
  useEffect(() => {
    if (!enabled) return

    const wake = () => setRemaining(seconds)
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    for (const type of events) {
      window.addEventListener(type, wake, { passive: true, capture: true })
    }
    return () => {
      for (const type of events) {
        window.removeEventListener(type, wake, { capture: true })
      }
    }
  }, [enabled, seconds])

  return { remaining, isWarning: enabled && remaining <= warnAt, reset }
}
