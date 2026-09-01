/**
 * Reading the catalogue — Job 1 / Product-Service 1.
 *
 * Repositories are the boundary where a database row becomes a domain object. Above this
 * line the application sees `Book`, camelCased, exactly the shape the React components
 * already render; below it, snake_case columns. Nothing else in the server is allowed to
 * touch `db` directly, which is what keeps the SQL — and therefore the portability rules
 * — in a small number of reviewable files.
 */
import type { Kysely, Selectable } from 'kysely'
import type { Book, DocumentType, Language } from '@/shared/types'
import { asIsbnQuery, buildSearchText } from '@/shared/text'
import type { BooksTable, DB } from '../db/schema.ts'

/**
 * The string columns are unions in TypeScript and plain strings in SQL — no database has
 * a native "one of these three literals" type that both engines spell the same way.
 * The seeder is the only writer and it writes from the same unions, so the cast is safe;
 * it is narrowed here, once, rather than at every call site.
 */
function toBook(row: Selectable<BooksTable>): Book {
  return {
    id: row.id,
    title: row.title,
    isbn: row.isbn,
    author: row.author,
    subject: row.subject,
    type: row.type as DocumentType,
    // Absent, not null: `Book.coverUrl` is optional, and components branch on falsiness
    // to draw the document-type placeholder.
    coverUrl: row.cover_url ?? undefined,
    spine: row.spine as Book['spine'],
    description: row.description,
    shelfCode: row.shelf_code,
    floor: row.floor,
    year: row.year,
    language: row.language as Language,
  }
}

export async function listBooks(db: Kysely<DB>): Promise<Book[]> {
  const rows = await db.selectFrom('books').selectAll().orderBy('title').execute()
  return rows.map(toBook)
}

/**
 * A named set of books, in the order asked for.
 *
 * The order matters: a loan slip lists the books in the order they were scanned, and a
 * checkout cart in the order they were added. Returning them in whatever order the
 * database felt like would reshuffle a receipt the reader watched being built.
 */
export async function booksByIds(db: Kysely<DB>, ids: string[]): Promise<Book[]> {
  // An empty `IN ()` is a syntax error on SQL Server and an always-false predicate on
  // Postgres. Neither is worth a round trip.
  if (ids.length === 0) return []

  const rows = await db.selectFrom('books').selectAll().where('id', 'in', ids).execute()
  const byId = new Map(rows.map((row) => [row.id, toBook(row)]))
  return ids.map((id) => byId.get(id)).filter((book) => book !== undefined)
}

export async function findBook(db: Kysely<DB>, id: string): Promise<Book | undefined> {
  const row = await db.selectFrom('books').selectAll().where('id', '=', id).executeTakeFirst()
  return row ? toBook(row) : undefined
}

/**
 * Look a book up the way the scanner does: by ISBN, ignoring the spaces and dashes
 * printed on a back cover.
 */
export async function findBookByIsbn(db: Kysely<DB>, code: string): Promise<Book | undefined> {
  const digits = code.replace(/[\s-]/g, '')
  if (!digits) return undefined
  const row = await db.selectFrom('books').selectAll().where('isbn', '=', digits).executeTakeFirst()
  return row ? toBook(row) : undefined
}

/**
 * Free-text match across title, author and subject, diacritic-insensitive — plus the
 * ISBN, which the search field has always claimed to accept.
 *
 * Two things here are the portability design working as intended:
 *
 *   1. The text match is a plain `LIKE` against `search_text`, a column the seeder folded
 *      with the same `buildSearchText` used here. No `unaccent`, no `ILIKE`, no
 *      accent-insensitive collation — nothing either engine has to be configured for.
 *   2. `orderBy` is not decoration. SQL Server's `OFFSET … FETCH` *requires* an ORDER BY,
 *      so every query that could ever be paginated carries one from the start rather than
 *      failing the first time someone adds a limit.
 *
 * The ISBN is matched as a substring rather than exactly, so it narrows as the reader
 * keys the code in and still finds the book from the middle chunk of a number.
 */
export async function searchBooks(db: Kysely<DB>, query: string): Promise<Book[]> {
  const q = query.trim()
  if (!q) return []

  const code = asIsbnQuery(q)
  const folded = buildSearchText([q])

  const rows = await db
    .selectFrom('books')
    .selectAll()
    .where((eb) => {
      const text = eb('search_text', 'like', `%${folded}%`)
      return code === null ? text : eb.or([text, eb('isbn', 'like', `%${code}%`)])
    })
    .orderBy('title')
    .execute()

  return rows.map(toBook)
}

/**
 * Books with at least one copy on the shelf right now.
 *
 * A real catalogue query — "sách còn trên kệ" is the thing the persona asks for most —
 * and also what the kiosk's simulated scanner reads from. A demo that scans a book the
 * library has none of would be refused by the checkout it is meant to demonstrate.
 */
export async function borrowableBooks(db: Kysely<DB>, limit = 20): Promise<Book[]> {
  const rows = await db
    .selectFrom('books')
    .innerJoin('availability', 'availability.book_id', 'books.id')
    .selectAll('books')
    .where('availability.copies_available', '>', 0)
    // SQL Server's OFFSET/FETCH requires an ORDER BY, and a stable one keeps the
    // simulated scanner reading the same books run to run.
    .orderBy('books.title')
    .limit(limit)
    .execute()

  return rows.map(toBook)
}

/** The four books that greet a reader on the kiosk home screen, in curated order. */
export async function suggestedBooks(db: Kysely<DB>): Promise<Book[]> {
  const rows = await db
    .selectFrom('books')
    .selectAll()
    .where('suggested_rank', 'is not', null)
    .orderBy('suggested_rank')
    .execute()
  return rows.map(toBook)
}

/**
 * Popular subjects, surfaced as one-tap shortcuts — Job 1 / Gain Creator 5.
 *
 * Counted from the catalogue rather than listed by hand, because a shortcut that leads to
 * "Không tìm thấy tài liệu nào" is worse than no shortcut at all: the persona taps it
 * precisely when they do not know what to type, so a dead end there strands them.
 */
export async function popularSubjects(db: Kysely<DB>, limit = 6): Promise<string[]> {
  const rows = await db
    .selectFrom('books')
    .select(({ fn }) => ['subject', fn.countAll<number>().as('total')])
    .groupBy('subject')
    // Subject as a tie-break so the list is stable between calls — two subjects with the
    // same count would otherwise swap places depending on how the engine felt.
    .orderBy('total', 'desc')
    .orderBy('subject')
    .limit(limit)
    .execute()

  return rows.map((r) => r.subject)
}

/**
 * The publication years the catalogue actually spans — the bounds of the advanced
 * filter's year slider.
 *
 * The client used to compute these from the whole book list at module load. With the
 * catalogue in a database there is no list to compute from, so the bounds travel with the
 * library status instead. A slider whose ends do not match the data either hides books or
 * offers years nothing was published in.
 */
export async function yearRange(db: Kysely<DB>): Promise<{ min: number; max: number }> {
  const row = await db
    .selectFrom('books')
    .select(({ fn }) => [fn.min<number>('year').as('min'), fn.max<number>('year').as('max')])
    .executeTakeFirstOrThrow()

  return { min: Number(row.min), max: Number(row.max) }
}
