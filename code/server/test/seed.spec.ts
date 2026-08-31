/**
 * Does the database give back exactly what the seeder put in?
 *
 * This suite is deliberately about *fidelity*, not about features. Every check here
 * guards a way a value can survive a round trip through SQL looking almost right — the
 * failures that a `SELECT` by eye does not catch, and that would otherwise surface much
 * later as a screen showing subtly wrong data.
 *
 * It is also the closest thing this project has to a portability test. Run against
 * PostgreSQL here and against SQL Server on the group's Windows machine (`DB_DIALECT=mssql`),
 * it is the same assertions on both — which is the only way to find out that `varchar`
 * ate the Vietnamese diacritics, or that a `date` came back a day early.
 *
 * Prerequisite: `npm run db:migrate && npm run db:seed`.
 */
import { afterAll, describe, expect, it } from 'vitest'
import { availability, books, libraryStatus, loanHistory, shelfLocations, students } from '@/mocks'
import { buildSearchText, removeDiacritics } from '@/shared/text'
import { asBool, asIsoDate } from '../db/dates.ts'
import { createDb } from '../db/dialect.ts'

const db = createDb()

afterAll(async () => {
  await db.destroy()
})

describe('catalogue', () => {
  it('loads every book', async () => {
    const rows = await db.selectFrom('books').select('id').execute()
    expect(rows).toHaveLength(books.length)
  })

  /**
   * The single most likely dialect failure in this project.
   *
   * SQL Server's `varchar` is a single-byte type under most collations, so "Giải tích 1"
   * comes back as "Gi?i tích 1" — every diacritic replaced by a question mark. Postgres
   * has no such distinction, which means a developer working only on Postgres cannot
   * reproduce it and would ship it. The schema uses `nvarchar` on SQL Server for exactly
   * this reason; this test is what proves the helper was actually applied.
   */
  it('preserves Vietnamese diacritics through the round trip', async () => {
    const source = books.find((b) => b.id === 'giai-tich-1')!
    const row = await db
      .selectFrom('books')
      .selectAll()
      .where('id', '=', 'giai-tich-1')
      .executeTakeFirstOrThrow()

    expect(row.title).toBe('Giải tích 1')
    expect(row.author).toBe(source.author)
    // Not just "some diacritics survived" — the exact string, byte for byte.
    expect(row.title).not.toBe(removeDiacritics(row.title))
  })

  it('stores every field of a book unchanged', async () => {
    const source = books.find((b) => b.id === 'cormen-algorithms')!
    const row = await db
      .selectFrom('books')
      .selectAll()
      .where('id', '=', source.id)
      .executeTakeFirstOrThrow()

    expect({
      id: row.id,
      title: row.title,
      isbn: row.isbn,
      author: row.author,
      subject: row.subject,
      type: row.type,
      coverUrl: row.cover_url ?? undefined,
      spine: row.spine,
      description: row.description,
      shelfCode: row.shelf_code,
      floor: row.floor,
      year: row.year,
      language: row.language,
    }).toEqual(source)
  })

  /**
   * A book with no cover art must come back as absent, not as the string "undefined" or
   * an empty string — `ResultCard` branches on it to draw the document-type placeholder.
   */
  it('keeps a missing cover null rather than empty', async () => {
    const source = books.find((b) => !b.coverUrl)!
    const row = await db
      .selectFrom('books')
      .select('cover_url')
      .where('id', '=', source.id)
      .executeTakeFirstOrThrow()

    expect(row.cover_url).toBeNull()
  })

  /**
   * The column and the query have to fold text the same way, or a reader types a query
   * that matches nothing. Asserting the stored value against a fresh call to
   * `buildSearchText` is what keeps the two definitions from drifting apart.
   */
  it('stores a search_text the shared folding function reproduces', async () => {
    const source = books.find((b) => b.id === 'giai-tich-1')!
    const row = await db
      .selectFrom('books')
      .select('search_text')
      .where('id', '=', source.id)
      .executeTakeFirstOrThrow()

    expect(row.search_text).toBe(
      buildSearchText([source.title, source.author, source.subject]),
    )
  })

  /**
   * The point of the precomputed column: an accent-free query finds an accented title
   * with a plain LIKE — no `unaccent` extension on Postgres, no accent-insensitive
   * collation on SQL Server, nothing for a marker to install.
   */
  it('finds an accented title from an unaccented query', async () => {
    const rows = await db
      .selectFrom('books')
      .select(['id', 'title'])
      .where('search_text', 'like', '%giai tich%')
      .orderBy('title')
      .execute()

    expect(rows.map((r) => r.id)).toContain('giai-tich-1')
  })
})

describe('the map', () => {
  it('gives every book a shelf that exists', async () => {
    const orphans = await db
      .selectFrom('books')
      .leftJoin('shelf_locations', 'shelf_locations.shelf_code', 'books.shelf_code')
      .select('books.id')
      .where('shelf_locations.shelf_code', 'is', null)
      .execute()

    expect(orphans).toEqual([])
  })

  /**
   * Directions are a normalised child table, so their order is a column rather than an
   * array index. "Rẽ phải vào dãy kệ A" before "Đi thẳng khoảng 15m" is a different route
   * — the ordering is the meaning, not presentation.
   */
  it('keeps the walking directions in order', async () => {
    const source = shelfLocations.A3
    const rows = await db
      .selectFrom('shelf_directions')
      .select('text')
      .where('shelf_code', '=', 'A3')
      .orderBy('step_no')
      .execute()

    expect(rows.map((r) => r.text)).toEqual(source.directions)
  })

  it('stores the fractional position along an aisle without rounding it', async () => {
    const source = shelfLocations.A3
    const row = await db
      .selectFrom('shelf_locations')
      .select('along_aisle')
      .where('shelf_code', '=', 'A3')
      .executeTakeFirstOrThrow()

    expect(row.along_aisle).toBeCloseTo(source.alongAisle, 6)
  })
})

describe('availability', () => {
  it('has a row for every book', async () => {
    const rows = await db.selectFrom('availability').select('book_id').execute()
    expect(rows).toHaveLength(Object.keys(availability).length)
  })

  it('carries the copy counts and the due-back label across', async () => {
    const source = availability['lap-trinh-cpp']
    const row = await db
      .selectFrom('availability')
      .selectAll()
      .where('book_id', '=', 'lap-trinh-cpp')
      .executeTakeFirstOrThrow()

    expect(row.copies_total).toBe(source.copiesTotal)
    expect(row.copies_available).toBe(source.copiesAvailable)
    // dd/MM, a label — not an ISO date, and not something to parse.
    expect(row.due_back).toBe(source.dueBack)
  })

  /**
   * The backstop behind the borrow transaction. Checking out runs
   * `UPDATE ... SET copies_available = copies_available - 1 WHERE copies_available > 0`,
   * which is atomic on both engines without `FOR UPDATE` or `WITH (UPDLOCK)`. If that
   * WHERE clause is ever dropped, this constraint is what stops the database lending out
   * a book the library does not have.
   */
  it('refuses to let copies go negative', async () => {
    await expect(
      db
        .updateTable('availability')
        .set({ copies_available: -1 })
        .where('book_id', '=', 'giai-tich-1')
        .execute(),
    ).rejects.toThrow()
  })
})

describe('cards and loans', () => {
  it('loads every card', async () => {
    const rows = await db.selectFrom('students').select('card_code').execute()
    expect(rows).toHaveLength(students.length)
  })

  /**
   * Dates are the other divergence that only shows up with both engines in the room.
   * A bare `date` has no timezone, but `pg` builds a Date at local midnight and `tedious`
   * builds one at UTC midnight — seven hours apart in Vietnam, which is enough to shift
   * the day. Both are configured to hand back a plain ISO string instead; this asserts
   * the value, and the shape it arrives in.
   */
  it('returns dates as ISO day strings, not shifted Dates', async () => {
    const source = students.find((s) => s.cardCode === '20215012')!
    const row = await db
      .selectFrom('students')
      .select('expires_at')
      .where('card_code', '=', '20215012')
      .executeTakeFirstOrThrow()

    expect(asIsoDate(row.expires_at)).toBe(source.expiresAt)
    expect(asIsoDate(row.expires_at)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  /**
   * A slip is a visit; the loans hanging off it are the books that went out on it. The
   * seeded three-book slip is the case Pain 4 is actually about ("nhiều đầu sách cùng
   * lúc"), and it has to survive being split across two tables and joined back.
   */
  it('rebuilds a multi-book slip from its loans', async () => {
    const [slipId] = [
      ...new Set(
        loanHistory
          .filter((l) => l.studentId === '20215012')
          .map((l) => l.slipId),
      ),
    ].filter(
      (id) => loanHistory.filter((l) => l.slipId === id).length > 1,
    )

    const rows = await db
      .selectFrom('loans')
      .select('book_id')
      .where('slip_id', '=', slipId)
      .orderBy('book_id')
      .execute()

    const expected = loanHistory
      .filter((l) => l.slipId === slipId)
      .map((l) => l.bookId)
      .sort()

    expect(rows.map((r) => r.book_id)).toEqual(expected)
  })

  it('keeps an open loan null rather than dated', async () => {
    const open = await db
      .selectFrom('loans')
      .select('id')
      .where('returned_at', 'is', null)
      .execute()

    const expected = loanHistory.filter((l) => l.returnedAt === null)
    expect(open).toHaveLength(expected.length)
  })

  /**
   * The persona's card must keep exactly one open loan. `checkEligibility` blocks a
   * borrow when open + cart > 5, and the kiosk walkthrough scans four books — so a second
   * open loan seeded here would break the self-checkout flow and the tests covering it.
   * The rule is documented in mocks/loanHistory.ts; this is it enforced against the data
   * that actually reached the database.
   */
  it('leaves the persona with room to borrow', async () => {
    const rows = await db
      .selectFrom('loans')
      .select('id')
      .where('card_code', '=', '20215012')
      .where('returned_at', 'is', null)
      .execute()

    expect(rows).toHaveLength(1)
  })
})

describe('library status', () => {
  it('holds exactly one row, with its flag a real boolean', async () => {
    const rows = await db.selectFrom('library_status').selectAll().execute()

    expect(rows).toHaveLength(1)
    // `bit` on SQL Server can surface as 0/1, and 0 is falsy in a way that works right up
    // until someone writes `=== true`.
    expect(asBool(rows[0].is_open)).toBe(libraryStatus.isOpen)
    expect(rows[0].opens_at).toBe(libraryStatus.opensAt)
    expect(rows[0].support_phone).toBe(libraryStatus.supportPhone)
  })
})
