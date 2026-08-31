import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Server tests, kept in their own config and their own npm script.
 *
 * Separate from `npm run test` because the prerequisites are genuinely different: the
 * frontend suite runs anywhere, while these need a migrated, seeded database on the other
 * end of `DATABASE_URL`. Folding them together would mean the whole suite goes red on a
 * machine that simply has not started Postgres yet, and a test run that fails for
 * environmental reasons quickly stops being read at all.
 *
 * Node environment, not jsdom: there is no DOM here, and jsdom's globals would only
 * disguise a server file accidentally reaching for one.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['server/**/*.spec.ts'],
    // The integration tests share one database; running files in parallel would have them
    // seeding and borrowing over each other.
    fileParallelism: false,
  },
})
