/**
 * The three promises the backend exists to keep, checked in a real browser.
 *
 *   node scripts/check-handoff.mjs      (with `npm run dev` already running)
 *
 * Each of these was either impossible or quietly false before there was a server, and
 * each is invisible to the unit suites: jsdom has one storage, one origin and no second
 * device, so "the phone can see what the kiosk did" cannot be asked there at all.
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const browser = await chromium.launch()
let failures = 0

function check(label, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  ${detail}` : ''}`)
  if (!ok) failures++
}

/** A borrowable book and its current copy count, straight from the API. */
async function stockOf(page, bookId) {
  return page.evaluate(async (id) => {
    const res = await fetch(`/api/availability?ids=${id}`)
    return (await res.json())[id]?.copiesAvailable ?? null
  }, bookId)
}

// ── 1. Borrowing moves the number a reader sees ──────────────────────────────
// Gain Creator 4. Before the backend the copy count was a constant in a module: the
// kiosk could print a receipt and the shelf chip beside it would not budge.
console.log('\n— tình trạng sách theo thời gian thực —')
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`${BASE}/kiosk`, { waitUntil: 'networkidle' })

  const bookId = 'cormen-algorithms'
  const before = await stockOf(page, bookId)

  await page.evaluate(async (id) => {
    await fetch('/api/loans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cardCode: '20215012', bookIds: [id] }),
    })
  }, bookId)

  const after = await stockOf(page, bookId)
  check('số bản còn giảm sau khi mượn', after === before - 1, `${before} → ${after}`)

  // And the chip on the detail screen agrees, rather than the API and the UI disagreeing.
  await page.goto(`${BASE}/kiosk/books/${bookId}`, { waitUntil: 'networkidle' })
  const chip = await page.getByText(/Còn \d+ cuốn|Đã mượn hết/).first().textContent()
  check('chip trên màn sách khớp con số mới', chip.includes(String(after)), `"${chip.trim()}"`)

  await page.close()
}

// ── 2. The slip crosses to another device ────────────────────────────────────
// Gain Creator 3. This is the one that could not work at all: the slip used to live in
// the kiosk browser's localStorage, so a real phone scanning a real kiosk found nothing.
console.log('\n— đồng bộ kiosk → điện thoại (khác trình duyệt) —')
{
  const kiosk = await browser.newContext()
  const kioskPage = await kiosk.newPage()
  await kioskPage.goto(`${BASE}/kiosk`, { waitUntil: 'networkidle' })

  // The book is chosen from what is actually on the shelf rather than named: a hardcoded
  // title can be out of stock by the time this runs — including because the check above
  // just borrowed the last copy — and the failure then looks like a sync bug.
  const borrowed = await kioskPage.evaluate(async () => {
    const { books } = await (await fetch('/api/books/borrowable?limit=5')).json()
    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cardCode: '20215012', bookIds: [books[0].id] }),
    })
    return { status: res.status, body: await res.json() }
  })

  check('kiosk lập được phiếu', borrowed.status === 201, JSON.stringify(borrowed.body).slice(0, 120))
  const slipId = borrowed.body.slip?.id

  // A separate context: its own cookie jar, its own localStorage, nothing shared.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const phonePage = await phone.newPage()

  const storage = await phone.storageState()
  check('điện thoại là phiên hoàn toàn mới', storage.origins.length === 0)

  await phonePage.goto(`${BASE}/mobile/phieu-muon`, { waitUntil: 'networkidle' })
  const shown = await phonePage.getByText(`Phiếu #${slipId}`).count()
  check('phiếu vừa lập hiện trên điện thoại', shown > 0, slipId)

  await kiosk.close()
  await phone.close()
}

// ── 3. The borrowing limit is the server's, not the screen's ─────────────────
// The kiosk used to count only the seeded history, so slips filed during a session did
// not count against the limit — a divergence the old code documented and accepted.
console.log('\n— giới hạn mượn do server quyết định —')
{
  const page = await browser.newPage()
  await page.goto(`${BASE}/kiosk`, { waitUntil: 'networkidle' })

  const result = await page.evaluate(async () => {
    const borrow = (bookIds) =>
      fetch('/api/loans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cardCode: '20215012', bookIds }),
      })

    // The card already has loans out from the checks above; keep borrowing single books
    // until the server says no, then report what it said.
    const candidates = (await (await fetch('/api/books/borrowable?limit=20')).json()).books
    for (const book of candidates) {
      const res = await borrow([book.id])
      if (res.status === 409) return await res.json()
    }
    return null
  })

  check('server từ chối khi quá giới hạn', result !== null)
  check(
    'lý do từ chối là giới hạn mượn',
    result?.failure?.blocks?.some((b) => b.code === 'limit') ?? false,
    result?.failure?.blocks?.find((b) => b.code === 'limit')?.message ?? '',
  )

  await page.close()
}

await browser.close()

console.log(
  failures === 0
    ? '\nCả ba lời hứa đều giữ được.\n'
    : `\n${failures} phép kiểm thất bại.\n`,
)
process.exit(failures === 0 ? 0 : 1)
