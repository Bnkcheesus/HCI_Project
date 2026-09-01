/**
 * The floor map — Product-Service 2 / Gain Creator 2.
 *
 * Directions live in their own table, one row per step, so reassembling a shelf means a
 * join and a group. That is the price of storing an ordered list portably: Postgres has
 * arrays and SQL Server does not, and a delimited string in a single column would make
 * "Đi thẳng khoảng 15m, rẽ phải" ambiguous the first time a step contains a comma.
 */
import type { Kysely } from 'kysely'
import type { ShelfLocation } from '@/shared/types'
import type { DB } from '../db/schema.ts'

interface ShelfRow {
  shelf_code: string
  floor: number
  zone: string
  aisle: number
  along_aisle: number
  distance_metres: number
}

function toShelf(row: ShelfRow, directions: string[]): ShelfLocation {
  return {
    shelfCode: row.shelf_code,
    floor: row.floor,
    zone: row.zone,
    aisle: row.aisle,
    // `double precision` comes back as a number on pg and as a number on tedious, but a
    // driver that ever hands it over as a string would silently break the map's geometry.
    alongAisle: Number(row.along_aisle),
    distanceMetres: row.distance_metres,
    directions,
  }
}

export async function findShelf(
  db: Kysely<DB>,
  shelfCode: string,
): Promise<ShelfLocation | undefined> {
  const row = await db
    .selectFrom('shelf_locations')
    .selectAll()
    .where('shelf_code', '=', shelfCode)
    .executeTakeFirst()
  if (!row) return undefined

  // Ordered by step_no, because the order *is* the route — "rẽ phải" before "đi thẳng"
  // is a different set of directions, not the same ones shuffled.
  const steps = await db
    .selectFrom('shelf_directions')
    .select('text')
    .where('shelf_code', '=', shelfCode)
    .orderBy('step_no')
    .execute()

  return toShelf(row, steps.map((s) => s.text))
}

/** A named set of shelves, keyed by code — the places a set of books sits in. */
export async function shelvesByCodes(
  db: Kysely<DB>,
  codes: string[],
): Promise<Record<string, ShelfLocation>> {
  if (codes.length === 0) return {}
  const all = await allShelves(db)
  return Object.fromEntries(
    codes.filter((code) => all[code] !== undefined).map((code) => [code, all[code]]),
  )
}

/**
 * Every shelf, keyed by code — the shape the map component and the librarian both index
 * into. Two queries rather than a join: 116 shelves and ~350 direction rows is small
 * enough that grouping in TypeScript is clearer than a join whose duplicate parent
 * columns then have to be de-duplicated anyway.
 */
export async function allShelves(db: Kysely<DB>): Promise<Record<string, ShelfLocation>> {
  const [rows, steps] = await Promise.all([
    db.selectFrom('shelf_locations').selectAll().orderBy('shelf_code').execute(),
    db.selectFrom('shelf_directions').selectAll().orderBy('step_no').execute(),
  ])

  const byShelf = new Map<string, string[]>()
  for (const step of steps) {
    const list = byShelf.get(step.shelf_code)
    if (list) list.push(step.text)
    else byShelf.set(step.shelf_code, [step.text])
  }

  return Object.fromEntries(
    rows.map((row) => [row.shelf_code, toShelf(row, byShelf.get(row.shelf_code) ?? [])]),
  )
}
