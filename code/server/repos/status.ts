/**
 * Library-wide status — opening hours and collection size.
 *
 * Reinforces Gain Creator 4 at the whole-collection level, and gives the persona the
 * opening-hours context they need when squeezing a visit between classes (scenario.md:
 * "chỉ có 15 phút").
 */
import type { Kysely } from 'kysely'
import type { LibraryStatus } from '@/shared/types'
import { asBool } from '../db/dates.ts'
import type { DB } from '../db/schema.ts'
import { titlesAvailable } from './availability.ts'

export async function libraryStatus(db: Kysely<DB>): Promise<LibraryStatus> {
  const row = await db.selectFrom('library_status').selectAll().where('id', '=', 1).executeTakeFirstOrThrow()

  /*
   * `titles_available` is counted live rather than read from its column.
   *
   * The seeded value is a snapshot, and the footer that shows it sits on the same screen
   * as the availability chips — a reader who borrows the last copy of something and then
   * sees the total unchanged has caught the app telling two different stories about the
   * same collection. Gain Creator 4 is "theo thời gian thực"; this is the cheapest place
   * that promise can be kept honestly.
   */
  return {
    // `bit` on SQL Server can surface as 0/1, and 0 is falsy in a way that works until
    // someone writes `=== true`.
    isOpen: asBool(row.is_open),
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    titlesTotal: row.titles_total,
    titlesAvailable: await titlesAvailable(db),
    supportPhone: row.support_phone,
  }
}
