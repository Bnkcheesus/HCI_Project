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

/**
 * The home screen has to fit whole — no scrolling — at every height a kiosk or laptop
 * actually runs at.
 *
 * Pinned chrome is not enough on its own: the subject shortcuts sit at the bottom of the
 * track, so when the cards above them grow the shortcuts slide out of sight while every
 * check above still reports "ok". They are the persona's fastest path when they know the
 * field but not the title. The AI entry shares that bottom row and must not land on a
 * book card either.
 *
 * 720px is the stated floor — below it the covers are at their minimum and the screen
 * scrolls rather than letting rows overlap.
 */
console.log('\n— home fits without scrolling —')
for (const [width, height] of [
  [1280, 720],
  [1280, 768],
  [1366, 768],
  [1280, 800],
  [1280, 900],
  [1920, 1080],
]) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto('http://localhost:5173/kiosk', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(350)

  const r = await page.evaluate(() => {
    const main = document.querySelector('main')
    const chips = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Toán học')
    const ai = document.querySelector('button[aria-label*="trợ lý AI"]')
    const cards = [...document.querySelectorAll('main ul > li button')]
    const mb = main.getBoundingClientRect()
    const cb = chips.getBoundingClientRect()
    const ab = ai.getBoundingClientRect()
    const hits = (r) => !(ab.right < r.left || ab.left > r.right || ab.bottom < r.top || ab.top > r.bottom)
    return {
      scrolls: main.scrollHeight > main.clientHeight,
      chipsInView: cb.top >= mb.top - 1 && cb.bottom <= mb.bottom + 1,
      aiCollides: cards.some((c) => hits(c.getBoundingClientRect())) || hits(cb),
      cover: Math.round(cards[0].querySelector('div').getBoundingClientRect().height),
    }
  })

  const ok = !r.scrolls && r.chipsInView && !r.aiCollides
  if (!ok) failures++
  console.log(
    `  ${String(width + 'x' + height).padEnd(10)} scrolls=${String(r.scrolls).padEnd(5)}` +
      ` chips-in-view=${String(r.chipsInView).padEnd(5)} ai-collides=${String(r.aiCollides).padEnd(5)}` +
      ` cover=${r.cover}px  ${ok ? 'ok' : 'BROKEN'}`,
  )
  await page.close()
}

/**
 * Narrower than the kiosk, the grid wraps to two rows and the no-scroll guarantee is off —
 * but nothing may overlap. Forcing the tall two-row grid into a short frame spilled the
 * second row of covers out under the subject shortcuts, which then drew straight over the
 * cards and hid their availability chips: the one thing on a book card that answers the
 * persona's worst pain. So here the list must be exactly as tall as its contents, and the
 * shortcut row must sit clear of every card.
 */
console.log('\n— narrow widths: nothing overlaps —')
for (const [width, height] of [
  [1024, 800],
  [900, 800],
  [820, 1180],
  [768, 1024],
]) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto('http://localhost:5173/kiosk', { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(350)

  const r = await page.evaluate(() => {
    const ul = document.querySelector('main section ul')
    const cards = [...ul.querySelectorAll(':scope > li > button')]
    const shortcuts = [...document.querySelectorAll('button')]
      .find((b) => b.textContent.trim() === 'Toán học')
      .closest('div[class*="kiosk-rise"]')
    const sb = shortcuts.getBoundingClientRect()
    return {
      gridOverflows: ul.scrollHeight > ul.clientHeight + 1,
      shortcutsOverCard: cards.some((c) => {
        const r = c.getBoundingClientRect()
        return !(sb.right < r.left || sb.left > r.right || sb.bottom < r.top || sb.top > r.bottom)
      }),
      chipsMissing: cards.some((c) => !c.querySelector('span.absolute.right-3')),
    }
  })

  const ok = !r.gridOverflows && !r.shortcutsOverCard && !r.chipsMissing
  if (!ok) failures++
  console.log(
    `  ${String(width + 'x' + height).padEnd(10)} grid-overflows=${String(r.gridOverflows).padEnd(5)}` +
      ` shortcuts-over-card=${String(r.shortcutsOverCard).padEnd(5)}` +
      ` chips-missing=${String(r.chipsMissing).padEnd(5)} ${ok ? 'ok' : 'BROKEN'}`,
  )
  await page.close()
}

await browser.close()

console.log(failures === 0 ? '\nAll screens keep their chrome pinned.' : `\n${failures} screen(s) BROKEN`)
process.exit(failures === 0 ? 0 : 1)
