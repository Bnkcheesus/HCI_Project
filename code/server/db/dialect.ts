/**
 * The database connection — and the only module in the application that knows which
 * database it is.
 *
 * Everything above this file writes one set of queries against `Kysely<DB>`. Whether
 * those compile to PostgreSQL or SQL Server is decided here, from `DB_DIALECT`, once.
 * That is the whole reason the project uses Kysely rather than Prisma: Prisma's
 * `provider` is a literal inside `schema.prisma` and cannot be read from the environment,
 * so supporting both engines would mean maintaining two schema files that are free to
 * drift apart.
 *
 * Keeping the knowledge here is also what makes the portability rules checkable. If a
 * second file starts branching on the dialect, the rules stop being "the queries are
 * portable" and become "the queries are portable in the places we remembered".
 */
import { Kysely, MssqlDialect, PostgresDialect } from 'kysely'
import * as tarn from 'tarn'
import * as tedious from 'tedious'
import pg from 'pg'
import { env, type DialectName } from '../env.ts'
import type { DB } from './schema.ts'

/**
 * Postgres hands back `date` columns as raw strings instead of building a `Date`.
 *
 * OID 1082 is `date`. Without this, `pg` parses the day in the process's local timezone
 * and tedious parses it as UTC, and the same stored row yields different days on the two
 * engines. See server/db/dates.ts — this is that fix, applied at the driver so no
 * repository can forget it.
 */
pg.types.setTypeParser(1082, (value: string) => value)

/**
 * `numeric` (OID 1700) also arrives as a string, because it can hold values a JS number
 * cannot. Nothing in this schema uses it — `along_aisle` is `double precision` — but the
 * parser is left alone deliberately rather than "fixed" into a number.
 */

export function currentDialect(): DialectName {
  return env.DB_DIALECT
}

export function createDb(): Kysely<DB> {
  return new Kysely<DB>({ dialect: env.DB_DIALECT === 'mssql' ? mssql() : postgres() })
}

function postgres(): PostgresDialect {
  return new PostgresDialect({
    pool: new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 }),
  })
}

function mssql(): MssqlDialect {
  return new MssqlDialect({
    tarn: { ...tarn, options: { min: 0, max: 10 } },
    tedious: {
      ...tedious,
      connectionFactory: () =>
        new tedious.Connection({
          server: env.MSSQL_HOST!,
          options: {
            /*
             * A named instance resolves its own port, so the two settings are mutually
             * exclusive in tedious — passing both makes the connection fail. SQL Server
             * Express installs as `localhost\SQLEXPRESS` on a *dynamic* port rather than
             * 1433, so without `MSSQL_INSTANCE` a default Express install just times out.
             */
            ...(env.MSSQL_INSTANCE
              ? { instanceName: env.MSSQL_INSTANCE }
              : { port: env.MSSQL_PORT }),
            database: env.MSSQL_DATABASE!,
            trustServerCertificate: env.MSSQL_TRUST_CERT,
            // Without this tedious returns `date` columns as local-midnight Dates on some
            // versions and UTC on others; asIsoDate() normalises either, but pinning the
            // driver to UTC keeps the two consistent in the first place.
            useUTC: true,
          },
          authentication: {
            type: 'default',
            options: { userName: env.MSSQL_USER!, password: env.MSSQL_PASSWORD! },
          },
        }),
    },
  })
}
