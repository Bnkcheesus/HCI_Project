/**
 * Timings for the self-checkout's idle watchdog (see useKioskIdle.ts).
 *
 * Shared by both scan steps so the countdown does not reset to a different length when
 * the reader moves between them, and so tests can reference one number.
 */

/** Idle seconds before an unfinished checkout clears itself. */
export const IDLE_SECONDS = 90

/**
 * Seconds left when the warning appears. Long enough to notice, read and react while
 * holding a stack of books — a five-second warning on a kiosk is just a jump scare.
 */
export const IDLE_WARN_AT = 25

/**
 * The card the "Mô phỏng quét thẻ" button reads.
 *
 * The persona's own number (persona.md), named here rather than reached for as
 * `students[0]` — the browser no longer holds the card table, and a demo control should
 * name the thing it is demonstrating anyway.
 */
export const DEMO_CARD_CODE = '20215012'
