/**
 * A reader's borrowing record — Job 4 / Pain 4 / Pain Reliever 4.
 *
 * Everything the mobile companion shows comes from here: what is out, what is due when,
 * what has been given back. Grouped into slips rather than listed as loose loans, because
 * a slip is what the reader actually experienced — one visit, one due date, however many
 * books they carried out.
 */
import type { FastifyInstance } from 'fastify'
import type { Kysely } from 'kysely'
import type { DB } from '../db/schema.ts'
import { accountSlips, findStudent } from '../repos/loans.ts'

export function registerAccountRoutes(app: FastifyInstance, db: Kysely<DB>): void {
  app.get<{ Params: { cardCode: string } }>(
    '/api/accounts/:cardCode/slips',
    async (request, reply) => {
      /*
       * The card is checked even though the slips query would simply come back empty for
       * an unknown one. An empty list means "you have never borrowed anything", which is
       * a real and reasonable state to render; a 404 means "this card does not exist".
       * Collapsing the two would show a reader who mistyped a card number a cheerful
       * empty history belonging to nobody.
       */
      const student = await findStudent(db, request.params.cardCode)
      if (!student) return reply.code(404).send({ error: 'not-found' })

      return { student, slips: await accountSlips(db, student.cardCode) }
    },
  )
}
