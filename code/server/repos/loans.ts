/**
 * Cards and what they have out — Job 3 / Job 4, Pain Reliever 3 / Pain Reliever 4.
 *
 * Every date leaving this file is an ISO day string, put through `asIsoDate`. That is not
 * defensive habit: `pg` builds a `Date` at local midnight for a `date` column and
 * `tedious` builds one at UTC midnight, so the same stored row yields different days on
 * the two engines. See server/db/dates.ts.
 */
import type { Kysely } from 'kysely'
import type { AccountSlip, LoanRecord, Student } from '@/shared/types'
import { asIsoDate, asIsoDateOrNull } from '../db/dates.ts'
import type { DB } from '../db/schema.ts'

export async function findStudent(
  db: Kysely<DB>,
  cardCode: string,
): Promise<Student | undefined> {
  const row = await db
    .selectFrom('students')
    .selectAll()
    .where('card_code', '=', cardCode.trim())
    .executeTakeFirst()

  if (!row) return undefined
  return {
    cardCode: row.card_code,
    name: row.name,
    studentId: row.student_id,
    faculty: row.faculty,
    expiresAt: asIsoDate(row.expires_at),
  }
}

/**
 * Loans a card still has out — the ones that count against the borrowing limit.
 *
 * This is the query behind every card scan at the kiosk, which is why `loans` carries an
 * index on (card_code, returned_at).
 */
export async function openLoansFor(db: Kysely<DB>, cardCode: string): Promise<LoanRecord[]> {
  const rows = await db
    .selectFrom('loans')
    .selectAll()
    .where('card_code', '=', cardCode)
    .where('returned_at', 'is', null)
    .orderBy('due_at')
    .execute()

  return rows.map((row) => ({
    id: row.id,
    slipId: row.slip_id,
    studentId: row.card_code,
    bookId: row.book_id,
    borrowedAt: asIsoDate(row.borrowed_at),
    dueAt: asIsoDate(row.due_at),
    returnedAt: asIsoDateOrNull(row.returned_at),
  }))
}

/**
 * Everything a card has ever borrowed, grouped into slips — Job 4 / Pain 4.
 *
 * A slip is what the reader is actually shown: borrow date and due date at the top, the
 * books that went out together beneath. The kiosk lends up to five books at once and
 * Pain 4 is explicitly about "nhiều đầu sách cùng lúc", so a flat list of loans would
 * render the same two dates five times over.
 *
 * `source` used to distinguish seeded history from slips the kiosk had filed into
 * localStorage during the session. With a real database there is only one source, and
 * every slip is equally real — the field stays because the mobile card still labels a
 * slip the reader watched being printed differently from one they are seeing for the
 * first time.
 */
export async function accountSlips(db: Kysely<DB>, cardCode: string): Promise<AccountSlip[]> {
  const rows = await db
    .selectFrom('loan_slips')
    .innerJoin('loans', 'loans.slip_id', 'loan_slips.id')
    .select([
      'loan_slips.id as id',
      'loan_slips.borrowed_at as borrowed_at',
      'loan_slips.due_at as due_at',
      'loans.book_id as book_id',
      'loans.returned_at as returned_at',
    ])
    .where('loan_slips.card_code', '=', cardCode)
    // Newest first, and the books within a slip in a stable order — without the second
    // key the same slip could list its books differently between two requests.
    .orderBy('loan_slips.borrowed_at', 'desc')
    .orderBy('loan_slips.id')
    .orderBy('loans.book_id')
    .execute()

  const slips = new Map<string, AccountSlip>()
  for (const row of rows) {
    const book = { bookId: row.book_id, returnedAt: asIsoDateOrNull(row.returned_at) }
    const existing = slips.get(row.id)
    if (existing) {
      existing.books.push(book)
      continue
    }
    slips.set(row.id, {
      id: row.id,
      borrowedAt: asIsoDate(row.borrowed_at),
      dueAt: asIsoDate(row.due_at),
      books: [book],
      source: 'history',
    })
  }

  return [...slips.values()]
}

/** One slip, for a QR code or a link that names it. */
export async function findSlip(db: Kysely<DB>, slipId: string): Promise<AccountSlip | undefined> {
  const slip = await db
    .selectFrom('loan_slips')
    .selectAll()
    .where('id', '=', slipId)
    .executeTakeFirst()
  if (!slip) return undefined

  const books = await db
    .selectFrom('loans')
    .select(['book_id', 'returned_at'])
    .where('slip_id', '=', slipId)
    .orderBy('book_id')
    .execute()

  return {
    id: slip.id,
    borrowedAt: asIsoDate(slip.borrowed_at),
    dueAt: asIsoDate(slip.due_at),
    books: books.map((b) => ({ bookId: b.book_id, returnedAt: asIsoDateOrNull(b.returned_at) })),
    source: 'history',
  }
}
