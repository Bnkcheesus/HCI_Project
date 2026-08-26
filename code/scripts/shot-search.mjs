// Drives the search screen through the on-screen keyboard so the Telex engine and the
// live-results state are exercised the way a kiosk user would, then captures both.
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })

await page.goto('http://localhost:5173/kiosk/search', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(600)
await page.screenshot({ path: '/tmp/search-idle.png' })
console.log('saved /tmp/search-idle.png (empty state)')

// Type "giair" on the on-screen keyboard -> Telex should render "giải".
for (const key of ['g', 'i', 'a', 'i', 'r']) {
  await page.getByRole('button', { name: key, exact: true }).click()
}

const value = await page.getByRole('searchbox').inputValue()
console.log(`on-screen keyboard produced: "${value}"`)

await page.waitForTimeout(400)
await page.screenshot({ path: '/tmp/search-typing.png' })
console.log('saved /tmp/search-typing.png (live results)')

await browser.close()
