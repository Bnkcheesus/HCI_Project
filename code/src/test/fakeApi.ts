/**
 * The API, served from `src/mocks/` instead of from a database.
 *
 * The frontend suite runs in jsdom with no server and no Postgres, but the screens now
 * fetch everything they draw. Something has to answer them, and this is it: a `fetch`
 * stub implementing the same routes, over the same fixtures that seed the real database.
 *
 * Why a hand-written stub rather than a mocking library: `src/mocks/` is already the seed,
 * so a test that asserts "the home screen shows these four books" is asserting about the
 * same data the server would return. The alternative — per-test canned responses — drifts
 * from the real thing quietly, and the drift is invisible until a screen meets the real
 * server.
 *
 * What keeps *this* from drifting is `server/test/api.spec.ts`, which runs the same
 * assertions against the real routes and a real database. If the two disagree about a
 * shape, that suite is what says so.
 *
 * State: the catalogue is read-only, but borrowing writes. Copy counts and slips live in
 * a mutable overlay that `resetFakeApi()` clears between tests, so a checkout test can
 * watch a number go down without leaking into the next one.
 */
import {
  availability as seedAvailability,
  books,
  libraryStatus as seedStatus,
  loanHistory,
  shelfLocations,
  students,
  suggestedBooks,
} from '@/mocks'
import { checkEligibility, dueDateFrom, isoDate, MAX_BOOKS_PER_LOAN, slipIdFor } from '@/shared/borrowRules'
import { askLibrarian } from '@/shared/librarian'
import { asIsbnQuery, buildSearchText, vietnameseIncludes } from '@/shared/text'
import type { AccountSlip, Availability, LoanRecord, LoanSlip } from '@/shared/types'

/* ------------------------------------------------------------------ mutable state */

let copies: Record<string, Availability>
let loans: LoanRecord[]
let slipDates: Map<string, { borrowedAt: string; dueAt: string; cardCode: string }>

export function resetFakeApi(): void {
  copies = structuredClone(seedAvailability)
  loans = structuredClone(loanHistory)
  slipDates = new Map(
    loans.map((l) => [l.slipId, { borrowedAt: l.borrowedAt, dueAt: l.dueAt, cardCode: l.studentId }]),
  )
}

resetFakeApi()

/* ---------------------------------------------------------------------- handlers */

function bookList(list: typeof books) {
  return {
    books: list,
    availability: Object.fromEntries(
      list.map((b) => [b.id, copies[b.id]]).filter(([, a]) => a !== undefined),
    ),
  }
}

function search(query: string) {
  const q = query.trim()
  if (!q) return []

  // Mirrors the server: a folded LIKE over title+author+subject, plus the ISBN read as a
  // code when it looks like one.
  const code = asIsbnQuery(q)
  const folded = buildSearchText([q])

  return books.filter(
    (b) =>
      (code !== null && b.isbn.includes(code)) ||
      buildSearchText([b.title, b.author, b.subject]).includes(folded),
  )
}

function accountSlipsFor(cardCode: string): AccountSlip[] {
  const mine = loans.filter((l) => l.studentId === cardCode)
  const grouped = new Map<string, AccountSlip>()

  for (const loan of mine) {
    const existing = grouped.get(loan.slipId)
    const entry = { bookId: loan.bookId, returnedAt: loan.returnedAt }
    if (existing) {
      existing.books.push(entry)
      continue
    }
    grouped.set(loan.slipId, {
      id: loan.slipId,
      borrowedAt: loan.borrowedAt,
      dueAt: loan.dueAt,
      books: [entry],
      source: 'history',
    })
  }

  // Newest first, matching the server's ordering.
  return [...grouped.values()].sort((a, b) => b.borrowedAt.localeCompare(a.borrowedAt))
}

function cardCheck(cardCode: string, cartSize: number) {
  const student = students.find((s) => s.cardCode === cardCode)
  if (!student) return null

  const openLoans = loans.filter((l) => l.studentId === cardCode && l.returnedAt === null)
  return {
    student,
    blocks: checkEligibility({
      student,
      cartSize,
      openLoans,
      titleOf: (id) => books.find((b) => b.id === id)?.title ?? id,
    }),
  }
}

function checkout(body: { cardCode: string; bookIds: string[] }) {
  const { cardCode, bookIds } = body

  if (bookIds.length === 0 || bookIds.length > MAX_BOOKS_PER_LOAN) {
    return { status: 400, body: { error: 'invalid-request' } }
  }

  const student = students.find((s) => s.cardCode === cardCode)
  if (!student) return conflict({ reason: 'unknown-card' })

  const unknown = bookIds.filter((id) => !books.some((b) => b.id === id))
  if (unknown.length > 0) return conflict({ reason: 'unknown-book', bookIds: unknown })

  const check = cardCheck(cardCode, bookIds.length)!
  if (check.blocks.length > 0) return conflict({ reason: 'not-eligible', blocks: check.blocks })

  const empty = bookIds.filter((id) => (copies[id]?.copiesAvailable ?? 0) <= 0)
  if (empty.length > 0) return conflict({ reason: 'no-copies', bookIds: empty })

  const now = new Date()
  const borrowedAt = isoDate(now)
  const dueAt = dueDateFrom(now)

  // The next free slip number, checked against the ids that exist rather than counted per
  // card — two students whose ids end in the same four digits share a base. Mirrors the
  // server; see services/checkout.ts.
  const base = slipIdFor(borrowedAt, student.studentId)
  const taken = new Set(loans.filter((l) => l.slipId.startsWith(base)).map((l) => l.slipId))
  let sequence = 1
  while (taken.has(slipIdFor(borrowedAt, student.studentId, sequence))) sequence++
  const slipId = slipIdFor(borrowedAt, student.studentId, sequence)

  for (const bookId of bookIds) {
    const record = copies[bookId]
    record.copiesAvailable -= 1
    record.status = record.copiesAvailable > 0 ? 'available' : 'borrowed'
    loans.push({
      id: `${slipId}::${bookId}`,
      slipId,
      studentId: cardCode,
      bookId,
      borrowedAt,
      dueAt,
      returnedAt: null,
    })
  }
  slipDates.set(slipId, { borrowedAt, dueAt, cardCode })

  const slip: LoanSlip = {
    id: slipId,
    studentName: student.name,
    studentId: student.studentId,
    bookIds,
    borrowedAt,
    dueAt,
  }
  return { status: 201, body: { slip } }
}

function conflict(failure: unknown) {
  return { status: 409, body: { error: 'checkout-failed', failure } }
}

/* ------------------------------------------------------------------------ routing */

interface Handled {
  status: number
  body: unknown
}

function route(method: string, path: string, params: URLSearchParams, body: unknown): Handled {
  const ok = (value: unknown): Handled => ({ status: 200, body: value })
  const notFound: Handled = { status: 404, body: { error: 'not-found' } }

  if (method === 'GET') {
    if (path === '/api/health') return ok({ ok: true })

    if (path === '/api/books') return ok(bookList(search(params.get('q') ?? '')))

    if (path === '/api/books/suggested') return ok(bookList(suggestedBooks))

    if (path === '/api/books/borrowable') {
      const limit = Math.min(Math.max(Number(params.get('limit') ?? 20) || 20, 1), 50)
      const list = books
        .filter((b) => (copies[b.id]?.copiesAvailable ?? 0) > 0)
        .sort((a, b) => a.title.localeCompare(b.title))
        .slice(0, limit)
      return ok(bookList(list))
    }

    if (path === '/api/books/by-ids') {
      const ids = (params.get('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
      // In the order asked for — a slip lists its books in scan order.
      const list = ids.map((id) => books.find((b) => b.id === id)).filter((b) => b !== undefined)
      const codes = [...new Set(list.map((b) => b.shelfCode))]
      return ok({
        ...bookList(list),
        shelves: Object.fromEntries(
          codes.filter((c) => shelfLocations[c]).map((c) => [c, shelfLocations[c]]),
        ),
      })
    }

    if (path === '/api/availability') {
      const ids = (params.get('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
      return ok(Object.fromEntries(ids.map((id) => [id, copies[id]]).filter(([, a]) => a)))
    }

    if (path.startsWith('/api/books/by-isbn/')) {
      const code = decodeURIComponent(path.slice('/api/books/by-isbn/'.length)).replace(/[\s-]/g, '')
      const book = books.find((b) => b.isbn === code)
      return book ? ok({ book, availability: copies[book.id] }) : notFound
    }

    if (path.startsWith('/api/books/')) {
      const id = decodeURIComponent(path.slice('/api/books/'.length))
      const book = books.find((b) => b.id === id)
      if (!book) return notFound
      return ok({ book, availability: copies[book.id], shelf: shelfLocations[book.shelfCode] })
    }

    if (path === '/api/library/status') {
      const years = books.map((b) => b.year)
      return ok({
        status: {
          ...seedStatus,
          titlesAvailable: Object.values(copies).filter((a) => a.copiesAvailable > 0).length,
        },
        popularSubjects: popularSubjects(),
        yearMin: Math.min(...years),
        yearMax: Math.max(...years),
      })
    }

    if (path.startsWith('/api/students/')) {
      const code = decodeURIComponent(path.slice('/api/students/'.length))
      const result = cardCheck(code, Number(params.get('cartSize') ?? 0))
      return result ? ok(result) : notFound
    }

    if (path.startsWith('/api/accounts/')) {
      const code = decodeURIComponent(path.slice('/api/accounts/'.length).replace(/\/slips$/, ''))
      const student = students.find((s) => s.cardCode === code)
      return student ? ok({ student, slips: accountSlipsFor(code) }) : notFound
    }

    if (path.startsWith('/api/slips/')) {
      const id = decodeURIComponent(path.slice('/api/slips/'.length))
      const dates = slipDates.get(id)
      if (!dates) return notFound
      return ok({
        id,
        borrowedAt: dates.borrowedAt,
        dueAt: dates.dueAt,
        books: loans
          .filter((l) => l.slipId === id)
          .map((l) => ({ bookId: l.bookId, returnedAt: l.returnedAt })),
        source: 'history',
      } satisfies AccountSlip)
    }
  }

  if (method === 'POST') {
    if (path === '/api/loans') return checkout(body as { cardCode: string; bookIds: string[] })

    if (path === '/api/librarian') {
      const reply = askLibrarian((body as { question: string }).question, {
        books,
        availability: copies,
        shelfLocations,
        libraryStatus: seedStatus,
      })
      return ok({ intent: reply.intent, text: reply.text, bookIds: reply.books.map((b) => b.id) })
    }
  }

  throw new Error(`fakeApi: chưa cài đặt ${method} ${path}`)
}

/** Counted from the fixture, the way the server counts it from SQL. */
function popularSubjects(limit = 6): string[] {
  const counts = new Map<string, number>()
  for (const book of books) counts.set(book.subject, (counts.get(book.subject) ?? 0) + 1)
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([subject]) => subject)
}

/**
 * Install the stub. Called once from the test setup file, so no individual test has to
 * remember to — a page that quietly fetches something new should get an answer, not an
 * unhandled rejection in a suite that was not thinking about the network.
 */
export function installFakeApi(): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    // jsdom has no origin for a bare path; the base is thrown away after parsing.
    const url = new URL(raw, 'http://localhost')
    const method = (init?.method ?? 'GET').toUpperCase()
    const body = init?.body ? JSON.parse(init.body as string) : undefined

    const { status, body: payload } = route(method, url.pathname, url.searchParams, body)

    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

/** Exposed for the few tests that assert on what a borrow did to the fixture. */
export const fakeApiState = {
  copies: () => copies,
  loans: () => loans,
  /** Matches `vietnameseIncludes`, kept exported so a test can predict a search result. */
  matches: vietnameseIncludes,
}
