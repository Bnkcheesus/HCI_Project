// Walks the real user path into the results screen — type on the on-screen keyboard,
// submit, then exercise the type filter, the sort control and pagination.
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })

await page.goto('http://localhost:5173/kiosk/search', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)

for (const key of ['m', 'a', 'c', 'h', 'i', 'n', 'e']) {
  await page.getByRole('button', { name: key, exact: true }).click()
}
await page.getByRole('button', { name: 'Tìm kiếm' }).click()
await page.waitForTimeout(700)

console.log(`URL          : ${new URL(page.url()).pathname}`)
console.log(`heading      : ${await page.locator('h1').first().innerText()}`)
console.log(`cards on p.1 : ${await page.locator('main ul > li').count()}`)
console.log(`range text   : ${await page.getByText(/Hiển thị/).innerText()}`)
await page.screenshot({ path: '/tmp/results-all.png', fullPage: true })

// Sort by availability — books on the shelf must come first.
await page.getByLabel('Sắp xếp').selectOption('available')
await page.waitForTimeout(400)
const firstCard = await page.locator('main ul > li').first().innerText()
console.log(`first card after sort: ${firstCard.split('\n').slice(0, 2).join(' / ')}`)
await page.screenshot({ path: '/tmp/results-sorted.png', fullPage: true })

// Filter to journals only.
await page.getByRole('tab', { name: /Báo khoa học/ }).click()
await page.waitForTimeout(400)
console.log(`journal cards: ${await page.locator('main ul > li').count()}`)
await page.screenshot({ path: '/tmp/results-filtered.png', fullPage: true })

await browser.close()
