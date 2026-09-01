/**
 * Load `src/mocks/` into the database. `npm run db:seed`.
 *
 * This is where the mock modules earn their second life. They are no longer what the app
 * reads at runtime, but they are still the best catalogue this project has: 116 real
 * bibliographic records resolved against Open Library, with real cover art, curated shelf
 * codes and hand-written Vietnamese descriptions. Re-typing that into SQL would throw all
 * of it away. `npm run catalog` still regenerates them; the seeder just carries the result
 * one stage further.
 *
 * Idempotent by deleting first, inside one transaction. Not `ON CONFLICT DO UPDATE` /
 * `MERGE` — those are spelled differently on the two engines, and the whole point of this
 * codebase is that it does not branch on which database it is talking to.
 */
import {
  availability,
  books,
  libraryStatus,
  loanHistory,
  shelfLocations,
  students,
  suggestedBooks,
} from '@/mocks'
import { buildSearchText } from '@/shared/text'
import { createDb, currentDialect } from './dialect.ts'

const db = createDb()

/**
 * Every shelf a book claims must exist on the map, or the foreign key will refuse the
 * row. Checked up front so the failure names the problem, rather than surfacing as a
 * constraint violation halfway through a 116-row insert.
 */
const missingShelves = [...new Set(books.map((b) => b.shelfCode))].filter(
  (code) => !(code in shelfLocations),
)
if (missingShelves.length > 0) {
  throw new Error(
    `Các kệ sau có sách nhưng không có trên bản đồ: ${missingShelves.join(', ')}.\n` +
      'Chạy lại `npm run catalog:offline` để sinh lại libraryMap.ts.',
  )
}

/** The curated home-screen four, carried into the database as an explicit ordering. */
const suggestedRank = new Map(suggestedBooks.map((b, index) => [b.id, index]))

await db.transaction().execute(async (trx) => {
  // Children first — the reverse of the order they are inserted in below.
  for (const table of [
    'loans',
    'loan_slips',
    'library_status',
    'availability',
    'books',
    'shelf_directions',
    'shelf_locations',
    'students',
  ] as const) {
    await trx.deleteFrom(table).execute()
  }

  const shelves = Object.values(shelfLocations)

  await trx
    .insertInto('shelf_locations')
    .values(
      shelves.map((s) => ({
        shelf_code: s.shelfCode,
        floor: s.floor,
        zone: s.zone,
        aisle: s.aisle,
        along_aisle: s.alongAisle,
        distance_metres: s.distanceMetres,
      })),
    )
    .execute()

  await trx
    .insertInto('shelf_directions')
    .values(
      shelves.flatMap((s) =>
        s.directions.map((text, index) => ({
          shelf_code: s.shelfCode,
          step_no: index,
          text,
        })),
      ),
    )
    .execute()

  await trx
    .insertInto('books')
    .values(
      books.map((b) => ({
        id: b.id,
        title: b.title,
        isbn: b.isbn,
        author: b.author,
        subject: b.subject,
        type: b.type,
        cover_url: b.coverUrl ?? null,
        spine: b.spine,
        description: b.description,
        shelf_code: b.shelfCode,
        floor: b.floor,
        year: b.year,
        language: b.language,
        /*
         * Folded here, once, with the same function the search endpoint will fold the
         * reader's query with. The fields are title + author + subject because those are
         * exactly the three `searchCatalog` matched on — the ISBN is matched separately,
         * as a code, against its own column.
         */
        search_text: buildSearchText([b.title, b.author, b.subject]),
        // The curated four, in the order they are listed — see the migration.
        suggested_rank: suggestedRank.get(b.id) ?? null,
      })),
    )
    .execute()

  await trx
    .insertInto('availability')
    .values(
      books.map((b) => {
        const record = availability[b.id]
        if (!record) throw new Error(`Sách "${b.id}" không có bản ghi availability.`)
        return {
          book_id: b.id,
          status: record.status,
          copies_total: record.copiesTotal,
          copies_available: record.copiesAvailable,
          due_back: record.dueBack ?? null,
        }
      }),
    )
    .execute()

  await trx
    .insertInto('students')
    .values(
      students.map((s) => ({
        card_code: s.cardCode,
        name: s.name,
        student_id: s.studentId,
        faculty: s.faculty,
        expires_at: s.expiresAt,
      })),
    )
    .execute()

  /*
   * `loanHistory` is a flat list of book-level rows that already carry the slip they went
   * out on. The database splits that back into the two tables it always was: one row per
   * visit, and one row per book on that visit.
   *
   * The dates on a slip come from its first loan row. They agree by construction — the
   * mock builds every row of a slip from the same pair of dates — but reading them from
   * the row rather than recomputing them keeps the seeder a transcription rather than a
   * second opinion.
   */
  const slips = new Map<string, { cardCode: string; borrowedAt: string; dueAt: string }>()
  for (const loan of loanHistory) {
    if (!slips.has(loan.slipId)) {
      slips.set(loan.slipId, {
        cardCode: loan.studentId,
        borrowedAt: loan.borrowedAt,
        dueAt: loan.dueAt,
      })
    }
  }

  const now = new Date().toISOString()
  await trx
    .insertInto('loan_slips')
    .values(
      [...slips].map(([id, slip]) => ({
        id,
        card_code: slip.cardCode,
        borrowed_at: slip.borrowedAt,
        due_at: slip.dueAt,
        created_at: now,
      })),
    )
    .execute()

  await trx
    .insertInto('loans')
    .values(
      loanHistory.map((l) => ({
        // Generated, not auto-incremented — see schema.ts. A book appears at most once
        // per slip, so the pair is already unique.
        id: `${l.slipId}::${l.bookId}`,
        slip_id: l.slipId,
        card_code: l.studentId,
        book_id: l.bookId,
        borrowed_at: l.borrowedAt,
        due_at: l.dueAt,
        returned_at: l.returnedAt,
      })),
    )
    .execute()

  await trx
    .insertInto('library_status')
    .values({
      id: 1,
      is_open: libraryStatus.isOpen,
      opens_at: libraryStatus.opensAt,
      closes_at: libraryStatus.closesAt,
      titles_total: libraryStatus.titlesTotal,
      titles_available: libraryStatus.titlesAvailable,
      support_phone: libraryStatus.supportPhone,
    })
    .execute()
})

const counts = {
  kệ: Object.keys(shelfLocations).length,
  sách: books.length,
  thẻ: students.length,
  'khoản mượn': loanHistory.length,
}

await db.destroy()

console.log(`Đã seed vào ${currentDialect()}:`)
for (const [label, count] of Object.entries(counts)) {
  console.log(`  ${String(count).padStart(4)} ${label}`)
}
