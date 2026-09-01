/**
 * Library-wide facts: hours, collection size, the subject shortcuts, and the year range.
 *
 * These arrive together because they are all "things the app needs to know before it can
 * draw anything", and all four used to be module-level constants the client computed from
 * the catalogue at import time. With the catalogue in a database there is nothing to
 * compute from, so they travel as one response the app fetches once.
 */
import type { FastifyInstance } from 'fastify'
import type { Kysely } from 'kysely'
import type { DB } from '../db/schema.ts'
import { popularSubjects, yearRange } from '../repos/books.ts'
import { libraryStatus } from '../repos/status.ts'

export function registerLibraryRoutes(app: FastifyInstance, db: Kysely<DB>): void {
  app.get('/api/library/status', async () => {
    const [status, subjects, years] = await Promise.all([
      libraryStatus(db),
      popularSubjects(db),
      yearRange(db),
    ])

    return {
      status,
      popularSubjects: subjects,
      // The bounds of the advanced filter's year slider. Ends that do not match the data
      // either hide books or offer years nothing was published in.
      yearMin: years.min,
      yearMax: years.max,
    }
  })
}
