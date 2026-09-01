/**
 * Copy counts — Pain Reliever 2 / Gain Creator 4 ("tình trạng khả dụng theo thời gian
 * thực").
 *
 * This is the one part of a catalogue record that actually moves. The bibliographic row
 * is written once by the seeder; these numbers change every time someone borrows, which
 * is why they live in their own table and their own repository.
 */
import type { Kysely, Selectable } from 'kysely'
import type { Availability, AvailabilityStatus } from '@/shared/types'
import type { AvailabilityTable, DB } from '../db/schema.ts'

function toAvailability(row: Selectable<AvailabilityTable>): Availability {
  return {
    bookId: row.book_id,
    status: row.status as AvailabilityStatus,
    copiesTotal: row.copies_total,
    copiesAvailable: row.copies_available,
    // Absent rather than null — `Availability.dueBack` is optional, and the card branches
    // on falsiness to decide between "Chờ trả: 25/11" and "Chưa có lịch trả".
    dueBack: row.due_back ?? undefined,
  }
}

/**
 * Keyed by book id, the shape every screen already indexes into
 * (`availability[book.id]?.copiesAvailable`). Returning a map rather than a list keeps
 * the components unchanged when they stop importing the mock.
 */
export async function availabilityFor(
  db: Kysely<DB>,
  bookIds: string[],
): Promise<Record<string, Availability>> {
  // An empty `IN ()` is a syntax error on SQL Server and an always-false predicate on
  // Postgres. Neither is worth a round trip.
  if (bookIds.length === 0) return {}

  const rows = await db
    .selectFrom('availability')
    .selectAll()
    .where('book_id', 'in', bookIds)
    .execute()

  return Object.fromEntries(rows.map((row) => [row.book_id, toAvailability(row)]))
}

export async function findAvailability(
  db: Kysely<DB>,
  bookId: string,
): Promise<Availability | undefined> {
  const row = await db
    .selectFrom('availability')
    .selectAll()
    .where('book_id', '=', bookId)
    .executeTakeFirst()
  return row ? toAvailability(row) : undefined
}

/** Every row — for the librarian, which reasons over the whole collection at once. */
export async function allAvailability(db: Kysely<DB>): Promise<Record<string, Availability>> {
  const rows = await db.selectFrom('availability').selectAll().execute()
  return Object.fromEntries(rows.map((row) => [row.book_id, toAvailability(row)]))
}

/** How many titles currently have at least one copy on the shelf. */
export async function titlesAvailable(db: Kysely<DB>): Promise<number> {
  const row = await db
    .selectFrom('availability')
    .select(({ fn }) => fn.countAll<number>().as('total'))
    .where('copies_available', '>', 0)
    .executeTakeFirstOrThrow()
  return Number(row.total)
}
