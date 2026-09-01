/**
 * The card check at step 2 of the self-checkout — Job 3 / Pain Reliever 3.
 *
 * Returns the card *and* every reason it cannot borrow, in one response. The two belong
 * together: a screen that shows "Thẻ hợp lệ" and then discovers a refusal on submit has
 * told the reader something untrue, and the Figma prototype's flat "Thẻ thư viện hợp lệ"
 * is exactly the version this replaces.
 *
 * `blocks` is an array because refusals stack. An expired card can also have overdue
 * books, and revealing the second only after the first is fixed sends the reader to the
 * librarian's desk twice.
 */
import type { FastifyInstance } from 'fastify'
import type { Kysely } from 'kysely'
import { checkEligibility } from '@/shared/borrowRules'
import type { DB } from '../db/schema.ts'
import { findBook } from '../repos/books.ts'
import { findStudent, openLoansFor } from '../repos/loans.ts'

export function registerStudentRoutes(app: FastifyInstance, db: Kysely<DB>): void {
  app.get<{ Params: { cardCode: string }; Querystring: { cartSize?: string } }>(
    '/api/students/:cardCode',
    async (request, reply) => {
      const student = await findStudent(db, request.params.cardCode)
      if (!student) return reply.code(404).send({ error: 'not-found' })

      // How many books are waiting to go out on this scan. It decides the limit block, so
      // it comes from the caller — the server has no view of the kiosk's cart.
      const cartSize = Number(request.query.cartSize ?? 0)

      const openLoans = await openLoansFor(db, student.cardCode)

      /*
       * Titles for the overdue message, fetched only for the books actually overdue.
       * Loading the whole catalogue to name at most a handful of books would make the
       * common case — a card with nothing overdue — pay for the rare one.
       */
      const titles = new Map(
        await Promise.all(
          openLoans.map(async (loan): Promise<[string, string]> => {
            const book = await findBook(db, loan.bookId)
            return [loan.bookId, book?.title ?? loan.bookId]
          }),
        ),
      )

      const blocks = checkEligibility({
        student,
        cartSize: Number.isFinite(cartSize) ? cartSize : 0,
        openLoans,
        titleOf: (bookId) => titles.get(bookId) ?? bookId,
      })

      return { student, blocks }
    },
  )
}
