/**
 * Catalogue endpoints — Job 1 / Job 2, Product-Service 1 / 2.
 *
 * Every response that carries books carries their availability alongside. That pairing is
 * not convenience: the availability chip is on the same card as the title, and the
 * advanced filter's "Còn sách / Hết sách" facet needs copy counts to filter at all. Two
 * separate requests would let a results screen render a stale chip next to a fresh title,
 * which is precisely the "phải đến tận kệ mới biết" pain the chip exists to remove.
 *
 * Filtering, sorting and pagination stay on the client. They are pure functions with
 * tests already (`src/lib/search.ts`), the catalogue is 116 titles, and pushing them down
 * into SQL would buy nothing but churn. The server's job here is to *find*; narrowing is
 * the reader's, and it happens without a round trip.
 */
import type { FastifyInstance } from 'fastify'
import type { Kysely } from 'kysely'
import type { DB } from '../db/schema.ts'
import { availabilityFor, findAvailability } from '../repos/availability.ts'
import {
  booksByIds,
  borrowableBooks,
  findBook,
  findBookByIsbn,
  searchBooks,
  suggestedBooks,
} from '../repos/books.ts'
import { findShelf, shelvesByCodes } from '../repos/shelves.ts'

export function registerBookRoutes(app: FastifyInstance, db: Kysely<DB>): void {
  /**
   * Search. An empty query returns nothing rather than the whole catalogue — the results
   * screen shows its empty state, and 116 books is not an answer to a question nobody
   * asked.
   */
  app.get<{ Querystring: { q?: string } }>('/api/books', async (request) => {
    const books = await searchBooks(db, request.query.q ?? '')
    return { books, availability: await availabilityFor(db, books.map((b) => b.id)) }
  })

  /**
   * A named set of books — what a loan slip or a checkout cart holds: ids, not titles.
   *
   * Registered before `/api/books/:id` so the literal segment is unambiguous, and one
   * request rather than one per book: a five-book slip would otherwise open five
   * connections to render one card.
   */
  app.get<{ Querystring: { ids?: string } }>('/api/books/by-ids', async (request) => {
    const ids = parseIds(request.query.ids)
    const books = await booksByIds(db, ids)

    /*
     * Shelves come too, keyed by code. The AI chat collapses a list of suggested books
     * into a list of *places* to walk to — "three of these are on A3" — which needs the
     * zone and floor behind each shelf code, not just the code itself.
     */
    const codes = [...new Set(books.map((b) => b.shelfCode))]
    const [availability, shelves] = await Promise.all([
      availabilityFor(db, books.map((b) => b.id)),
      shelvesByCodes(db, codes),
    ])

    return { books, availability, shelves }
  })

  /** Books with a copy on the shelf — Pain Reliever 2, and what the demo scanner reads. */
  app.get<{ Querystring: { limit?: string } }>('/api/books/borrowable', async (request) => {
    const limit = Math.min(Math.max(Number(request.query.limit ?? 20) || 20, 1), 50)
    const books = await borrowableBooks(db, limit)
    return { books, availability: await availabilityFor(db, books.map((b) => b.id)) }
  })

  /** The four curated books on the kiosk home screen — Gain Creator 1. */
  app.get('/api/books/suggested', async () => {
    const books = await suggestedBooks(db)
    return { books, availability: await availabilityFor(db, books.map((b) => b.id)) }
  })

  /**
   * Lookup by ISBN, for the self-checkout scanner and the phone's manual-entry fallback.
   *
   * Registered before `/api/books/:id` matters less in Fastify than in path-order
   * routers, but the literal segment is spelled out to keep the two unambiguous for a
   * reader as well as for the router.
   */
  app.get<{ Params: { isbn: string } }>('/api/books/by-isbn/:isbn', async (request, reply) => {
    const book = await findBookByIsbn(db, request.params.isbn)
    if (!book) return reply.code(404).send({ error: 'not-found' })
    return { book, availability: await findAvailability(db, book.id) }
  })

  /**
   * One book, with everything the detail screen needs: copy counts and the route to the
   * shelf. Three round trips collapsed into one, because this screen is where the reader
   * decides whether to walk across the building — and a page that fills in one fact at a
   * time is the page they give up on.
   */
  app.get<{ Params: { id: string } }>('/api/books/:id', async (request, reply) => {
    const book = await findBook(db, request.params.id)
    if (!book) return reply.code(404).send({ error: 'not-found' })

    const [availability, shelf] = await Promise.all([
      findAvailability(db, book.id),
      findShelf(db, book.shelfCode),
    ])
    return { book, availability, shelf }
  })

  /**
   * Copy counts for a known set of books, without re-fetching the books themselves.
   *
   * This is what makes "theo thời gian thực" affordable: a screen already holding a list
   * can refresh just the numbers that move.
   */
  app.get<{ Querystring: { ids?: string } }>('/api/availability', async (request) => {
    return availabilityFor(db, parseIds(request.query.ids))
  })
}

/** `?ids=a,b,c` — tolerant of stray whitespace and of the parameter being absent. */
function parseIds(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}
