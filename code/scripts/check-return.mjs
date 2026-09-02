/**
 * The borrow-and-return loop, in a real browser.
 *
 * Borrowing alone could only ever drive the copy count downwards, so a demo ran out of
 * stock and cards got stuck at the borrowing limit. `/admin` closes the loop. This walks
 * it end to end and asserts the number the reader actually sees on each screen — jsdom
 * builds no layout and the server suite never renders a chip, so neither can tell you the
 * kiosk is showing the count the database holds.
 *
 * Six steps, and two of them are the point:
 *   5. the phone moves the book from "Đang mượn" to "Đã trả" with no mobile code changed
 *   6. the kiosk's copy count comes back to where it started
 *
 * Requires `npm run dev` and a seeded database. Screenshots land in /tmp — open them.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:5173'
const BOOK = 'cormen-algorithms'
const CARD = '20215012'
const SHOTS = '/tmp'

const failures = []
function check(label, actual, expected) {
  const ok = actual === expected
  console.log(`${ok ? '✓' : '✗'} ${label}: ${actual}${ok ? '' : ` (kỳ vọng ${expected})`}`)
  if (!ok) failures.push(label)
}

/** The copy count as the kiosk book page renders it, read from the availability chip. */
async function copiesOnKiosk(page) {
  await page.goto(`${BASE}/kiosk/books/${BOOK}`, { waitUntil: 'networkidle' })
  const chip = await page.getByText(/Còn \d+ cuốn|Đã được mượn hết/).first().innerText()
  const match = chip.match(/Còn (\d+) cuốn/)
  return match ? Number(match[1]) : 0
}

/** Whether the phone lists the book under "Đang mượn" or under "Đã trả". */
async function sectionOnPhone(page) {
  await page.goto(`${BASE}/mobile/phieu-muon`, { waitUntil: 'networkidle' })
  for (const name of ['Đang mượn', 'Đã trả']) {
    const region = page.getByRole('region', { name: new RegExp(name) })
    if (await region.getByText('Introduction to Algorithms').first().isVisible().catch(() => false)) {
      return name
    }
  }
  return 'không thấy'
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

console.log('— 1. tồn kho ban đầu trên kiosk')
const start = await copiesOnKiosk(page)
console.log(`   ${start} cuốn`)

console.log('— 2. mượn qua API (luồng quét thẻ đã có check-chrome lo)')
const borrowed = await page.evaluate(
  async ([card, book]) => {
    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cardCode: card, bookIds: [book] }),
    })
    return { status: res.status, body: await res.json() }
  },
  [CARD, BOOK],
)
check('mượn thành công', borrowed.status, 201)

check('tồn kho giảm 1', await copiesOnKiosk(page), start - 1)
await page.screenshot({ path: `${SHOTS}/return-2-kiosk-borrowed.png` })

console.log('— 3. điện thoại thấy sách ở mục "Đang mượn"')
check('mục trên điện thoại', await sectionOnPhone(page), 'Đang mượn')
await page.screenshot({ path: `${SHOTS}/return-3-phone-out.png`, fullPage: true })

console.log('— 4. trả sách trên /admin')
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
await page.screenshot({ path: `${SHOTS}/return-4-admin-before.png`, fullPage: true })

const row = page.locator('li', { hasText: 'Introduction to Algorithms' })
await row.getByRole('button', { name: 'Trả sách' }).click()
await page.getByRole('status').waitFor()
const confirmation = await page.getByRole('status').innerText()
check(
  'thông báo nêu đúng tên sách',
  confirmation.includes('Introduction to Algorithms'),
  true,
)
await page.screenshot({ path: `${SHOTS}/return-5-admin-after.png`, fullPage: true })

console.log('— 5. điện thoại chuyển sách sang "Đã trả"')
check('mục trên điện thoại', await sectionOnPhone(page), 'Đã trả')
await page.screenshot({ path: `${SHOTS}/return-6-phone-back.png`, fullPage: true })

console.log('— 6. tồn kho trên kiosk trở lại')
check('tồn kho về mốc ban đầu', await copiesOnKiosk(page), start)
await page.screenshot({ path: `${SHOTS}/return-7-kiosk-restored.png` })

await browser.close()

console.log(
  failures.length === 0
    ? '\n✓ Vòng mượn–trả khép kín trên trình duyệt thật.'
    : `\n✗ ${failures.length} phép kiểm hỏng: ${failures.join(', ')}`,
)
process.exit(failures.length === 0 ? 0 : 1)
