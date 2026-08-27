// Drives the AI librarian screen end-to-end in a real browser and checks the one thing
// jsdom cannot: that nothing overflows the 1280x900 kiosk panel.
import { chromium } from 'playwright'

const VIEWPORT = { width: 1280, height: 900 }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 })

async function overflow(label) {
  const doc = await page.evaluate(() => ({
    scrollH: document.documentElement.scrollHeight,
    scrollW: document.documentElement.scrollWidth,
  }))
  const vertical = doc.scrollH - VIEWPORT.height
  const horizontal = doc.scrollW - VIEWPORT.width
  const verdict = vertical <= 0 && horizontal <= 0 ? 'ok' : 'OVERFLOW'
  console.log(
    `${label.padEnd(22)} page ${doc.scrollW}x${doc.scrollH} (over: ${horizontal}w ${vertical}h) ${verdict}`,
  )
}

await page.goto('http://localhost:5173/kiosk/ai-chat', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(500)

// 1. Empty state — the promo, the starter chips, the keyboard and the side panel all
//    have to coexist inside 900px.
await overflow('empty state')
console.log(`starter chips        : ${await page.locator('main ul li button').count()}`)
await page.screenshot({ path: '/tmp/aichat-1-empty.png' })

// 2. Ask via a starter chip.
await page.getByRole('button', { name: 'Sách về trí tuệ nhân tạo còn trên kệ' }).click()
await page.waitForTimeout(250)
await page.screenshot({ path: '/tmp/aichat-2-thinking.png' })

await page.getByRole('log').getByText(/Mình tìm thấy/).waitFor({ timeout: 5000 })
await page.waitForTimeout(400)
await overflow('after answer')

const panel = page.getByRole('complementary')
console.log(`suggested book rows  : ${await panel.locator('li button').count()}`)
console.log(`shelf legend rows    : ${await panel.locator('ul li span').first().isVisible()}`)
await page.screenshot({ path: '/tmp/aichat-3-answer.png' })

// The side panel scrolls on its own; the back button must be reachable inside it.
const backBox = await page.getByRole('button', { name: /^Quay về$/ }).boundingBox()
console.log(
  `back button in viewport: ${backBox && backBox.y + backBox.height <= VIEWPORT.height} (bottom ${backBox ? Math.round(backBox.y + backBox.height) : '?'})`,
)

// 3. A long conversation must scroll the transcript, not the page.
for (const q of ['sách vật lý', 'thư viện mở cửa mấy giờ', 'làm sao gia hạn thẻ']) {
  await page.getByLabel('Câu hỏi cho trợ lý LibAssist').fill(q)
  await page.getByRole('button', { name: 'Gửi câu hỏi' }).click()
  await page.waitForTimeout(900)
}
await overflow('after 4 turns')

const scrolled = await page.evaluate(() => {
  const log = document.querySelector('[role="log"]')
  return log ? { scrollTop: Math.round(log.scrollTop), scrollH: log.scrollHeight, h: log.clientHeight } : null
})
console.log(
  `transcript scrolled  : top=${scrolled.scrollTop} of ${scrolled.scrollH - scrolled.h} (auto-scrolled to newest: ${scrolled.scrollTop >= scrolled.scrollH - scrolled.h - 4})`,
)
await page.screenshot({ path: '/tmp/aichat-4-long.png' })

// 4. Accessibility mode blows every font size up 25% — the usual overflow trigger.
await page.getByRole('button', { name: /Trợ năng/ }).click()
await page.waitForTimeout(600)
await overflow('a11y mode')

// Scaling every bubble up 25% must not push the newest answer back out of view.
const a11yScroll = await page.evaluate(() => {
  const log = document.querySelector('[role="log"]')
  return { top: Math.round(log.scrollTop), max: log.scrollHeight - log.clientHeight }
})
console.log(
  `a11y still at newest : ${a11yScroll.top >= a11yScroll.max - 4} (top=${a11yScroll.top}/${a11yScroll.max})`,
)

/**
 * Accessibility mode collapses --rule and --foreground to the same black, which used to
 * paint the Shift/Backspace/123 keys black-on-black — invisible to exactly the reader
 * the mode exists for. Only a real browser resolves the CSS variables, so it is checked
 * here rather than in a jsdom test.
 */
const keyContrast = await page.evaluate(() => {
  const key = [...document.querySelectorAll('button')].find(
    (b) => b.getAttribute('aria-label') === 'Phím Shift',
  )
  if (!key) return null
  const s = getComputedStyle(key)
  return { bg: s.backgroundColor, fg: s.color }
})
console.log(
  `a11y shift key       : bg=${keyContrast.bg} fg=${keyContrast.fg} ${
    keyContrast.bg !== keyContrast.fg ? 'ok' : 'INVISIBLE'
  }`,
)

await page.screenshot({ path: '/tmp/aichat-5-a11y.png' })

await browser.close()
