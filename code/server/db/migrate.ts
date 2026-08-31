/**
 * Migration runner. `npm run db:migrate`, or `npm run db:migrate -- --down` to roll back.
 *
 * Migrations are listed explicitly rather than discovered from the filesystem with
 * Kysely's `FileMigrationProvider`. That provider globs a directory and `import()`s what
 * it finds, which needs the files to be loadable as-is — fine for compiled JavaScript,
 * awkward for TypeScript run through tsx, and silently order-dependent on how the
 * directory listing sorts. A literal list is three lines longer and cannot surprise anyone.
 */
// `kysely/migration`, not `kysely` — 0.29 moved the migrator out of the root export.
import { Migrator, type Migration, type MigrationProvider } from 'kysely/migration'
import { createDb, currentDialect } from './dialect.ts'
import * as initial from './migrations/001-initial.ts'

const MIGRATIONS: Record<string, Migration> = {
  '001-initial': initial,
}

const provider: MigrationProvider = {
  getMigrations: async () => MIGRATIONS,
}

const down = process.argv.includes('--down')
const db = createDb()
const migrator = new Migrator({ db, provider })

const { error, results } = down ? await migrator.migrateDown() : await migrator.migrateToLatest()

for (const result of results ?? []) {
  const verb = result.direction === 'Down' ? 'gỡ' : 'chạy'
  if (result.status === 'Success') {
    console.log(`  ✓ ${verb} ${result.migrationName}`)
  } else if (result.status === 'Error') {
    console.error(`  ✗ lỗi khi ${verb} ${result.migrationName}`)
  }
}

await db.destroy()

if (error) {
  console.error('\nMigration thất bại:', error)
  process.exit(1)
}

if ((results ?? []).length === 0) {
  console.log(`Không có migration nào cần chạy (${currentDialect()}).`)
} else {
  console.log(`\nXong — schema trên ${currentDialect()} đã cập nhật.`)
}
