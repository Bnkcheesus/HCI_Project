/**
 * Who the mobile app is signed in as.
 *
 * There is no backend and therefore no sign-in. The companion app is always the persona
 * the whole project is built for — Nguyễn Minh Khang, card 20215012 (persona.md) — so
 * opening it goes straight to their loans rather than through a login screen that would
 * exist only to be dismissed.
 *
 * One constant rather than the literal scattered through four screens: when a real
 * session arrives, this is the single thing that has to change.
 */
export const MOBILE_ACCOUNT_CARD = '20215012'
