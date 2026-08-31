/**
 * Column types, per dialect — the only place a migration is allowed to know which
 * database it is building.
 *
 * Every entry here exists because the two engines genuinely spell the same idea
 * differently. Anything they *agree* on (`integer`, `date`) is written literally in the
 * migration; putting it through a helper would only suggest a difference that isn't there.
 *
 * The one that matters most for this project is `str`/`text`: SQL Server's `varchar` is
 * a single-byte type under most collations, so "Giải tích 1" comes back as "Gi?i tích 1".
 * Vietnamese needs `nvarchar` — and since Postgres has no such distinction, forgetting it
 * is a bug that cannot be reproduced on the machine this was developed on.
 */
import { sql } from 'kysely'
import type { DialectName } from '../env.ts'

export interface ColumnTypes {
  /** Bounded Unicode string. */
  str: (length: number) => ReturnType<typeof sql.raw>
  /** Unbounded Unicode string, for descriptions and directions. */
  text: () => ReturnType<typeof sql.raw>
  bool: () => ReturnType<typeof sql.raw>
  /** Fractional position along an aisle — no money here, so binary float is fine. */
  real: () => ReturnType<typeof sql.raw>
  /** Timestamp, for audit columns only. Domain dates are `date`. */
  timestamp: () => ReturnType<typeof sql.raw>
}

export function columnTypes(dialect: DialectName): ColumnTypes {
  const mssql = dialect === 'mssql'
  return {
    str: (length) => sql.raw(mssql ? `nvarchar(${length})` : `varchar(${length})`),
    text: () => sql.raw(mssql ? 'nvarchar(max)' : 'text'),
    bool: () => sql.raw(mssql ? 'bit' : 'boolean'),
    real: () => sql.raw(mssql ? 'float' : 'double precision'),
    timestamp: () => sql.raw(mssql ? 'datetime2' : 'timestamptz'),
  }
}
