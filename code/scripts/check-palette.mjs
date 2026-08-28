/**
 * Contrast audit for a candidate LibAssist palette.
 *
 * The persona has low vision, so every pairing the interface actually paints has to clear
 * WCAG AA for *normal* text — 4.5:1. The looser 3:1 large-text threshold is never used
 * here; it is only applied to pairings that are graphics rather than text (the spine
 * accents, which are a 6px stripe and an icon).
 *
 * Run: node scripts/check-palette.mjs [name]   (no name = every palette)
 *
 * This is arithmetic on the token values, not a browser check — it says a palette is
 * *legible*, never that a screen using it is laid out correctly. Run check-chrome.mjs and
 * check-mobile.mjs after adopting one.
 */
import { PALETTES } from './palettes.data.mjs'
import { ratio } from './contrast.mjs'

const AA_TEXT = 4.5
const AA_GRAPHIC = 3

/**
 * Every pairing the components actually paint. Derived by reading the source, not
 * imagined: `text-[var(--live-ink)]` on a white card is a real line in ResultCard, so
 * live-ink over #ffffff is a real requirement.
 */
function pairings(p) {
  const WHITE = '#ffffff'
  const on = (fg, bg, what, min = AA_TEXT) => ({ fg: p[fg], bg: p[bg] ?? bg, what, min })

  return [
    // Body text over the three grounds it can land on.
    on('ink', 'page', 'ink trên nền trang'),
    on('ink', 'chrome', 'ink trên chrome'),
    on('ink', WHITE, 'ink trên thẻ trắng'),
    on('inkSoft', 'page', 'ink-soft trên nền trang'),
    on('inkSoft', 'chrome', 'ink-soft trên chrome'),
    on('inkSoft', WHITE, 'ink-soft trên thẻ trắng'),
    on('inkFaint', 'page', 'ink-faint (placeholder) trên nền trang'),
    on('inkFaint', 'chrome', 'ink-faint trên chrome'),
    on('inkFaint', WHITE, 'ink-faint trên thẻ trắng'),

    // Filled controls: white glyph on a solid fill.
    { fg: WHITE, bg: p.navy, what: 'chữ trắng trên nút chính', min: AA_TEXT },
    { fg: WHITE, bg: p.navyDeep, what: 'chữ trắng trên nút chính (hover)', min: AA_TEXT },
    { fg: WHITE, bg: p.navySoft, what: 'chữ trắng trên hàng được chọn', min: AA_TEXT },
    { fg: WHITE, bg: p.live, what: 'chữ trắng trên chip còn sách', min: AA_TEXT },
    { fg: WHITE, bg: p.destructive, what: 'chữ trắng trên nền báo lỗi', min: AA_TEXT },

    // The same hues used as *text* — StatusText, the shelf line, error copy.
    on('liveInk', WHITE, 'chữ "còn sách" trên thẻ trắng'),
    on('liveInk', 'page', 'chữ "còn sách" trên nền trang'),
    on('navy', WHITE, 'chữ "đang mượn" trên thẻ trắng'),
    on('navy', 'page', 'chữ nhấn trên nền trang'),
    on('destructive', WHITE, 'chữ "quá hạn" trên thẻ trắng'),
    on('destructive', 'page', 'chữ báo lỗi trên nền trang'),

    // Structure. A hairline is not text, but it has to be seeable at all.
    on('rule', WHITE, 'đường kẻ trên thẻ trắng', 1.2),
    on('sunken', WHITE, 'viền ô nhập trên thẻ trắng', AA_GRAPHIC),

    // Spine accents: a 6px stripe and a document-type icon — graphics, not text.
    ...[1, 2, 3, 4].map((i) => ({
      fg: p[`spine${i}`],
      bg: WHITE,
      what: `gáy sách ${i} trên thẻ trắng`,
      min: AA_GRAPHIC,
    })),
  ]
}

/** The ground steps must be visible as separate surfaces without becoming stripes. */
function grounds(p) {
  return [
    { what: 'trang → chrome', r: ratio(p.page, p.chrome), lo: 1.02, hi: 1.35 },
    { what: 'thẻ trắng → trang', r: ratio('#ffffff', p.page), lo: 1.02, hi: 1.35 },
    { what: 'chrome → chrome-deep', r: ratio(p.chrome, p.chromeDeep), lo: 1.02, hi: 1.4 },
  ]
}

const only = process.argv[2]
let failures = 0

for (const [key, p] of Object.entries(PALETTES)) {
  if (only && key !== only) continue

  console.log(`\n=== ${key} — ${p.label} ===`)
  let worst = Infinity
  let bad = 0

  for (const { fg, bg, what, min } of pairings(p)) {
    const r = ratio(fg, bg)
    const ok = r >= min
    if (!ok) bad++
    if (min === AA_TEXT) worst = Math.min(worst, r)
    if (!ok) console.log(`  ✗ ${what.padEnd(38)} ${r.toFixed(2)}:1  (cần ${min})  ${fg} / ${bg}`)
  }

  for (const { what, r, lo, hi } of grounds(p)) {
    if (r < lo || r > hi) {
      bad++
      console.log(`  ✗ ${what.padEnd(38)} ${r.toFixed(2)}:1  (cần ${lo}–${hi})`)
    }
  }

  // `reference` palettes record what is already shipped, warts and all, so they report
  // their failures without failing the run — otherwise the only way to get a green check
  // would be to quietly edit the record of what is live.
  if (!p.reference) failures += bad
  console.log(
    bad === 0
      ? `  ✓ đạt AA toàn bộ — cặp chữ yếu nhất ${worst.toFixed(2)}:1`
      : `  ${bad} cặp KHÔNG đạt${p.reference ? ' (bảng đang chạy — lỗi có sẵn)' : ''}`,
  )
}

console.log(failures === 0 ? '\nMọi bảng màu đều đạt.' : `\n${failures} cặp cần sửa.`)
process.exit(failures === 0 ? 0 : 1)
