/**
 * Configuration, validated once at startup.
 *
 * `DB_DIALECT` is the switch the whole dual-database requirement hangs on: one codebase,
 * one schema, one set of queries, and this variable decides whether they run against
 * PostgreSQL or SQL Server. Nothing else in the app is allowed to ask which database it
 * is talking to — see server/db/dialect.ts.
 *
 * Validated with zod rather than read ad hoc, because the failure mode for a missing
 * connection string is otherwise a driver error thrown from somewhere deep in a query,
 * minutes after the process started.
 */
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

/*
 * `fileURLToPath`, not `new URL(...).pathname`. On Windows the latter yields
 * "/C:/Users/..." — a leading slash that makes the path invalid, so dotenv silently finds
 * no file and every variable comes back undefined. This project's SQL Server half runs on
 * Windows, so that is not a hypothetical platform.
 */
config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })

export type DialectName = 'postgres' | 'mssql'

const schema = z
  .object({
    DB_DIALECT: z.enum(['postgres', 'mssql']).default('postgres'),
    PORT: z.coerce.number().int().positive().default(3001),

    // PostgreSQL — one URL, the way every pg tool takes it.
    DATABASE_URL: z.string().optional(),

    // SQL Server — tedious takes discrete fields, not a URL, so these are separate.
    MSSQL_HOST: z.string().optional(),
    MSSQL_PORT: z.coerce.number().int().positive().default(1433),
    MSSQL_USER: z.string().optional(),
    MSSQL_PASSWORD: z.string().optional(),
    MSSQL_DATABASE: z.string().optional(),
    /** Local SQL Server installs usually have a self-signed certificate. */
    MSSQL_TRUST_CERT: z
      .string()
      .default('true')
      .transform((v) => v !== 'false'),
  })
  .superRefine((env, ctx) => {
    // Checked here rather than at connection time: "which variables does this dialect
    // need" is configuration, and configuration errors should surface before anything
    // else happens.
    if (env.DB_DIALECT === 'postgres' && !env.DATABASE_URL) {
      ctx.addIssue({ code: 'custom', message: 'DB_DIALECT=postgres cần DATABASE_URL' })
    }
    if (env.DB_DIALECT === 'mssql') {
      const missing = (['MSSQL_HOST', 'MSSQL_USER', 'MSSQL_PASSWORD', 'MSSQL_DATABASE'] as const)
        .filter((key) => !env[key])
      if (missing.length > 0) {
        ctx.addIssue({ code: 'custom', message: `DB_DIALECT=mssql cần ${missing.join(', ')}` })
      }
    }
  })

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.message}`).join('\n')
  throw new Error(`Cấu hình không hợp lệ (code/.env):\n${lines}\n\nXem code/.env.example.`)
}

export const env = parsed.data
