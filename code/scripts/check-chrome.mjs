// Checks that every kiosk screen keeps its chrome pinned: the header stays at the top
// and the footer at the bottom of the viewport, with only the content between them
// scrolling. The page itself must never scroll — a kiosk has no scrollbar to grab and a
// footer that drifts upward takes the live status and support number off screen with it.
//
// Run against short viewports on purpose: at the full 900px most screens have nothing to
// scroll, so the bug this guards against simply cannot appear.
import { chromium } from 'playwright'

const ROUTES = [
  '/kiosk',
  '/kiosk/search',
  '/kiosk/search/results',
  '/kiosk/ai-chat',
  '/kiosk/books/giai-tich-1',
  '/kiosk/scan',
  '/kiosk/scan/step-1',
]

/**
 * 900 is the kiosk itself; the shorter two are a developer's browser window, where the
 * original bug was actually noticed.
 *
 * 640 is the tested floor, not an arbitrary one: the search screen needs 621px before
 * anything can move, because the on-screen keyboard's keys sit on the 48px touch-target
 * minimum and the chrome is fixed. Shrinking those to fit a shorter window would break
 * the thing they exist for, so below ~640px this layout is simply out of range.
 */
const HEIGHTS = [900, 768, 640]

const browser = await chromium.launch()
let failures = 0

for (const height of HEIGHTS) {
  console.log(`\n— viewport 1280x${height} —`)

  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1280, height } })
    await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(400)

    const result = await page.evaluate((vh) => {
      const footer = document.querySelector('footer')
      const header = document.querySelector('header')
      const scroller = [...document.querySelectorAll('main, main *')].find(
        (el) => el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflowY === 'auto',
      )

      const before = footer?.getBoundingClientRect().bottom ?? null
      if (scroller) scroller.scrollTop = scroller.scrollHeight

      return {
        pageScrolls: document.documentElement.scrollHeight > vh + 1,
        headerTop: Math.round(header?.getBoundingClientRect().top ?? NaN),
        footerBefore: before === null ? null : Math.round(before),
        footerAfter: footer ? Math.round(footer.getBoundingClientRect().bottom) : null,
        didScroll: Boolean(scroller),
      }
    }, height)

    const pinned =
      !result.pageScrolls &&
      result.headerTop === 0 &&
      result.footerAfter !== null &&
      result.footerAfter === result.footerBefore &&
      result.footerAfter <= height

    if (!pinned) failures++
    console.log(
      `  ${route.padEnd(28)} footer ${result.footerBefore}→${result.footerAfter}` +
        `  page-scrolls=${result.pageScrolls}  inner-scroll=${result.didScroll}  ${pinned ? 'ok' : 'BROKEN'}`,
    )

    await page.close()
  }
}

await browser.close()

console.log(failures === 0 ? '\nAll screens keep their chrome pinned.' : `\n${failures} screen(s) BROKEN`)
process.exit(failures === 0 ? 0 : 1)
