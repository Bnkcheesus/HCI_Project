/**
 * The HTTP surface.
 *
 * `buildApp` takes the database rather than creating one, so tests can hand it a
 * connection and drive every route through `app.inject()` — Fastify's in-process request
 * dispatch. No port, no fetch, no waiting for a server to come up, and the assertions are
 * about real routing and real SQL rather than about a mocked handler.
 */
import Fastify, { type FastifyInstance } from 'fastify'
import type { Kysely } from 'kysely'
import type { DB } from './db/schema.ts'
import { registerAccountRoutes } from './routes/accounts.ts'
import { registerBookRoutes } from './routes/books.ts'
import { registerLibrarianRoutes } from './routes/librarian.ts'
import { registerLibraryRoutes } from './routes/library.ts'
import { registerLoanRoutes } from './routes/loans.ts'
import { registerStudentRoutes } from './routes/students.ts'

export function buildApp(db: Kysely<DB>): FastifyInstance {
  const app = Fastify({ logger: false })

  app.get('/api/health', async () => ({ ok: true }))

  registerBookRoutes(app, db)
  registerLibraryRoutes(app, db)
  registerStudentRoutes(app, db)
  registerLoanRoutes(app, db)
  registerAccountRoutes(app, db)
  registerLibrarianRoutes(app, db)

  return app
}
