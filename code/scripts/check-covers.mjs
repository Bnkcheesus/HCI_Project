// Verifies the real cover art actually renders: every <img> the kiosk paints must have
// decoded (naturalWidth > 0), and the ones that came from Open Library must not be the
// tiny placeholder the API serves when it has no art for an id.
//
//   npm run dev &   then   node scripts/check-covers.mjs
import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'

const catalog = JSON.parse(await readFile(new URL('./catalog-resolved.json', import.meta.url)))
const withCover = catalog.filter((r) => r.coverUrl)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })

const screens = [
  ['/kiosk', 'home'],
  ['/kiosk/search/results', 'results'],
  ['/kiosk/books/cormen-algorithms', 'book-info'],
]

let broken = 0
for (const [path, name] of screens) {
  // The results screen reads its query from the session store, so drive it through search.
  if (name === 'results') {
    await page.goto('http://localhost:5173/kiosk/search', { waitUntil: 'networkidle' })
    for (const key of ['m', 'a', 'c', 'h']) {
      await page.getByRole('button', { name: key, exact: true }).click()
    }
    await page.getByRole('button', { name: 'Tìm kiếm' }).click()
  } else {
    await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle' })
  }
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(600)

  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll('img')].map((img) => ({
      src: new URL(img.src).pathname,
      w: img.naturalWidth,
      h: img.naturalHeight,
    })),
  )
  const bad = imgs.filter((i) => i.w === 0 || (i.src.startsWith('/covers/') && i.w < 100))
  broken += bad.length

  console.log(`${name.padEnd(10)} ${imgs.length} images, ${bad.length} broken`)
  for (const b of bad) console.log(`   BROKEN ${b.src} ${b.w}x${b.h}`)

  await page.screenshot({ path: `/tmp/covers-${name}.png`, fullPage: true })
}

// Spot-check every downloaded cover over HTTP, not just the handful the screens show.
let missing = 0
for (const r of withCover) {
  const res = await page.request.get(`http://localhost:5173${r.coverUrl}`)
  if (!res.ok()) {
    missing++
    console.log(`   MISSING ${r.coverUrl} (${res.status()})`)
  }
}
console.log(`\n${withCover.length} cover files served, ${missing} missing, ${broken} broken on screen`)

await browser.close()
process.exit(missing + broken === 0 ? 0 : 1)
