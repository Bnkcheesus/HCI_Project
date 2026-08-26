// Verifies the home -> search hand-off: that tapping the search bar navigates, that the
// bar actually moves (shared-element morph), and captures a frame mid-transition.
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })

await page.goto('http://localhost:5173/kiosk', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(800)

const supported = await page.evaluate(() => 'startViewTransition' in document)
console.log(`View Transitions API supported: ${supported}`)

const searchbox = page.getByRole('searchbox')
const before = await searchbox.boundingBox()
console.log(`search bar on /kiosk        : y = ${Math.round(before.y)}`)

await searchbox.click()

// Grab a frame while the morph is still running.
await page.waitForTimeout(180)
await page.screenshot({ path: '/tmp/transition-mid.png' })

await page.waitForTimeout(700)
const after = await page.getByRole('searchbox').boundingBox()
console.log(`search bar on /kiosk/search : y = ${Math.round(after.y)}`)
console.log(`URL after tap               : ${new URL(page.url()).pathname}`)
console.log(`bar travelled               : ${Math.round(after.y - before.y)}px down`)

await page.screenshot({ path: '/tmp/transition-end.png' })
console.log('saved /tmp/transition-mid.png and /tmp/transition-end.png')

await browser.close()
