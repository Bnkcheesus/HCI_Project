// Layout checks for the /mobile/* surface at real phone sizes.
//
// jsdom lays nothing out, so the whole class of bug this guards against — horizontal
// overflow, a touch target under the 48px floor, a11y-mode contrast — is invisible to
// `npm run test` and can only be seen in a browser.
import { chromium } from 'playwright'

// :5173, the port `npm run dev` serves — the same one check-chrome.mjs uses. This script
// used to point at :5175, from when the kiosk and the phone were browsed from two dev
// servers at once; there is one now, and it proxies /api to the backend.

const PHONES = [
  ['iPhone SE', 375, 667],
  ['iPhone 14', 390, 844],
  ['Pixel 7', 412, 915],
  ['iPhone 14 Pro Max', 430, 932],
]

const ROUTES = ['/mobile', '/mobile/qr', '/mobile/location?book=cormen-algorithms', '/mobile/phieu-muon']

const browser = await chromium.launch()
let failures = 0

for (const [name, width, height] of PHONES) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })

  for (const route of ROUTES) {
    await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(350)

    const r = await page.evaluate(() => {
      const de = document.documentElement
      const wide = [...document.querySelectorAll('body *')]
        .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
        .slice(0, 3)
        .map((el) => `${el.tagName}.${el.className.toString().split(' ')[0]}`)

      // Every control the thumb has to hit. 48px is --touch-min, the project's floor.
      const small = [...document.querySelectorAll('button, a[href]')]
        .map((el) => ({ el, box: el.getBoundingClientRect() }))
        .filter(({ box }) => box.height > 0 && box.height < 47.5)
        .map(({ el, box }) => `${(el.textContent || el.ariaLabel || '?').trim().slice(0, 22)}=${Math.round(box.height)}px`)

      // The way back is chrome, not content: it has to be on screen before the reader
      // scrolls, however many slips the list holds.
      const back = [...document.querySelectorAll('button')].find((b) =>
        /Quay về/.test(b.textContent || ''),
      )
      const backOffscreen = back ? back.getBoundingClientRect().bottom > innerHeight + 1 : false

      // Every "go here" chevron on a screen belongs to one vertical line. They live in
      // separate cards with their own padding, so nothing enforces that but arithmetic —
      // and a card that pads differently from its neighbour breaks the line silently.
      const chevrons = [...document.querySelectorAll('main svg.lucide-chevron-right')].map(
        (s) => Math.round(s.getBoundingClientRect().right),
      )
      const chevronSpread = chevrons.length > 1 ? Math.max(...chevrons) - Math.min(...chevrons) : 0

      // The HTML rendering spec gives <button> `align-items: flex-start`; WebKit applies
      // it and Chromium does not. In a flex column that shrink-wraps every row to its text,
      // so the chip and the chevron walk in from the right edge. Chromium cannot show that,
      // which is the point: the declaration is checked, not the rendering.
      const unnamed = [...document.querySelectorAll('button')].filter((b) => {
        const cs = getComputedStyle(b)
        return (
          cs.display.includes('flex') &&
          cs.flexDirection.startsWith('column') &&
          cs.alignItems === 'normal'
        )
      }).length

      // A screen whose whole job is one action must not hide that action below the fold.
      // The QR screen did exactly that on a 667px phone: an empty scanner window filled
      // the view and "Mở chỉ dẫn" sat underneath it, unseen.
      //
      // Measured against the scrolling <main>, not against innerHeight. The pinned footer
      // occupies the bottom of the viewport, so a button clipped by the scroll region's
      // own edge still sits "within" the window — the first version of this check passed
      // while the screenshot plainly showed the button cut in half.
      const main = document.querySelector('main')
      const submit = main?.querySelector('button[type="submit"]')
      const submitOffscreen = submit
        ? submit.getBoundingClientRect().bottom > main.getBoundingClientRect().bottom + 1
        : false

      return {
        overflowX: de.scrollWidth > de.clientWidth + 1,
        wide,
        small,
        backOffscreen,
        chevronSpread,
        unnamed,
        submitOffscreen,
      }
    })

    const ok =
      !r.overflowX &&
      r.small.length === 0 &&
      !r.backOffscreen &&
      r.chevronSpread <= 1 &&
      r.unnamed === 0 &&
      !r.submitOffscreen
    if (!ok) failures++
    console.log(
      `  ${name.padEnd(18)} ${route.padEnd(8)} overflow-x=${String(r.overflowX).padEnd(5)}` +
        ` touch<48px=${r.small.length} back-offscreen=${String(r.backOffscreen).padEnd(5)}` +
        ` chevron-lệch=${r.chevronSpread}px align-items-thiếu=${r.unnamed}` +
        ` submit-khuất=${String(r.submitOffscreen).padEnd(5)}` +
        `  ${ok ? 'ok' : 'BROKEN'}`,
    )
    if (r.wide.length) console.log(`      wide: ${r.wide.join(', ')}`)
    if (r.small.length) console.log(`      small: ${r.small.join(', ')}`)

    await page.screenshot({ path: `/tmp/mobile-${route.replaceAll('/', '_')}-${width}.png`, fullPage: true })
  }

  await page.close()
}

// Accessibility mode: the tokens flatten to black-on-white, and a control that paints a
// fill from one collapsed token and its glyph from another disappears entirely.
console.log('\n— chế độ trợ năng —')
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await page.goto('http://localhost:5173/mobile', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Chế độ trợ năng/ }).click()
  await page.waitForTimeout(400)

  const r = await page.evaluate(() => {
    const luminance = (rgb) => {
      const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((v) => {
        const c = Number(v) / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const bgOf = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg
      }
      return 'rgb(255,255,255)'
    }
    const worst = [...document.querySelectorAll('button, h1, p, span')]
      .filter((el) => el.textContent?.trim() && el.getBoundingClientRect().height > 0)
      .map((el) => {
        const cs = getComputedStyle(el)
        const a = luminance(cs.color)
        const b = luminance(bgOf(el))
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
        return { text: el.textContent.trim().slice(0, 26), ratio: Math.round(ratio * 100) / 100 }
      })
      .sort((x, y) => x.ratio - y.ratio)[0]

    return { html: document.documentElement.dataset.a11y, worst, overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }
  })

  // AA for body text is 4.5:1 — the threshold for *normal* text, not the looser large-text
  // one, because the persona's whole stated problem is small low-contrast type.
  const ok = r.html === 'true' && r.worst.ratio >= 4.5 && !r.overflowX
  if (!ok) failures++
  console.log(
    `  data-a11y=${r.html}  tương phản thấp nhất=${r.worst.ratio}:1 ("${r.worst.text}")` +
      `  overflow-x=${r.overflowX}  ${ok ? 'ok' : 'BROKEN'}`,
  )
  await page.screenshot({ path: '/tmp/mobile-a11y.png', fullPage: true })
  await page.close()
}

await browser.close()
console.log(failures === 0 ? '\nMobile layout ok.' : `\n${failures} kiểm tra BROKEN`)
process.exit(failures === 0 ? 0 : 1)
