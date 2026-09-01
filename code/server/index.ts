/**
 * Server entry point. `npm run dev:api`, or `npm run dev` to run it alongside Vite.
 *
 * Vite proxies `/api` here (see vite.config.ts), so the browser only ever talks to one
 * origin. That keeps the Playwright verification scripts pointed at :5173 exactly as they
 * were, and means no CORS configuration exists to get wrong.
 */
import { createDb, currentDialect } from './db/dialect.ts'
import { env } from './env.ts'
import { buildApp } from './app.ts'

const db = createDb()
const app = buildApp(db)

// Loopback rather than 0.0.0.0: this is a development API, and binding every interface on
// a university network is not something to do by accident.
await app.listen({ port: env.PORT, host: '127.0.0.1' })
console.log(`API LibAssist đang chạy tại http://127.0.0.1:${env.PORT} (${currentDialect()})`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    // Close the HTTP server first so no request is cut off mid-query, then the pool.
    void app.close().then(() => db.destroy()).then(() => process.exit(0))
  })
}
