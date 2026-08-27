// Drives voice search end-to-end in a real browser.
//
// Headless Chromium has no microphone, and Chrome's recognizer is a cloud service, so a
// controllable SpeechRecognition is installed before the app boots. Everything else —
// routing, the mic button, the live field, the suggestions — is the real application.
import { chromium } from 'playwright'

const FAKE_SPEECH = () => {
  window.__speechStarts = 0
  class FakeSpeechRecognition {
    constructor() {
      window.__speech = this
    }
    start() {
      this.started = true
      window.__speechStarts++
    }
    stop() {
      this.started = false
      this.onend?.()
    }
    abort() {
      this.started = false
    }
    emitInterim(t) {
      this.onresult?.({
        resultIndex: 0,
        results: [Object.assign([{ transcript: t }], { isFinal: false })],
      })
    }
    emitFinal(t) {
      this.onresult?.({
        resultIndex: 0,
        results: [Object.assign([{ transcript: t }], { isFinal: true })],
      })
      this.onend?.()
    }
  }
  window.SpeechRecognition = FakeSpeechRecognition
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
await page.addInitScript(FAKE_SPEECH)

// 1. Home screen: the mic must hand off AND start listening.
await page.goto('http://localhost:5173/kiosk', { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(600)
await page.screenshot({ path: '/tmp/voice-1-home.png' })

await page.getByRole('button', { name: /giọng nói/ }).click()
await page.waitForTimeout(900)

console.log(`route after mic tap : ${new URL(page.url()).pathname}`)
console.log(`listening sessions  : ${await page.evaluate(() => window.__speechStarts)} (want 1)`)
console.log(`recognition language: ${await page.evaluate(() => window.__speech?.lang)}`)
console.log(`on-screen keyboard  : ${(await page.getByRole('group', { name: 'Bàn phím ảo' }).count()) > 0}`)
await page.screenshot({ path: '/tmp/voice-2-listening.png' })

// 2. Speak: a partial transcript previews in the field.
await page.evaluate(() => window.__speech.emitInterim('giải'))
await page.waitForTimeout(300)
console.log(`field while speaking: "${await page.getByRole('searchbox').inputValue()}"`)
await page.screenshot({ path: '/tmp/voice-3-interim.png' })

// 3. Finish: the transcript settles and the suggestions follow.
await page.evaluate(() => window.__speech.emitFinal('giải tích'))
await page.waitForTimeout(500)
console.log(`field after speaking: "${await page.getByRole('searchbox').inputValue()}"`)
console.log(`route (must stay put): ${new URL(page.url()).pathname}`)
console.log(`suggestions shown   : ${await page.locator('main li').count()}`)
await page.screenshot({ path: '/tmp/voice-4-result.png' })

// 4. Back to home, then forward again: the mic must not reopen by itself.
await page.getByRole('button', { name: 'Về trang chủ' }).click()
await page.waitForTimeout(700)
await page.getByRole('searchbox').click()
await page.waitForTimeout(700)
console.log(
  `sessions after re-entry: ${await page.evaluate(() => window.__speechStarts)} (want 1 — no extra)`,
)

await browser.close()
