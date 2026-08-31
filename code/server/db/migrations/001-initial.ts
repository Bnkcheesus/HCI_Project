/**
 * The whole schema, in one migration.
 *
 * One file rather than a chain of them because there is no deployed database to evolve
 * from — this is the first one. Later changes get their own numbered file.
 *
 * Written once and run against both engines. What makes that possible is that the schema
 * deliberately avoids every construct the two spell differently: no identity columns, no
 * database-generated defaults that need `RETURNING`/`OUTPUT` to read back, no extensions,
 * no collation settings. The remaining differences — Unicode strings, booleans, floats —
 * go through `columnTypes()`.
 */
import { sql, type Kysely } from 'kysely'
import { columnTypes } from '../columnTypes.ts'
import { currentDialect } from '../dialect.ts'

export async function up(db: Kysely<unknown>): Promise<void> {
  const t = columnTypes(currentDialect())

  // Shelves before books: books reference a shelf, and a foreign key needs its target.
  await db.schema
    .createTable('shelf_locations')
    .addColumn('shelf_code', t.str(16), (c) => c.primaryKey())
    .addColumn('floor', 'integer', (c) => c.notNull())
    .addColumn('zone', t.str(120), (c) => c.notNull())
    .addColumn('aisle', 'integer', (c) => c.notNull())
    .addColumn('along_aisle', t.real(), (c) => c.notNull())
    .addColumn('distance_metres', 'integer', (c) => c.notNull())
    .execute()

  /*
   * The walking directions, one row per step.
   *
   * Stored as rows rather than as a JSON blob or a delimited string: Postgres has arrays
   * and `jsonb`, SQL Server has neither in the same shape, and a normalised child table
   * is the portable answer that also happens to be the correct relational one.
   *
   * `step_no` is part of the key because the order *is* the meaning — "Rẽ phải vào dãy kệ
   * A" before "Đi thẳng khoảng 15m" is a different route.
   */
  await db.schema
    .createTable('shelf_directions')
    .addColumn('shelf_code', t.str(16), (c) =>
      c.notNull().references('shelf_locations.shelf_code').onDelete('cascade'),
    )
    .addColumn('step_no', 'integer', (c) => c.notNull())
    .addColumn('text', t.str(400), (c) => c.notNull())
    .addPrimaryKeyConstraint('shelf_directions_pk', ['shelf_code', 'step_no'])
    .execute()

  await db.schema
    .createTable('books')
    .addColumn('id', t.str(64), (c) => c.primaryKey())
    .addColumn('title', t.str(300), (c) => c.notNull())
    .addColumn('isbn', t.str(20), (c) => c.notNull().unique())
    .addColumn('author', t.str(300), (c) => c.notNull())
    .addColumn('subject', t.str(120), (c) => c.notNull())
    .addColumn('type', t.str(16), (c) => c.notNull())
    .addColumn('cover_url', t.str(300))
    .addColumn('spine', 'integer', (c) => c.notNull())
    .addColumn('description', t.text(), (c) => c.notNull())
    .addColumn('shelf_code', t.str(16), (c) => c.notNull().references('shelf_locations.shelf_code'))
    .addColumn('floor', 'integer', (c) => c.notNull())
    .addColumn('year', 'integer', (c) => c.notNull())
    .addColumn('language', t.str(8), (c) => c.notNull())
    .addColumn('search_text', t.str(700), (c) => c.notNull())
    .execute()

  await db.schema.createIndex('books_subject_idx').on('books').column('subject').execute()

  /*
   * Availability is its own table rather than two columns on `books` because it is the
   * only part of a catalogue record that changes: borrowing decrements it inside a
   * transaction, several times a minute in a busy library, while the bibliographic row is
   * written once by the seeder and never touched again.
   */
  await db.schema
    .createTable('availability')
    .addColumn('book_id', t.str(64), (c) =>
      c.primaryKey().references('books.id').onDelete('cascade'),
    )
    .addColumn('status', t.str(16), (c) => c.notNull())
    .addColumn('copies_total', 'integer', (c) => c.notNull())
    .addColumn('copies_available', 'integer', (c) => c.notNull())
    // dd/MM, a label the reader sees — not an ISO date. See schema.ts.
    .addColumn('due_back', t.str(8))
    /*
     * The guard the borrow transaction relies on.
     *
     * `UPDATE ... SET copies_available = copies_available - 1 WHERE copies_available > 0`
     * is what makes checking out atomic on both engines without `FOR UPDATE` (Postgres)
     * or `WITH (UPDLOCK)` (SQL Server). This constraint is the backstop: if that WHERE
     * clause is ever dropped, the database refuses the write instead of quietly lending
     * out a book the library does not have.
     */
    .addCheckConstraint('availability_copies_non_negative', sql`copies_available >= 0`)
    .execute()

  await db.schema
    .createTable('students')
    .addColumn('card_code', t.str(32), (c) => c.primaryKey())
    .addColumn('name', t.str(120), (c) => c.notNull())
    .addColumn('student_id', t.str(32), (c) => c.notNull())
    .addColumn('faculty', t.str(160), (c) => c.notNull())
    .addColumn('expires_at', 'date', (c) => c.notNull())
    .execute()

  await db.schema
    .createTable('loan_slips')
    .addColumn('id', t.str(40), (c) => c.primaryKey())
    .addColumn('card_code', t.str(32), (c) => c.notNull().references('students.card_code'))
    .addColumn('borrowed_at', 'date', (c) => c.notNull())
    .addColumn('due_at', 'date', (c) => c.notNull())
    .addColumn('created_at', t.timestamp(), (c) => c.notNull())
    .execute()

  await db.schema
    .createIndex('loan_slips_card_idx')
    .on('loan_slips')
    .column('card_code')
    .execute()

  await db.schema
    .createTable('loans')
    .addColumn('id', t.str(120), (c) => c.primaryKey())
    .addColumn('slip_id', t.str(40), (c) => c.notNull().references('loan_slips.id'))
    .addColumn('card_code', t.str(32), (c) => c.notNull().references('students.card_code'))
    .addColumn('book_id', t.str(64), (c) => c.notNull().references('books.id'))
    .addColumn('borrowed_at', 'date', (c) => c.notNull())
    .addColumn('due_at', 'date', (c) => c.notNull())
    .addColumn('returned_at', 'date')
    .execute()

  /*
   * The index behind every eligibility check: "what does this card still have out". It
   * runs on every card scan at the kiosk, so it is the one query that must not degrade
   * as the loan table grows.
   */
  await db.schema
    .createIndex('loans_card_returned_idx')
    .on('loans')
    .columns(['card_code', 'returned_at'])
    .execute()

  await db.schema.createIndex('loans_slip_idx').on('loans').column('slip_id').execute()

  await db.schema
    .createTable('library_status')
    .addColumn('id', 'integer', (c) => c.primaryKey())
    .addColumn('is_open', t.bool(), (c) => c.notNull())
    .addColumn('opens_at', t.str(8), (c) => c.notNull())
    .addColumn('closes_at', t.str(8), (c) => c.notNull())
    .addColumn('titles_total', 'integer', (c) => c.notNull())
    .addColumn('titles_available', 'integer', (c) => c.notNull())
    .addColumn('support_phone', t.str(32), (c) => c.notNull())
    .addCheckConstraint('library_status_single_row', sql`id = 1`)
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  // Reverse creation order — children before the tables they point at.
  for (const table of [
    'library_status',
    'loans',
    'loan_slips',
    'students',
    'availability',
    'books',
    'shelf_directions',
    'shelf_locations',
  ]) {
    await db.schema.dropTable(table).ifExists().execute()
  }
}
