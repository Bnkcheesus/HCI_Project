/**
 * The AI librarian — Gain Creator 1 / Product-Service 1, behind the kiosk-ai-chat screen.
 *
 * The matching engine is `@/shared/librarian`, unchanged from the version that ran in the
 * browser. All this route does is assemble the corpus it reasons over out of SQL. That is
 * the whole reason the engine takes its catalogue as an argument: the logic — every
 * subject alias, every word-boundary rule that keeps "thuật toán" off the mathematics
 * shelf — is one implementation, and only its data source moved.
 *
 * The reply names shelves, floors and copy counts, so it must be reading the same rows
 * the book-info screen will render a moment later. Loading the corpus per request rather
 * than caching it is what guarantees that: 116 books is a few milliseconds, and an
 * assistant that promises a copy the next screen says is gone is worse than a slow one.
 */
import type { FastifyInstance } from 'fastify'
import type { Kysely } from 'kysely'
import { z } from 'zod'
import { askLibrarian } from '@/shared/librarian'
import type { DB } from '../db/schema.ts'
import { allAvailability } from '../repos/availability.ts'
import { listBooks } from '../repos/books.ts'
import { allShelves } from '../repos/shelves.ts'
import { libraryStatus } from '../repos/status.ts'

const bodySchema = z.object({ question: z.string() })

export function registerLibrarianRoutes(app: FastifyInstance, db: Kysely<DB>): void {
  app.post('/api/librarian', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid-request', issues: parsed.error.issues })
    }

    const [books, availability, shelfLocations, status] = await Promise.all([
      listBooks(db),
      allAvailability(db),
      allShelves(db),
      libraryStatus(db),
    ])

    const reply_ = askLibrarian(parsed.data.question, {
      books,
      availability,
      shelfLocations,
      libraryStatus: status,
    })

    /*
     * Books go back as ids, not as whole records.
     *
     * The chat transcript is stored in a Zustand store that already keeps `bookIds` per
     * message, and the side panel renders them from the catalogue it has. Sending full
     * records would duplicate every field of every suggested book into the conversation
     * history, where it would then go stale as copies are borrowed.
     */
    return {
      intent: reply_.intent,
      text: reply_.text,
      bookIds: reply_.books.map((b) => b.id),
    }
  })
}
