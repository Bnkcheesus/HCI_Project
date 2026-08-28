/**
 * Renders design/palettes.html from scripts/palettes.data.mjs.
 *
 * Generated rather than hand-written so the swatches, the measured ratios and the CSS
 * block a reader copies into index.css cannot drift apart from each other. Edit the data
 * file, re-run this, never edit the HTML.
 *
 *   node scripts/build-palette-page.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { PALETTES } from './palettes.data.mjs'
import { ratio } from './contrast.mjs'

const OUT = new URL('../design/palettes.html', import.meta.url)

/** The token names index.css uses, paired with the key in the palette data. */
const TOKEN_MAP = [
  ['--page', 'page', 'nền trang'],
  ['--chrome', 'chrome', 'header / footer / bàn phím'],
  ['--chrome-deep', 'chromeDeep', 'chrome khi nhấn'],
  ['--ink', 'ink', 'chữ chính'],
  ['--ink-soft', 'inkSoft', 'chữ phụ'],
  ['--ink-faint', 'inkFaint', 'placeholder'],
  ['--rule', 'rule', 'đường kẻ'],
  ['--rule-soft', 'ruleSoft', 'kẻ mờ nhất'],
  ['--navy-deep', 'navyDeep', 'nút chính khi hover'],
  ['--navy', 'navy', 'nút chính'],
  ['--navy-soft', 'navySoft', 'hàng được chọn'],
  ['--live', 'live', 'còn sách'],
  ['--live-ink', 'liveInk', 'chữ "còn sách"'],
  ['--sunken', 'sunken', 'viền ô nhập'],
  ['--spine-1', 'spine1', 'gáy sách 1'],
  ['--spine-2', 'spine2', 'gáy sách 2'],
  ['--spine-3', 'spine3', 'gáy sách 3'],
  ['--spine-4', 'spine4', 'gáy sách 4'],
  ['--destructive', 'destructive', 'quá hạn / lỗi'],
]

function cssBlock(p) {
  const rows = TOKEN_MAP.map(([token, key, role]) => {
    const pad = ' '.repeat(Math.max(1, 15 - token.length))
    return `  ${token}:${pad}${p[key]};${' '.repeat(Math.max(1, 8 - p[key].length))}/* ${role} */`
  })
  return [':root {', ...rows, '', '  /* các token dẫn xuất giữ nguyên như index.css hiện tại */', '  --primary: var(--navy);', '  --destructive: ' + p.destructive + ';', '}'].join('\n')
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * A miniature of the screens that actually exist, not abstract swatches. Colour decisions
 * only become real next to each other: the chip beside the button beside the overdue word
 * is where a palette either separates its three meanings or does not.
 */
function preview(p) {
  return `
  <div class="prev" style="background:${p.page}">
    <div class="prev-bar" style="background:${p.chrome};border-color:${p.rule}">
      <span class="prev-logo" style="background:${p.navy}"></span>
      <span style="color:${p.ink};font-weight:800">LibAssist</span>
      <span style="margin-left:auto;color:${p.inkSoft};font-size:12px">Kiosk số 04</span>
    </div>

    <div class="prev-body">
      <div class="prev-card" style="border-color:${p.rule}">
        <div class="prev-cover" style="background:${p.chromeDeep}">
          <span class="prev-spine" style="background:${p.spine1}"></span>
          <span class="prev-chip" style="background:${p.live}">Còn 3 cuốn</span>
        </div>
        <div class="prev-meta">
          <div style="color:${p.ink};font-weight:600">Introduction to Algorithms</div>
          <div style="color:${p.inkSoft};font-size:12px">Cormen, Leiserson, Rivest</div>
          <div style="color:${p.liveInk};font-size:12px;font-weight:600">Kệ A3 · Tầng 2</div>
        </div>
      </div>

      <div class="prev-side">
        <input class="prev-field" style="border-color:${p.sunken};color:${p.ink}"
               value="Tìm sách, tác giả…" readonly>
        <button class="prev-btn" style="background:${p.navy}">Mượn sách</button>
        <div class="prev-row" style="background:${p.navySoft}">Hàng đang chọn</div>
        <div class="prev-status">
          <span style="color:${p.liveInk};font-weight:600">Đã trả</span>
          <span style="color:${p.navy};font-weight:600">Đang mượn</span>
          <span style="color:${p.destructive};font-weight:600">Quá hạn</span>
        </div>
        <div class="prev-spines">
          ${[1, 2, 3, 4].map((i) => `<span style="background:${p[`spine${i}`]}"></span>`).join('')}
        </div>
      </div>
    </div>
  </div>`
}

function swatches(p) {
  return TOKEN_MAP.map(
    ([token, key, role]) => `
      <div class="sw">
        <span class="sw-chip" style="background:${p[key]}"></span>
        <span class="sw-token">${token}</span>
        <span class="sw-hex">${p[key]}</span>
        <span class="sw-role">${role}</span>
      </div>`,
  ).join('')
}

/** The pairings a reader is most likely to want to sanity-check by eye. */
function ratios(p) {
  const rows = [
    ['chữ chính trên nền', ratio(p.ink, p.page)],
    ['chữ phụ trên nền', ratio(p.inkSoft, p.page)],
    ['placeholder trên chrome', ratio(p.inkFaint, p.chrome)],
    ['chữ trắng trên nút chính', ratio('#ffffff', p.navy)],
    ['chữ trắng trên chip còn sách', ratio('#ffffff', p.live)],
    ['chữ quá hạn trên thẻ trắng', ratio(p.destructive, '#ffffff')],
    ['viền ô nhập trên thẻ trắng', ratio(p.sunken, '#ffffff')],
  ]
  return rows
    .map(([what, r]) => {
      const min = what.startsWith('viền') ? 3 : 4.5
      const ok = r >= min
      return `<tr class="${ok ? '' : 'bad'}"><td>${what}</td><td>${r.toFixed(2)}:1</td><td>${ok ? '✓' : '✗ cần ' + min}</td></tr>`
    })
    .join('')
}

const sections = Object.entries(PALETTES)
  .map(
    ([key, p]) => `
<section class="palette" id="${key}">
  <header class="p-head">
    <h2>${p.label}</h2>
    <code>${key}</code>
  </header>
  <p class="note">${p.note}</p>

  ${preview(p)}

  <div class="cols">
    <div>
      <h3>Token</h3>
      <div class="swatches">${swatches(p)}</div>
    </div>
    <div>
      <h3>Tương phản đo được</h3>
      <table class="ratios"><tbody>${ratios(p)}</tbody></table>

      <h3>Dán vào <code>src/index.css</code></h3>
      <pre>${esc(cssBlock(p))}</pre>
    </div>
  </div>
</section>`,
  )
  .join('\n')

const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LibAssist — chọn bảng màu</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 40px 32px 80px;
    font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    background: #ffffff; color: #15161a;
  }
  h1 { font-size: 30px; margin: 0 0 6px; letter-spacing: -0.02em; }
  .lede { max-width: 74ch; color: #55565e; margin: 0 0 8px; }
  .toc { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0 40px; }
  .toc a { padding: 7px 13px; border: 1px solid #e0e0dc; border-radius: 6px;
           text-decoration: none; color: #15161a; font-weight: 600; font-size: 14px; }
  .palette { border-top: 2px solid #15161a; padding-top: 20px; margin-top: 48px; }
  .p-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  h2 { font-size: 21px; margin: 0; letter-spacing: -0.01em; }
  h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em;
       color: #6e6f77; margin: 24px 0 10px; }
  code { font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
         background: #f2f2ef; padding: 2px 6px; border-radius: 4px; }
  .note { max-width: 74ch; color: #55565e; margin: 8px 0 20px; }

  /* Mini-mockup */
  .prev { border: 1px solid #d9d9d4; border-radius: 10px; overflow: hidden; }
  .prev-bar { display: flex; align-items: center; gap: 10px;
              padding: 11px 14px; border-bottom: 1px solid; font-size: 14px; }
  .prev-logo { width: 24px; height: 24px; border-radius: 5px; display: inline-block; }
  .prev-body { display: grid; grid-template-columns: 210px 1fr; gap: 16px; padding: 18px; }
  .prev-card { background: #fff; border: 1px solid; border-radius: 8px; overflow: hidden; }
  .prev-cover { position: relative; aspect-ratio: 16/9; }
  .prev-spine { position: absolute; inset: 0 auto 0 0; width: 6px; }
  .prev-chip { position: absolute; right: 8px; top: 8px; color: #fff;
               font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 5px; }
  .prev-meta { padding: 10px 12px; display: grid; gap: 3px; }
  .prev-side { display: grid; gap: 10px; align-content: start; }
  .prev-field { border: 1px solid; border-radius: 6px; padding: 10px 12px;
                background: #fff; font: inherit; font-size: 14px; width: 100%; }
  .prev-btn { border: 0; border-radius: 6px; color: #fff; font: inherit;
              font-weight: 700; padding: 11px 18px; justify-self: start; }
  .prev-row { color: #fff; font-size: 13px; font-weight: 600;
              padding: 8px 12px; border-radius: 6px; }
  .prev-status { display: flex; gap: 18px; font-size: 13px; }
  .prev-spines { display: flex; gap: 6px; }
  .prev-spines span { width: 34px; height: 14px; border-radius: 3px; }

  .cols { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr);
          gap: 32px; margin-top: 4px; }
  @media (max-width: 900px) { .cols, .prev-body { grid-template-columns: 1fr; } }

  .swatches { display: grid; gap: 3px; }
  .sw { display: grid; grid-template-columns: 22px 108px 74px 1fr;
        align-items: center; gap: 10px; font-size: 13px; }
  .sw-chip { width: 22px; height: 22px; border-radius: 4px; border: 1px solid #00000018; }
  .sw-token { font: 12px ui-monospace, Menlo, monospace; }
  .sw-hex { font: 12px ui-monospace, Menlo, monospace; color: #55565e; }
  .sw-role { color: #6e6f77; }

  .ratios { border-collapse: collapse; width: 100%; font-size: 13px; }
  .ratios td { padding: 6px 8px; border-bottom: 1px solid #eeeeea; }
  .ratios td:nth-child(2) { font: 12px ui-monospace, Menlo, monospace; text-align: right; }
  .ratios td:nth-child(3) { width: 90px; color: #0f6b45; font-weight: 600; }
  .ratios tr.bad td:nth-child(3) { color: #a2372a; }

  pre { background: #f6f6f3; border: 1px solid #e4e4df; border-radius: 8px;
        padding: 14px; overflow-x: auto;
        font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>
</head>
<body>

<h1>Chọn bảng màu cho LibAssist</h1>
<p class="lede">
  Bốn ứng viên, cộng bảng đang chạy để đối chiếu. Mỗi bảng giữ nguyên <em>cấu trúc</em> của
  bảng hiện tại — nền gần trung tính ba bậc, màu chỉ xuất hiện ở ba chỗ có nghĩa (hành động,
  tín hiệu còn sách, lời từ chối) — và chỉ thay tông. Đổi bảng màu là đổi cảm giác, không
  đổi ngữ nghĩa.
</p>
<p class="lede">
  Mọi cặp màu đều đã đo bằng <code>scripts/check-palette.mjs</code> theo ngưỡng WCAG AA cho
  <strong>chữ thường</strong> (4.5:1) — không dùng ngưỡng chữ lớn, vì persona thị lực kém.
  Viền ô nhập đo theo WCAG 1.4.11 (3:1). Trang này được sinh ra từ
  <code>scripts/palettes.data.mjs</code>; sửa file đó rồi chạy lại
  <code>node scripts/build-palette-page.mjs</code>, đừng sửa trực tiếp HTML.
</p>
<p class="lede">
  Chọn xong, nói tên bảng (<code>cham</code>, <code>thanChi</code>, <code>datNung</code>,
  <code>timTram</code>) — phần chế độ trợ năng trong <code>tokens.css</code> cũng cần chỉnh
  theo, khối CSS bên dưới mới chỉ là phần <code>:root</code>.
</p>

<nav class="toc">
${Object.entries(PALETTES)
  .map(([key, p]) => `  <a href="#${key}">${p.label}</a>`)
  .join('\n')}
</nav>

${sections}

</body>
</html>
`

mkdirSync(new URL('../design/', import.meta.url), { recursive: true })
writeFileSync(OUT, html)
console.log(`Đã ghi ${OUT.pathname} — ${Object.keys(PALETTES).length} bảng màu.`)
