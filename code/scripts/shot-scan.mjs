// Drives the whole self-checkout in a real browser: instruction -> scan books ->
// scan card -> receipt, checking at every stop that nothing overflows the kiosk panel.
import { chromium } from 'playwright'

const VIEWPORT = { width: 1280, height: 900 }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 })

async function overflow(label) {
  const doc = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight,
    w: document.documentElement.scrollWidth,
  }))
  const over = [doc.w - VIEWPORT.width, doc.h - VIEWPORT.height]
  console.log(
    `${label.padEnd(26)} ${doc.w}x${doc.h} (over ${over[0]}w ${over[1]}h) ${
      over[0] <= 0 && over[1] <= 0 ? 'ok' : 'OVERFLOW'
    }`,
  )
}

/** Every interactive control must sit inside the screen — a kiosk cannot be scrolled to. */
async function ctaVisible(name) {
  const box = await page.getByRole('button', { name }).first().boundingBox()
  const inside = box && box.y >= 0 && box.y + box.height <= VIEWPORT.height
  console.log(`  cta "${name}"`.padEnd(28) + ` bottom=${box ? Math.round(box.y + box.height) : '?'} ${inside ? 'ok' : 'OFF-SCREEN'}`)
}

async function enterCode(code) {
  await page.getByLabel(/Nhập mã/).fill(code)
  await page.getByRole('group', { name: 'Bàn phím số' }).getByRole('button', { name: 'OK' }).click()
  await page.waitForTimeout(250)
}

// 1. Instruction
await page.goto('http://localhost:5173/kiosk/scan', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(500)
await overflow('instruction')
await ctaVisible(/Bắt đầu quy trình/)
await page.screenshot({ path: '/tmp/scan-1-instruction.png' })

// 2. Step 1 — scan three books via the simulated scanner.
await page.getByRole('button', { name: /Bắt đầu quy trình/ }).click()
await page.waitForTimeout(400)
await overflow('step 1 empty')

for (let i = 0; i < 3; i++) {
  await page.getByRole('button', { name: /Mô phỏng quét một cuốn/ }).click()
  await page.waitForTimeout(250)
}
await overflow('step 1 with 3 books')
console.log(`  cart rows                  ${await page.locator('section ul li').count()}`)
await ctaVisible(/Tiếp tục/)
await page.screenshot({ path: '/tmp/scan-2-step1.png' })

// A full cart must scroll inside its own box rather than being clipped.
for (let i = 0; i < 2; i++) {
  await page.getByRole('button', { name: /Mô phỏng quét một cuốn/ }).click()
  await page.waitForTimeout(250)
}
await overflow('step 1 with 5 books')
const cartScroll = await page.evaluate(() => {
  const list = [...document.querySelectorAll('ul')].find((u) => u.querySelector('img, span[style*="spine"]'))
  if (!list) return null
  list.scrollTop = list.scrollHeight
  return {
    rows: list.children.length,
    scrollable: list.scrollHeight > list.clientHeight + 2,
    reachedEnd: Math.abs(list.scrollTop + list.clientHeight - list.scrollHeight) < 3,
    lastRowVisible: (() => {
      const last = list.lastElementChild.getBoundingClientRect()
      const box = list.getBoundingClientRect()
      return last.bottom <= box.bottom + 2 && last.top >= box.top - 2
    })(),
  }
})
console.log(`  cart rows / scrollable     ${cartScroll.rows} / ${cartScroll.scrollable}`)
console.log(`  scrolled to last book      ${cartScroll.reachedEnd && cartScroll.lastRowVisible}`)
await page.screenshot({ path: '/tmp/scan-2b-step1-full.png' })

// Five in the cart plus the persona's one open loan is over the limit, which is exactly
// what step 2 should refuse — drop one so the rest of the walkthrough can complete.
await page.locator('button[aria-label^="Bỏ "]').first().click()
await page.waitForTimeout(250)

// The failure state from Figma 39:82.
await enterCode('0000000000000')
const alertText = await page.getByRole('alert').first().innerText()
console.log(`  invalid-code alert         ${JSON.stringify(alertText.slice(0, 40))}`)
await overflow('step 1 error shown')
await page.screenshot({ path: '/tmp/scan-3-step1-error.png' })

// 3. Step 2 — a blocked card first, then a good one.
await page.getByLabel(/Nhập mã/).fill('')
await page.getByRole('button', { name: /Tiếp tục/ }).click()
await page.waitForTimeout(400)
await overflow('step 2 empty')

await enterCode('20218888') // overdue books
await overflow('step 2 blocked card')
console.log(
  `  blocked confirm disabled   ${await page.getByRole('button', { name: /Xác nhận mượn/ }).isDisabled()}`,
)
await page.screenshot({ path: '/tmp/scan-4-step2-blocked.png' })

await page.getByRole('button', { name: 'Dùng thẻ khác' }).click()
await page.waitForTimeout(300)
await enterCode('20215012') // the persona's card
await overflow('step 2 valid card')
await ctaVisible(/Xác nhận mượn/)
await page.screenshot({ path: '/tmp/scan-5-step2-ok.png' })

// 4. Receipt
await page.getByRole('button', { name: /Xác nhận mượn/ }).click()
await page.waitForTimeout(700)
await overflow('receipt')
console.log(`  slip books listed          ${await page.locator('section[aria-label="Phiếu mượn sách"] ol li').count()}`)
console.log(
  `  slip synced to app         ${await page.getByText(/Đã lưu vào ứng dụng LibAssist/).count() > 0}`,
)
console.log(
  `  nothing to scan            ${(await page.getByText(/Quét/).count()) === 0}`,
)
await ctaVisible(/Quay về trang chủ/)
await page.screenshot({ path: '/tmp/scan-6-receipt.png' })

// 5. Accessibility mode on the densest screen.
await page.goto('http://localhost:5173/kiosk/scan/step-1', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
for (let i = 0; i < 3; i++) {
  await page.getByRole('button', { name: /Mô phỏng quét một cuốn/ }).click()
  await page.waitForTimeout(200)
}
await page.getByRole('button', { name: /Trợ năng/ }).click()
await page.waitForTimeout(600)
await overflow('step 1 a11y + 3 books')
await ctaVisible(/Tiếp tục/)
await page.screenshot({ path: '/tmp/scan-7-a11y.png' })

await browser.close()
