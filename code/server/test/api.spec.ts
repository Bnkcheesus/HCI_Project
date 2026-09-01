/**
 * The read endpoints, driven end to end: real routing, real SQL, real rows.
 *
 * `app.inject()` dispatches a request through Fastify in-process — no port, no fetch, no
 * waiting for a server to boot — so these are integration tests without the flakiness
 * that usually buys.
 *
 * Assertions are written against `src/mocks/` rather than against literals wherever the
 * value is data. The mocks are the seed, so "the API returns what was seeded" stays true
 * when the catalogue is regenerated, and a hardcoded ISBN would start failing for a
 * reason that has nothing to do with the API.
 *
 * Prerequisite: `npm run db:migrate && npm run db:seed`.
 */
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { books, libraryStatus, loanHistory, shelfLocations, students, suggestedBooks } from '@/mocks'
import type { AccountSlip, Availability, Book } from '@/shared/types'
import { buildApp } from '../app.ts'
import { createDb } from '../db/dialect.ts'

const db = createDb()
let app: FastifyInstance

beforeAll(async () => {
  app = buildApp(db)
  await app.ready()
})

afterAll(async () => {
  await app.close()
  await db.destroy()
})

async function get<T>(url: string): Promise<{ status: number; body: T }> {
  const response = await app.inject({ method: 'GET', url })
  return { status: response.statusCode, body: response.json() as T }
}

describe('GET /api/books', () => {
  it('finds a book by a plain Vietnamese query', async () => {
    const { body } = await get<{ books: Book[] }>('/api/books?q=giải tích')
    expect(body.books.map((b) => b.id)).toContain('giai-tich-1')
  })

  /**
   * The whole point of the precomputed `search_text` column: an unaccented query finds an
   * accented title with a plain LIKE, needing neither Postgres' `unaccent` extension nor
   * an accent-insensitive collation on SQL Server.
   */
  it('finds an accented title from an unaccented query', async () => {
    const { body } = await get<{ books: Book[] }>('/api/books?q=giai tich')
    expect(body.books.map((b) => b.id)).toContain('giai-tich-1')
  })

  it('matches on author and on subject, not only on title', async () => {
    const byAuthor = await get<{ books: Book[] }>('/api/books?q=cormen')
    expect(byAuthor.body.books.length).toBeGreaterThan(0)

    const bySubject = await get<{ books: Book[] }>('/api/books?q=machine learning')
    expect(bySubject.body.books.length).toBeGreaterThan(0)
  })

  /**
   * The search field has always told readers it accepts an ISBN. Taken from the catalogue
   * rather than typed in: a hardcoded code would drift the next time `npm run catalog`
   * resolves a newer edition.
   */
  it('finds a book by its ISBN, and by part of one', async () => {
    const target = books.find((b) => b.id === 'cormen-algorithms')!

    const full = await get<{ books: Book[] }>(`/api/books?q=${target.isbn}`)
    expect(full.body.books.map((b) => b.id)).toContain(target.id)

    // Narrowing as the reader keys it in — a middle chunk still finds it.
    const partial = await get<{ books: Book[] }>(`/api/books?q=${target.isbn.slice(2, 10)}`)
    expect(partial.body.books.map((b) => b.id)).toContain(target.id)
  })

  /**
   * A four-digit run is a year, not a code. Treating it as an ISBN would make "2022"
   * return every book whose *number* happens to contain it — see MIN_ISBN_QUERY.
   */
  it('does not read a year as an ISBN', async () => {
    const { body } = await get<{ books: Book[] }>('/api/books?q=2022')
    const matchedByCode = body.books.filter((b) => b.isbn.includes('2022'))
    expect(matchedByCode.length).toBe(0)
  })

  it('returns nothing for an empty query rather than the whole catalogue', async () => {
    const { body } = await get<{ books: Book[] }>('/api/books?q=')
    expect(body.books).toEqual([])
  })

  /**
   * Availability travels with the books. The chip sits on the same card as the title, and
   * the stock filter cannot work without copy counts — two requests would let the two
   * drift apart on screen.
   */
  it('carries availability for every book it returns', async () => {
    const { body } = await get<{ books: Book[]; availability: Record<string, Availability> }>(
      '/api/books?q=machine learning',
    )
    for (const book of body.books) {
      expect(body.availability[book.id]).toBeDefined()
    }
  })
})

describe('GET /api/books/suggested', () => {
  /**
   * Which four books greet a reader is a curation decision — one per faculty, all with
   * cover art, four different availability states — carried into the database as an
   * explicit rank rather than left to whatever `SELECT` returns first.
   */
  it('returns the curated four, in order', async () => {
    const { body } = await get<{ books: Book[] }>('/api/books/suggested')
    expect(body.books.map((b) => b.id)).toEqual(suggestedBooks.map((b) => b.id))
  })
})

describe('GET /api/books/:id', () => {
  /**
   * One request, everything the detail screen needs. This is the screen where the reader
   * decides whether to walk across the building; a page that fills in the shelf a second
   * after the title is the page they give up on.
   */
  it('returns the book with its availability and its route to the shelf', async () => {
    const { body } = await get<{
      book: Book
      availability: Availability
      shelf: { shelfCode: string; directions: string[] }
    }>('/api/books/statistical-learning')

    expect(body.book.title).toBe('An Introduction to Statistical Learning')
    expect(body.availability.copiesAvailable).toBeGreaterThanOrEqual(0)
    expect(body.shelf.shelfCode).toBe(body.book.shelfCode)
    expect(body.shelf.directions).toEqual(shelfLocations[body.book.shelfCode].directions)
  })

  it('404s on a book that does not exist', async () => {
    const { status } = await get('/api/books/khong-ton-tai')
    expect(status).toBe(404)
  })
})

describe('GET /api/books/by-isbn/:isbn', () => {
  /** The scanner's lookup, and the phone's manual-entry fallback. */
  it('resolves a code with the spaces and dashes a cover prints', async () => {
    const target = books.find((b) => b.id === 'cormen-algorithms')!
    const spaced = `${target.isbn.slice(0, 3)}-${target.isbn.slice(3, 7)} ${target.isbn.slice(7)}`

    const { body } = await get<{ book: Book }>(`/api/books/by-isbn/${encodeURIComponent(spaced)}`)
    expect(body.book.id).toBe(target.id)
  })

  it('404s on a code no book carries', async () => {
    const { status } = await get('/api/books/by-isbn/9780000000000')
    expect(status).toBe(404)
  })
})

describe('GET /api/library/status', () => {
  it('returns the hours, the subject shortcuts and the year bounds', async () => {
    const { body } = await get<{
      status: { opensAt: string; isOpen: boolean; titlesAvailable: number }
      popularSubjects: string[]
      yearMin: number
      yearMax: number
    }>('/api/library/status')

    expect(body.status.opensAt).toBe(libraryStatus.opensAt)
    expect(body.status.isOpen).toBe(true)
    expect(body.popularSubjects.length).toBeGreaterThan(0)

    // The slider's ends have to match the data, or it hides books at one end and offers
    // empty years at the other.
    expect(body.yearMin).toBe(Math.min(...books.map((b) => b.year)))
    expect(body.yearMax).toBe(Math.max(...books.map((b) => b.year)))
  })

  /**
   * A subject shortcut that leads to "Không tìm thấy tài liệu nào" is worse than no
   * shortcut: the persona taps it precisely when they do not know what to type.
   */
  it('offers only subjects that actually return books', async () => {
    const { body } = await get<{ popularSubjects: string[] }>('/api/library/status')

    for (const subject of body.popularSubjects) {
      const results = await get<{ books: Book[] }>(`/api/books?q=${encodeURIComponent(subject)}`)
      expect(results.body.books.length).toBeGreaterThan(0)
    }
  })
})

describe('GET /api/students/:cardCode', () => {
  it('returns a healthy card with no blocks', async () => {
    const { body } = await get<{ student: { name: string }; blocks: unknown[] }>(
      '/api/students/20215012?cartSize=1',
    )
    expect(body.student.name).toBe('Nguyễn Minh Khang')
    expect(body.blocks).toEqual([])
  })

  it('refuses an expired card, and says when it expired', async () => {
    const { body } = await get<{ blocks: { code: string; message: string }[] }>(
      '/api/students/20219999?cartSize=1',
    )
    expect(body.blocks.map((b) => b.code)).toContain('card-expired')
  })

  /**
   * The overdue refusal names the titles. That is the difference between a message the
   * reader can act on and one that sends them to the desk to ask which books.
   */
  it('names the overdue titles in the refusal', async () => {
    const { body } = await get<{ blocks: { code: string; message: string }[] }>(
      '/api/students/20218888?cartSize=1',
    )
    const overdue = body.blocks.find((b) => b.code === 'overdue')
    expect(overdue).toBeDefined()
    expect(overdue!.message).toContain('Vật lý đại cương')
  })

  it('refuses a card already at the borrowing limit', async () => {
    const { body } = await get<{ blocks: { code: string }[] }>(
      '/api/students/20217777?cartSize=1',
    )
    expect(body.blocks.map((b) => b.code)).toContain('limit')
  })

  it('404s on a card that does not exist', async () => {
    const { status } = await get('/api/students/00000000')
    expect(status).toBe(404)
  })

  it('knows every seeded card', async () => {
    for (const student of students) {
      const { status } = await get(`/api/students/${student.cardCode}`)
      expect(status).toBe(200)
    }
  })
})

describe('GET /api/accounts/:cardCode/slips', () => {
  /**
   * The grouping that used to happen in the browser. A slip is what the reader
   * experienced — one visit, one due date, however many books they carried out — so loan
   * rows sharing a slip id have to come back as one card, not as several repeating
   * identical dates.
   */
  it('groups the loans of one visit into a single slip', async () => {
    const { body } = await get<{ slips: AccountSlip[] }>('/api/accounts/20215012/slips')

    const multi = loanHistory
      .filter((l) => l.studentId === '20215012')
      .reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.slipId]: (acc[l.slipId] ?? 0) + 1 }), {})
    const [slipId] = Object.entries(multi).find(([, count]) => count > 1)!

    const slip = body.slips.find((s) => s.id === slipId)
    expect(slip).toBeDefined()
    expect(slip!.books).toHaveLength(multi[slipId])
  })

  it('returns one slip per visit, not one per book', async () => {
    const { body } = await get<{ slips: AccountSlip[] }>('/api/accounts/20215012/slips')

    const mine = loanHistory.filter((l) => l.studentId === '20215012')
    expect(body.slips).toHaveLength(new Set(mine.map((l) => l.slipId)).size)
    expect(body.slips.flatMap((s) => s.books)).toHaveLength(mine.length)
  })

  /** Open and returned books are told apart by a date, which the mobile card renders. */
  it('marks which books came back and which are still out', async () => {
    const { body } = await get<{ slips: AccountSlip[] }>('/api/accounts/20215012/slips')
    const books = body.slips.flatMap((s) => s.books)

    const stillOut = books.filter((b) => b.returnedAt === null)
    expect(stillOut).toHaveLength(
      loanHistory.filter((l) => l.studentId === '20215012' && l.returnedAt === null).length,
    )
    for (const book of books.filter((b) => b.returnedAt !== null)) {
      expect(book.returnedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('newest visit first', async () => {
    const { body } = await get<{ slips: AccountSlip[] }>('/api/accounts/20215012/slips')
    const dates = body.slips.map((s) => s.borrowedAt)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  /**
   * An empty history and an unknown card are different answers. Collapsing them would
   * show a reader who mistyped a number a cheerful empty account belonging to nobody.
   */
  it('404s on a card that does not exist', async () => {
    const { status } = await get('/api/accounts/00000000/slips')
    expect(status).toBe(404)
  })
})

describe('POST /api/librarian', () => {
  async function ask(question: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/librarian',
      payload: { question },
    })
    return response.json() as { intent: string; text: string; bookIds: string[] }
  }

  it('answers a subject question with books from that shelf', async () => {
    const reply = await ask('Sách về trí tuệ nhân tạo còn trên kệ')
    expect(reply.intent).toBe('books')
    expect(reply.bookIds.length).toBeGreaterThan(0)
  })

  /**
   * Tone-stripped Vietnamese phrases contain one another constantly: "thuật toán" ends in
   * "toán", "khoa học" ends in "hoa học". The word-boundary rules that keep those apart
   * are the same ones that ran in the browser — this is the check that they survived the
   * move to the server with their data now coming from SQL.
   */
  it('keeps "thuật toán" on the computing shelf, not the mathematics one', async () => {
    const reply = await ask('sách thuật toán')
    const subjects = new Set(
      reply.bookIds.map((id) => books.find((b) => b.id === id)?.subject),
    )
    expect(subjects.has('Công nghệ thông tin')).toBe(true)
    expect(subjects.has('Toán học')).toBe(false)
  })

  it('answers a location question with the shelf and the walking route', async () => {
    const reply = await ask('Sách Giải tích 1 nằm ở kệ nào?')
    expect(reply.intent).toBe('location')
    expect(reply.text).toContain(books.find((b) => b.id === 'giai-tich-1')!.shelfCode)
  })

  it('answers opening hours from the library status', async () => {
    const reply = await ask('Thư viện mở cửa mấy giờ?')
    expect(reply.intent).toBe('hours')
    expect(reply.text).toContain(libraryStatus.opensAt)
  })

  /**
   * A figure the app states has to be the constant behind it. The librarian says "tối đa
   * 5 cuốn trong 14 ngày" and the checkout enforces MAX_BOOKS_PER_LOAN / LOAN_DAYS — if
   * those ever diverge, two screens contradict each other.
   */
  it('quotes the borrowing terms the checkout actually enforces', async () => {
    // Phrased to contain "hạn trả", one of the matcher's actual borrowing keywords —
    // "mượn sách bao lâu" reads naturally but hits none of them and falls through.
    const reply = await ask('hạn trả sách là bao lâu?')
    expect(reply.intent).toBe('borrowing')
    expect(reply.text).toContain('5 cuốn')
    expect(reply.text).toContain('14 ngày')
  })

  it('falls back rather than inventing an answer', async () => {
    const reply = await ask('zzzz khong co gi')
    expect(reply.intent).toBe('fallback')
    expect(reply.bookIds).toEqual([])
  })
})
