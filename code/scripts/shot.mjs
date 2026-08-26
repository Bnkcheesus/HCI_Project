// Screenshot driver — drives the running dev server so a screen can actually be
// looked at, not just compiled. Usage:
//   node scripts/shot.mjs /kiosk out.png [--a11y]
// Assumes `npm run dev` is already serving on :5173.
import { chromium } from 'playwright'

const [route = '/kiosk', out = 'shot.png', ...flags] = process.argv.slice(2)
const a11y = flags.includes('--a11y')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })

await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle' })

if (a11y) {
  await page.getByRole('button', { name: /trợ năng/i }).click()
}

// Let fonts settle and the entrance animation finish before capturing.
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(1200)

await page.screenshot({ path: out, fullPage: true })
console.log(`saved ${out} (${route}${a11y ? ' + a11y' : ''})`)

await browser.close()
