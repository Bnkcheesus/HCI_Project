/**
 * WCAG relative luminance and contrast ratio, on #rrggbb strings.
 *
 * Its own module so importing it cannot drag along a script's top-level audit — the first
 * version of this lived in check-palette.mjs, and importing `ratio` from there ran the
 * whole audit and then called process.exit, killing the importer mid-run.
 */

export function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
