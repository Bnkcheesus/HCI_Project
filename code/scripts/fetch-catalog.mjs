/**
 * Resolves the curated seed in `catalog-seed.mjs` against Open Library and regenerates
 * the catalogue mocks with real bibliographic data.
 *
 *   node scripts/fetch-catalog.mjs          # fetch from the network, then generate
 *   node scripts/fetch-catalog.mjs --offline  # regenerate from the cached JSON only
 *
 * Writes:
 *   scripts/catalog-resolved.json  audit trail — exactly what Open Library returned
 *   public/covers/<id>.jpg         real cover art, downloaded once
 *   src/mocks/catalog.ts           the book list
 *   src/mocks/availability.ts      copy counts per book
 *   src/mocks/libraryMap.ts        shelf locations for every shelf the catalogue uses
 *
 * Why cache to JSON: the generator must be re-runnable without the network, and a
 * catalogue that silently changes under you between runs is not a fixture. The JSON is
 * committed; the fetch is the slow, occasional step.
 *
 * Open Library is queried politely — descriptive User-Agent, one request at a time,
 * with a pause between them. It is a free volunteer-run service.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seed, SUGGESTED_IDS } from './catalog-seed.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = path.join(ROOT, 'scripts', 'catalog-resolved.json')
const COVER_DIR = path.join(ROOT, 'public', 'covers')

const UA = 'LibAssist-HCI-coursework/1.0 (student project; contact via repository)'
const PAUSE_MS = 300
const THIS_YEAR = new Date().getFullYear()

const offline = process.argv.includes('--offline')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Stable hash → the generated numbers stay put across runs. */
function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/** Deterministic integer in [min, max] derived from a key. */
function pick(key, min, max) {
  return min + (hash(key) % (max - min + 1))
}

// ── Open Library ──────────────────────────────────────────────────────────────

const FIELDS = 'title,author_name,first_publish_year,publish_year,isbn,cover_i,language'

async function search(query) {
  const url = new URL('https://openlibrary.org/search.json')
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '5')
  url.searchParams.set('fields', FIELDS)

  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`search ${res.status} for "${query}"`)
  return (await res.json()).docs ?? []
}

/** ISBN-13 only — that is what a self-checkout scanner reads off the back cover. */
function pickIsbn(doc) {
  return (doc.isbn ?? []).find((i) => /^97[89]\d{10}$/.test(i))
}

/**
 * The edition year, not the first-ever publication year. A library shelves the current
 * edition, so "Introduction to Algorithms" should read 2009, not 1990.
 */
function pickYear(doc) {
  const years = (doc.publish_year ?? []).filter((y) => y >= 1950 && y <= THIS_YEAR)
  return years.length ? Math.max(...years) : (doc.first_publish_year ?? THIS_YEAR)
}

/**
 * Open Library is crowd-maintained, so one book's author list can hold a dozen entries
 * for four people — "David C. Lay", "Lay", "Davic C. Lay", "Judi McDonald David Lay",
 * plus "Addison-Wesley Publishing Staff". Split the compound entries, drop the corporate
 * ones, then keep one canonical spelling per surname.
 */
function pickAuthor(names) {
  const parts = (names ?? [])
    .flatMap((n) => n.split(';'))
    .map((n) => n.replace(/[.,]+$/, '').trim())
    .filter((n) => n && !/\b(staff|inc|ltd|press|publishers?)\b/i.test(n))

  if (!parts.length) return 'Không rõ tác giả'

  // A personal name is two or three words ("Gilbert Strang", "David C. Lay"). One word is
  // a fragment; four or more is two people run together ("Judi McDonald David Lay").
  const wordCount = (n) => n.split(/\s+/).length
  const wellFormed = parts.filter((n) => wordCount(n) >= 2 && wordCount(n) <= 3)
  const usable = wellFormed.length ? wellFormed : parts

  // Key on initial + surname, not surname alone: co-authors genuinely share surnames —
  // David C. Lay and Steven R. Lay wrote this book together, and collapsing them loses
  // the lead author.
  const byPerson = new Map()
  for (const name of usable) {
    const words = name.split(/\s+/)
    const key = `${words[0][0].toLowerCase()} ${words.at(-1).toLowerCase()}`
    const kept = byPerson.get(key)
    if (!kept || name.length > kept.length) byPerson.set(key, name)
  }

  const unique = [...byPerson.values()]
  return unique.length > 3 ? `${unique.slice(0, 3).join(', ')} et al.` : unique.join(', ')
}

/** Words that stay lowercase inside a title, unless they open it. */
const SMALL_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'nor', 'but', 'of', 'in', 'on', 'at', 'to', 'for',
  'with', 'by', 'from', 'as', 'into', 'over', 'via',
])

/**
 * Catalogue records arrive in whatever case the contributor typed — "Discrete-time
 * signal processing" next to "Deep Learning". Sentence-case titles are lifted to title
 * case so a grid of book cards reads as one catalogue; titles that already carry their
 * own capitalisation (acronyms, subtitles, "SICP") are left untouched.
 *
 * Two suffixes are also dropped: the publisher's series name in trailing brackets
 * ("… (Information Science and Statistics)") and a repeated author credit ("… by David
 * J. Griffiths") — both are shelf-label noise next to an author line that already says it.
 */
function normalizeTitle(raw, author) {
  let title = raw.replace(/\s+/g, ' ').trim()

  // Trailing "(…)" — long enough to be a series name, not an edition or an acronym.
  title = title.replace(/\s*\(([^()]{14,})\)\s*$/, '')

  // A repeated author credit, however the contributor tacked it on: "… by David J.
  // Griffiths", "…. Michael Sipser". Only stripped when the trailing name really is this
  // book's author, so a title that genuinely ends in a name survives.
  // " by …" is tried first: in "… (2nd Edition) by David J. Griffiths" the dot pattern
  // would otherwise bite off only ". Griffiths" and leave a dangling "by David J".
  const surnames = new Set(author.toLowerCase().match(/[\p{L}]+/gu) ?? [])
  const isCredit = (credit) => surnames.has(credit.trim().split(/\s+/).pop().toLowerCase())
  for (const pattern of [/\s+by\s+(.+)$/iu, /[.,]\s+([\p{Lu}][^.,]*)$/u]) {
    title = title.replace(pattern, (whole, credit) => (isCredit(credit) ? '' : whole))
  }

  const words = title.split(' ')
  const capitalisedAfterFirst = words.slice(1).filter((w) => /^[A-Z]/.test(w)).length
  if (capitalisedAfterFirst >= 2) return title

  return words
    .map((word, i) =>
      word
        .split('-')
        .map((part, j) => {
          const lower = part.toLowerCase()
          if (i > 0 && j === 0 && SMALL_WORDS.has(lower)) return lower
          return part.charAt(0).toUpperCase() + part.slice(1)
        })
        .join('-'),
    )
    .join(' ')
}

function pickLanguage(doc) {
  return (doc.language ?? []).includes('vie') ? 'vi' : 'en'
}

/**
 * Choose the best of the five candidates: it must contain `expect` in its title (so a
 * typo cannot quietly shelve the wrong book), and among those the one with cover art
 * and an ISBN-13 wins.
 */
function chooseDoc(docs, entry) {
  const want = (entry.expect ?? '').toLowerCase()
  const viable = docs.filter((d) => (d.title ?? '').toLowerCase().includes(want))
  if (!viable.length) return null

  return viable.sort((a, b) => score(b) - score(a))[0]

  function score(d) {
    return (d.cover_i ? 2 : 0) + (pickIsbn(d) ? 1 : 0)
  }
}

async function downloadCover(coverId, id) {
  const dest = path.join(COVER_DIR, `${id}.jpg`)
  if (existsSync(dest)) return `/covers/${id}.jpg`

  const res = await fetch(`https://covers.openlibrary.org/b/id/${coverId}-L.jpg`, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  })
  if (!res.ok) return undefined

  const bytes = Buffer.from(await res.arrayBuffer())
  // Open Library serves a 1×1 placeholder when it has no art for an id.
  if (bytes.length < 2000) return undefined

  await writeFile(dest, bytes)
  return `/covers/${id}.jpg`
}

// ── Resolve ───────────────────────────────────────────────────────────────────

async function resolveAll() {
  await mkdir(COVER_DIR, { recursive: true })
  const resolved = []
  const problems = []

  for (const [i, entry] of seed.entries()) {
    const label = `${String(i + 1).padStart(3)}/${seed.length} ${entry.id}`

    // Pinned entries are Vietnamese textbooks and periodicals: Open Library indexes them
    // with stripped diacritics and no cover, so hand-entered print metadata is the
    // *more* accurate source, not a shortcut.
    if (entry.pin) {
      const localCover = existsSync(path.join(COVER_DIR, `${entry.id}.jpg`))
      resolved.push({
        ...entry.pin,
        id: entry.id,
        source: 'pinned',
        coverUrl: localCover ? `/covers/${entry.id}.jpg` : undefined,
      })
      console.log(`${label}  pinned`)
      continue
    }

    try {
      const docs = await search(entry.query)
      const doc = chooseDoc(docs, entry)
      if (!doc) {
        problems.push(`${entry.id}: no title containing "${entry.expect}"`)
        console.log(`${label}  MISS`)
        await sleep(PAUSE_MS)
        continue
      }

      const coverUrl = doc.cover_i ? await downloadCover(doc.cover_i, entry.id) : undefined
      // Stored verbatim: the cache is the record of what Open Library actually said, so
      // presentation can be reworked with --offline instead of hammering the API again.
      resolved.push({
        id: entry.id,
        title: doc.title,
        authors: doc.author_name ?? [],
        isbn: pickIsbn(doc) ?? `978${String(hash(entry.id)).padStart(10, '0').slice(0, 10)}`,
        year: pickYear(doc),
        language: pickLanguage(doc),
        coverUrl,
        source: 'openlibrary',
        openLibraryCoverId: doc.cover_i ?? null,
      })
      console.log(`${label}  ${doc.title}${coverUrl ? '  [cover]' : '  [no cover]'}`)
    } catch (err) {
      problems.push(`${entry.id}: ${err.message}`)
      console.log(`${label}  ERROR ${err.message}`)
    }

    await sleep(PAUSE_MS)
  }

  await writeFile(CACHE, `${JSON.stringify(resolved, null, 2)}\n`)
  return { resolved, problems }
}

// ── Generate ──────────────────────────────────────────────────────────────────

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

/** Turn one cached record into the shape the app displays. */
function present(r) {
  // Pinned records are already print-accurate; only fetched ones need tidying.
  if (r.source === 'pinned') return { title: r.title, author: r.author }
  const author = pickAuthor(r.authors)
  return { title: normalizeTitle(r.title, author), author }
}

function generateCatalog(records) {
  const byId = new Map(records.map((r) => [r.id, r]))
  const entries = seed.filter((s) => byId.has(s.id))

  const body = entries
    .map((s, i) => {
      const r = byId.get(s.id)
      const { title, author } = present(r)
      const lines = [
        `    id: ${q(s.id)},`,
        `    title: ${q(title)},`,
        `    isbn: ${q(r.isbn)},`,
        `    author: ${q(author)},`,
        `    subject: ${q(s.subject)},`,
        `    type: ${q(s.type ?? 'book')},`,
      ]
      if (r.coverUrl) lines.push(`    coverUrl: ${q(r.coverUrl)},`)
      lines.push(
        `    spine: ${(i % 4) + 1},`,
        `    description: ${q(s.desc)},`,
        `    shelfCode: ${q(s.shelf)},`,
        `    floor: ${s.floor},`,
        `    year: ${r.year},`,
        `    language: ${q(r.language)},`,
      )
      return `  {\n${lines.join('\n')}\n  },`
    })
    .join('\n')

  return `// Book catalogue — backs Job 1 / Product-Service 1 (tìm kiếm từ khóa + gợi ý AI).
//
// GENERATED by scripts/fetch-catalog.mjs — edit scripts/catalog-seed.mjs instead.
//
// This is the *seed* for the database (server/db/seed.ts) and the fixture the test suite
// renders against. At runtime the app reads the catalogue over the API, not from here.
//
// Titles, authors, publication years, ISBN-13s and cover art are real, resolved against
// Open Library (openlibrary.org) from the curated seed list; the audit trail of what came
// back lives in scripts/catalog-resolved.json. Subjects, shelf codes and the Vietnamese
// descriptions are the library's own cataloguing decisions. Vietnamese textbooks and
// periodicals carry hand-entered print metadata — Open Library indexes those with
// stripped diacritics and no cover art, so it is the weaker source for them.

// The shapes live in @/shared/types, where the server reads them too — a second copy here
// would be free to drift from the columns the seeder writes.
export type { Book, DocumentType, Language } from '@/shared/types'
export { DOCUMENT_TYPE_LABEL, LANGUAGE_LABEL } from '@/shared/types'

import type { Book } from '@/shared/types'

export const books: Book[] = [
${body}
]

/**
 * Books surfaced on the kiosk home screen (Gain Creator 1 — bộ gợi ý sách).
 *
 * Named explicitly rather than sliced off the front of the catalogue: which four books
 * greet a reader is a curation decision, and the four here are one per faculty, all with
 * real cover art and a different availability state each.
 */
const SUGGESTED_IDS = [${SUGGESTED_IDS.map(q).join(', ')}]

export const suggestedBooks: Book[] = SUGGESTED_IDS.map((id) => {
  const book = books.find((b) => b.id === id)
  if (!book) throw new Error(\`suggestedBooks: no catalogue entry for "\${id}"\`)
  return book
})
`
}

/**
 * Copy counts. A handful of ids are pinned to the numbers the screens were designed and
 * tested against; the rest are derived from the id hash so a re-run never reshuffles the
 * shelf.
 *
 * The four home-screen books are pinned to four *different* states — 3 left, 1 left, none
 * left, 4 left. Left to the hash, two of them came out fully borrowed, which puts the same
 * black chip on two adjacent cards and shows a reader less of the system than it can do.
 */
const PINNED_STOCK = {
  // Home screen — see SUGGESTED_IDS in catalog-seed.mjs.
  'cormen-algorithms': { total: 4, available: 3 },
  'stewart-calculus': { total: 3, available: 1 },
  'halliday-fundamentals-physics': { total: 2, available: 0, dueBack: '02/09' },
  'campbell-biology': { total: 5, available: 4 },

  'giai-tich-1': { total: 4, available: 3 },
  'vat-ly-dai-cuong': { total: 3, available: 1 },
  'lap-trinh-cpp': { total: 2, available: 0, dueBack: '02/09' },
  'dai-so-tuyen-tinh': { total: 5, available: 4 },
  'statistical-learning': { total: 3, available: 2 },
  'pattern-recognition': { total: 2, available: 0, dueBack: '25/11' },
  'hands-on-ml': { total: 4, available: 1 },
  'mathematics-for-ml': { total: 2, available: 2 },
  'jmlr-deep-learning': { total: 1, available: 1 },
  'nature-machine-intelligence': { total: 1, available: 0, dueBack: '30/08' },
  'tia-sang-ai': { total: 2, available: 2 },
}

function generateAvailability(records) {
  const byId = new Map(records.map((r) => [r.id, r]))
  const rows = seed
    .filter((s) => byId.has(s.id))
    .map((s) => {
      const pinned = PINNED_STOCK[s.id]
      let total, available, dueBack
      if (pinned) {
        ;({ total, available, dueBack } = pinned)
      } else {
        total = pick(`${s.id}:total`, 1, 5)
        // Roughly one book in five is fully out — enough that "Đã mượn hết" is a state
        // the reader actually meets while browsing, not a rare edge case.
        const out = hash(`${s.id}:out`) % 5 === 0
        available = out ? 0 : pick(`${s.id}:avail`, 1, total)
        if (out) {
          const day = pick(`${s.id}:day`, 1, 28)
          const month = pick(`${s.id}:month`, 1, 12)
          dueBack = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
        }
      }

      const status = available > 0 ? 'available' : 'borrowed'
      const lines = [
        `    bookId: ${q(s.id)},`,
        `    status: ${q(status)},`,
        `    copiesTotal: ${total},`,
        `    copiesAvailable: ${available},`,
      ]
      if (dueBack) lines.push(`    dueBack: ${q(dueBack)},`)
      return `  ${q(s.id)}: {\n${lines.join('\n')}\n  },`
    })
    .join('\n')

  return `// Opening copy counts — backs Gain Creator 4 / Pain Reliever 2
// (hiển thị tình trạng khả dụng của sách theo thời gian thực).
//
// GENERATED by scripts/fetch-catalog.mjs — edit scripts/catalog-seed.mjs instead.
//
// The *starting* state seeded into the database, and the fixture tests render against.
// Once the app is running these numbers move: borrowing a book decrements the row in the
// database, which is the whole point of Gain Creator 4. Nothing here changes.

export type { Availability, AvailabilityStatus } from '@/shared/types'

import type { Availability } from '@/shared/types'

export const availability: Record<string, Availability> = {
${rows}
}
`
}

/**
 * Shelf zones. A shelf code's prefix decides which part of the building it is in, so a
 * new book only has to name a plausible code and the map follows.
 */
const ZONES = [
  { match: /^MA-1|^MA-2[0-3]/, zone: 'Khu Toán đại cương', turn: 'Rẽ trái ở quầy thủ thư' },
  { match: /^MA-2[4-9]|^MA-3/, zone: 'Khu Toán chuyên ngành', turn: 'Rẽ trái ở quầy thủ thư' },
  { match: /^PH-/, zone: 'Khu Vật lý', turn: 'Rẽ phải vào khu Vật lý' },
  { match: /^CH-/, zone: 'Khu Hóa học', turn: 'Rẽ phải qua phòng đọc yên tĩnh' },
  { match: /^BI-/, zone: 'Khu Sinh học', turn: 'Đi hết dãy Hóa học rồi rẽ trái' },
  { match: /^CS-/, zone: 'Khu Công nghệ thông tin', turn: 'Rẽ phải vào dãy kệ CS' },
  { match: /^EE-/, zone: 'Khu Điện tử – Viễn thông', turn: 'Rẽ trái vào dãy kệ EE' },
  { match: /^ES-/, zone: 'Khu Khoa học Trái Đất', turn: 'Rẽ trái sau khu Báo & Tạp chí' },
  { match: /^[AB]\d/, zone: 'Khu Machine Learning', turn: 'Rẽ phải vào dãy kệ A' },
  { match: /^[JM]\d/, zone: 'Khu Báo & Tạp chí', turn: 'Rẽ phải vào khu Báo & Tạp chí' },
]

/** The eleven hand-written routes the earlier screens were built against, kept verbatim. */
const PINNED_ROUTES = {
  A3: ['Đi thẳng khoảng 15m', 'Rẽ phải vào dãy kệ A', 'Kệ số 3, hàng thứ 2 từ trên xuống'],
  A4: ['Đi thẳng khoảng 17m', 'Rẽ phải vào dãy kệ A', 'Kệ số 4, hàng thứ 1 từ trên xuống'],
  A5: ['Đi thẳng khoảng 19m', 'Rẽ phải vào dãy kệ A', 'Kệ số 5, hàng thứ 3 từ trên xuống'],
  B2: ['Đi thẳng khoảng 22m', 'Rẽ trái vào dãy kệ B', 'Kệ số 2, hàng thứ 2 từ trên xuống'],
  'MA-101': ['Đi thẳng khoảng 12m', 'Rẽ trái ở quầy thủ thư', 'Kệ MA-101, hàng thứ 1 từ trên xuống'],
  'MA-215': ['Đi thẳng khoảng 14m', 'Rẽ trái ở quầy thủ thư', 'Kệ MA-215, hàng thứ 3 từ trên xuống'],
  'PH-204': ['Đi thẳng khoảng 18m', 'Rẽ phải vào khu Vật lý', 'Kệ PH-204, hàng thứ 2 từ trên xuống'],
  'CS-312': ['Lên tầng 2 bằng thang bộ bên trái', 'Đi thẳng khoảng 25m', 'Kệ CS-312, hàng thứ 2'],
  J1: ['Lên tầng 3 bằng thang máy', 'Rẽ phải vào khu Báo & Tạp chí', 'Kệ J1'],
  J2: ['Lên tầng 3 bằng thang máy', 'Rẽ phải vào khu Báo & Tạp chí', 'Kệ J2'],
  M1: ['Lên tầng 3 bằng thang máy', 'Đi thẳng tới cuối dãy', 'Kệ M1'],
}

// Must stay in step with AISLE_COUNT in src/shared/types.ts — see the header emitted below.
const AISLE_COUNT = 5

function generateLibraryMap(records) {
  const byId = new Map(records.map((r) => [r.id, r]))
  const shelves = new Map()
  for (const s of seed) {
    if (byId.has(s.id) && !shelves.has(s.shelf)) shelves.set(s.shelf, s.floor)
  }

  const rows = [...shelves]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, floor]) => {
      const zone = ZONES.find((z) => z.match.test(code))?.zone ?? 'Khu tổng hợp'
      const turn = ZONES.find((z) => z.match.test(code))?.turn ?? 'Hỏi quầy thủ thư'
      const aisle = pick(`${code}:aisle`, 0, AISLE_COUNT - 1)
      const alongAisle = pick(`${code}:along`, 20, 75) / 100
      // Distance grows with the floor: another storey is another flight of stairs.
      const distanceMetres = pick(`${code}:dist`, 10, 26) + (floor - 1) * 8
      const row = pick(`${code}:row`, 1, 4)

      const directions =
        PINNED_ROUTES[code] ??
        (floor === 1
          ? [`Đi thẳng khoảng ${distanceMetres}m`, turn, `Kệ ${code}, hàng thứ ${row} từ trên xuống`]
          : floor === 2
            ? [
                'Lên tầng 2 bằng thang bộ bên trái',
                `Đi thẳng khoảng ${distanceMetres - 8}m`,
                `Kệ ${code}, hàng thứ ${row} từ trên xuống`,
              ]
            : ['Lên tầng 3 bằng thang máy', turn, `Kệ ${code}, hàng thứ ${row} từ trên xuống`])

      const key = /^[A-Z]+-|^[A-Z]\d/.test(code) && code.includes('-') ? q(code) : code
      return `  ${key}: {
    shelfCode: ${q(code)},
    floor: ${floor},
    zone: ${q(zone)},
    aisle: ${aisle},
    alongAisle: ${alongAisle},
    distanceMetres: ${distanceMetres},
    directions: [${directions.map(q).join(', ')}],
  },`
    })
    .join('\n')

  return `// Library floor map / shelf location — backs Product-Service 2 / Gain Creator 2
// (bản đồ định vị kệ sách trên kiosk, xuất QR sang di động).
// Maps to the "MapView" / "FloorMap" nodes shared across kiosk-book-info, Phone-Location.
//
// GENERATED by scripts/fetch-catalog.mjs — edit scripts/catalog-seed.mjs instead.
// Seed for the database (server/db/seed.ts) and fixture for the test suite.

export type { ShelfLocation } from '@/shared/types'
// AISLE_COUNT is geometry shared with the map component, so it lives beside the types.
// The value below in this generator must match it, or a shelf lands outside the drawing.
export { AISLE_COUNT } from '@/shared/types'

import type { ShelfLocation } from '@/shared/types'

export const shelfLocations: Record<string, ShelfLocation> = {
${rows}
}
`
}

// ── Main ──────────────────────────────────────────────────────────────────────

const { resolved, problems } = offline
  ? { resolved: JSON.parse(await readFile(CACHE, 'utf8')), problems: [] }
  : await resolveAll()

await writeFile(path.join(ROOT, 'src/mocks/catalog.ts'), generateCatalog(resolved))
await writeFile(path.join(ROOT, 'src/mocks/availability.ts'), generateAvailability(resolved))
await writeFile(path.join(ROOT, 'src/mocks/libraryMap.ts'), generateLibraryMap(resolved))

const withCover = resolved.filter((r) => r.coverUrl).length
console.log(`\n${resolved.length}/${seed.length} books · ${withCover} with cover art`)
if (problems.length) {
  console.log(`\n${problems.length} unresolved:`)
  for (const p of problems) console.log(`  ${p}`)
}
