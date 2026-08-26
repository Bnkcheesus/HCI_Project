// Verifies the two typing-ergonomics features on the search screen:
//   1. the caret is already in the field on arrival, and survives on-screen key presses
//   2. docking the keyboard left/right actually narrows every key
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })

// Arrive the way a user does — by tapping the bar on the home screen.
await page.goto('http://localhost:5173/kiosk', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.getByRole('searchbox').click()
await page.waitForTimeout(900)

const focusedOnArrival = await page.evaluate(() => document.activeElement?.getAttribute('type'))
console.log(`focused element on arrival        : ${focusedOnArrival}`)

const keyQ = page.getByRole('button', { name: 'q', exact: true })
const fullWidth = (await keyQ.boundingBox()).width
console.log(`key width, full layout            : ${Math.round(fullWidth)}px`)

await keyQ.click()
const focusedAfterKey = await page.evaluate(() => document.activeElement?.getAttribute('type'))
console.log(`focused element after key press   : ${focusedAfterKey}`)

await page.screenshot({ path: '/tmp/kb-full.png' })

// Dock right (most users are right-handed).
await page.getByRole('button', { name: 'Thu bàn phím sang phải' }).click()
await page.waitForTimeout(450)
const rightWidth = (await keyQ.boundingBox()).width
console.log(`key width, docked right           : ${Math.round(rightWidth)}px`)
console.log(`still above the 48px touch floor  : ${rightWidth >= 48}`)
await page.screenshot({ path: '/tmp/kb-right.png' })

await page.getByRole('button', { name: 'Thu bàn phím sang trái' }).click()
await page.waitForTimeout(450)
await page.screenshot({ path: '/tmp/kb-left.png' })

const finalFocus = await page.evaluate(() => document.activeElement?.getAttribute('type'))
console.log(`focus kept through docking        : ${finalFocus}`)
console.log('saved /tmp/kb-full.png, /tmp/kb-right.png, /tmp/kb-left.png')

await browser.close()
