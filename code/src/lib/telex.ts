/**
 * Telex input engine for the kiosk's on-screen QWERTY keyboard.
 *
 * The keyboard has no diacritic keys, so Vietnamese is typed the way people already
 * type it on a phone or PC: "sachs"/"sasch" -> "sách", "dduongf" -> "đường".
 *
 * Tone keys: s = sắc, f = huyền, r = hỏi, x = ngã, j = nặng.
 * Letter keys: aa=â, aw=ă, ee=ê, oo=ô, ow=ơ, uw=ư, uow=ươ, dd=đ.
 * Typing the same modifier twice undoes it and leaves the literal letters ("aa" -> â,
 * "aaa" -> "aa"), which is how every mainstream Telex implementation behaves.
 */

const VOWEL_TABLE: Record<string, string[]> = {
  // [no tone, huyền, sắc, hỏi, ngã, nặng]
  a: ['a', 'à', 'á', 'ả', 'ã', 'ạ'],
  ă: ['ă', 'ằ', 'ắ', 'ẳ', 'ẵ', 'ặ'],
  â: ['â', 'ầ', 'ấ', 'ẩ', 'ẫ', 'ậ'],
  e: ['e', 'è', 'é', 'ẻ', 'ẽ', 'ẹ'],
  ê: ['ê', 'ề', 'ế', 'ể', 'ễ', 'ệ'],
  i: ['i', 'ì', 'í', 'ỉ', 'ĩ', 'ị'],
  o: ['o', 'ò', 'ó', 'ỏ', 'õ', 'ọ'],
  ô: ['ô', 'ồ', 'ố', 'ổ', 'ỗ', 'ộ'],
  ơ: ['ơ', 'ờ', 'ớ', 'ở', 'ỡ', 'ợ'],
  u: ['u', 'ù', 'ú', 'ủ', 'ũ', 'ụ'],
  ư: ['ư', 'ừ', 'ứ', 'ử', 'ữ', 'ự'],
  y: ['y', 'ỳ', 'ý', 'ỷ', 'ỹ', 'ỵ'],
}

const TONE_KEYS: Record<string, number> = { f: 1, s: 2, r: 3, x: 4, j: 5 }

/** Vowels that already carry a hat/horn/breve — the tone always lands on these. */
const PRIORITY_BASES = new Set(['â', 'ă', 'ê', 'ô', 'ơ', 'ư'])

interface Decomposed {
  base: string
  tone: number
}

const DECOMPOSE = new Map<string, Decomposed>()
for (const [base, forms] of Object.entries(VOWEL_TABLE)) {
  forms.forEach((ch, tone) => DECOMPOSE.set(ch, { base, tone }))
}

function decompose(ch: string): Decomposed | null {
  return DECOMPOSE.get(ch.toLowerCase()) ?? null
}

function compose(base: string, tone: number, upper: boolean): string {
  const ch = VOWEL_TABLE[base][tone]
  return upper ? ch.toUpperCase() : ch
}

function isUpper(ch: string): boolean {
  return ch !== ch.toLowerCase()
}

/** Indices of every vowel character in the word. */
function vowelIndices(word: string): number[] {
  const out: number[] = []
  for (let i = 0; i < word.length; i++) {
    if (decompose(word[i])) out.push(i)
  }
  return out
}

/**
 * Which vowel of the syllable carries the tone mark.
 * Follows the standard "modern" placement rules; good enough for search input.
 */
function tonePosition(word: string): number | null {
  const vowels = vowelIndices(word)
  if (vowels.length === 0) return null

  // A vowel that already has a hat/horn wins outright ("ươ" -> ơ, "uyê" -> ê).
  const priority = vowels.filter((i) => PRIORITY_BASES.has(decompose(word[i])!.base))
  if (priority.length > 0) return priority[priority.length - 1]

  // Drop the glide in "qu…" / "gi…" — that u/i belongs to the onset, not the nucleus.
  let cluster = vowels
  const lower = word.toLowerCase()
  if (cluster.length > 1) {
    const first = cluster[0]
    const startsQu = first > 0 && lower[first - 1] === 'q' && lower[first] === 'u'
    const startsGi = first > 0 && lower[first - 1] === 'g' && lower[first] === 'i'
    if (startsQu || startsGi) cluster = cluster.slice(1)
  }
  if (cluster.length === 0) return vowels[vowels.length - 1]
  if (cluster.length === 1) return cluster[0]

  // Closed syllable (a final consonant follows) -> last vowel; open -> first.
  const lastVowel = cluster[cluster.length - 1]
  const hasFinalConsonant = lastVowel < word.length - 1
  return hasFinalConsonant ? lastVowel : cluster[0]
}

function currentTone(word: string): { index: number; tone: number } | null {
  for (const i of vowelIndices(word)) {
    const d = decompose(word[i])!
    if (d.tone !== 0) return { index: i, tone: d.tone }
  }
  return null
}

function setCharAt(word: string, index: number, ch: string): string {
  return word.slice(0, index) + ch + word.slice(index + 1)
}

function stripTone(word: string): string {
  const existing = currentTone(word)
  if (!existing) return word
  const d = decompose(word[existing.index])!
  return setCharAt(word, existing.index, compose(d.base, 0, isUpper(word[existing.index])))
}

/** Apply a tone key. Returns null when the key should be typed literally instead. */
function applyTone(word: string, key: string): string | null {
  const tone = TONE_KEYS[key.toLowerCase()]
  const existing = currentTone(word)

  // Same tone twice = undo, and the key falls through as a plain letter.
  if (existing && existing.tone === tone) {
    return stripTone(word) + key
  }

  const bare = stripTone(word)
  const pos = tonePosition(bare)
  if (pos === null) return null

  const d = decompose(bare[pos])!
  return setCharAt(bare, pos, compose(d.base, tone, isUpper(bare[pos])))
}

/** Apply a letter modifier (aa/aw/ee/oo/ow/uw/uow/dd). Null = type it literally. */
function applyLetterModifier(word: string, key: string): string | null {
  if (word.length === 0) return null
  const k = key.toLowerCase()
  const lastIndex = word.length - 1
  const last = word[lastIndex]
  const upper = isUpper(last)

  if (k === 'd') {
    if (last.toLowerCase() === 'd') return setCharAt(word, lastIndex, upper ? 'Đ' : 'đ')
    if (last.toLowerCase() === 'đ') return setCharAt(word, lastIndex, upper ? 'D' : 'd') + key
    return null
  }

  const d = decompose(last)
  if (!d) return null

  if (k === 'w') {
    // "uo" + w -> "ươ" (dduowng -> đường), before the single-vowel cases.
    if (word.length >= 2) {
      const prev = decompose(word[lastIndex - 1])
      if (prev?.base === 'u' && d.base === 'o') {
        let next = setCharAt(word, lastIndex - 1, compose('ư', prev.tone, isUpper(word[lastIndex - 1])))
        next = setCharAt(next, lastIndex, compose('ơ', d.tone, upper))
        return next
      }
    }
    const wMap: Record<string, string> = { a: 'ă', o: 'ơ', u: 'ư' }
    if (wMap[d.base]) return setCharAt(word, lastIndex, compose(wMap[d.base], d.tone, upper))
    // Undo: typing w again on ă/ơ/ư restores the plain vowel plus a literal w.
    const undoMap: Record<string, string> = { ă: 'a', ơ: 'o', ư: 'u' }
    if (undoMap[d.base]) {
      return setCharAt(word, lastIndex, compose(undoMap[d.base], d.tone, upper)) + key
    }
    return null
  }

  const doubleMap: Record<string, string> = { a: 'â', e: 'ê', o: 'ô' }
  if (doubleMap[k] && d.base === k) {
    return setCharAt(word, lastIndex, compose(doubleMap[k], d.tone, upper))
  }
  // Undo: "aaa" -> "aa"
  const undoDouble: Record<string, string> = { â: 'a', ê: 'e', ô: 'o' }
  if (undoDouble[d.base] && undoDouble[d.base] === k) {
    return setCharAt(word, lastIndex, compose(k, d.tone, upper)) + key
  }

  return null
}

/**
 * Feed one keystroke to the Telex engine.
 * `text` is the whole field value; only the word being typed is transformed.
 */
export function applyTelexKey(text: string, key: string): string {
  if (key.length !== 1 || !/[a-zA-Z]/.test(key)) return text + key

  const boundary = text.lastIndexOf(' ')
  const head = boundary === -1 ? '' : text.slice(0, boundary + 1)
  const word = boundary === -1 ? text : text.slice(boundary + 1)

  const k = key.toLowerCase()

  if (k in TONE_KEYS) {
    const toned = applyTone(word, key)
    if (toned !== null) return head + toned
  } else {
    const modified = applyLetterModifier(word, key)
    if (modified !== null) return head + modified
  }

  return text + key
}

/** Type a whole Telex string — mainly for tests and seeding the field. */
export function telex(input: string): string {
  return [...input].reduce((acc, ch) => applyTelexKey(acc, ch), '')
}

/**
 * Diacritic folding moved to `@/shared/text` when the catalogue went into a database —
 * the seeder and the search endpoint fold text with the same two functions, and a second
 * copy here would be free to drift from the one the `search_text` column was built with.
 *
 * Re-exported rather than relocated at the call sites: this is where they have always
 * been imported from, and the move is not what any of those files are about.
 */
export { removeDiacritics, vietnameseIncludes } from '@/shared/text'
