/**
 * Dates in, dates out — the one place the two drivers' disagreement is settled.
 *
 * A SQL `date` has no time and no timezone: `2026-08-31` is a day, not an instant. Both
 * drivers nevertheless hand it back as a JavaScript `Date`, and they pick *different*
 * instants to represent it:
 *
 *   - `pg` parses it in the process's local zone   -> 2026-08-31T00:00+07:00
 *   - `tedious` parses it as UTC                   -> 2026-08-31T00:00Z
 *
 * In Vietnam (UTC+7) those are seven hours apart, which is enough for
 * `date.toISOString().slice(0, 10)` to return *different days* on the two engines for the
 * same stored row. A due date that reads "quá hạn" on one database and "còn 1 ngày" on
 * the other is exactly the class of bug that cannot be found on a machine where only one
 * of the two is installed.
 *
 * So no `Date` ever leaves this layer. Postgres is told not to build one in the first
 * place (a type parser, in dialect.ts); SQL Server rows go through `asIsoDate` in the
 * repositories. The rest of the application keeps treating dates the way it already does:
 * `'YYYY-MM-DD'` strings, compared with `<` and sorted with `localeCompare`.
 */

/**
 * A `date` column's value as an ISO day string, whatever the driver handed us.
 *
 * The `Date` branch reads UTC fields deliberately — it only ever runs for tedious, which
 * builds the Date at UTC midnight. Reading local fields there would shift the day back.
 */
export function asIsoDate(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 10)

  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Same, for a column that may be null (`loans.returned_at`). */
export function asIsoDateOrNull(value: string | Date | null): string | null {
  return value === null ? null : asIsoDate(value)
}

/**
 * SQL Server's `bit` arrives as a boolean from tedious and Postgres' `boolean` arrives as
 * a boolean from pg — but a `bit` read through some paths surfaces as 0/1, and `0` is
 * falsy in a way that silently works right up until someone writes `=== true`.
 */
export function asBool(value: boolean | number): boolean {
  return typeof value === 'boolean' ? value : value !== 0
}
