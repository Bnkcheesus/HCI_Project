/**
 * Confirming a borrow — Job 3 / Gain Creator 3 — and giving a book back.
 *
 * The endpoints that write. Everything interesting is in `services/checkout.ts` and
 * `services/returnBook.ts`; this file's whole job is turning a request into one of those
 * calls and a failure into a status code.
 *
 * Failures come back as `409 Conflict` with a machine-readable `reason`, not as `400`.
 * Nothing is malformed about "someone took the last copy while you were scanning your
 * card" or "this card has two books overdue" — the request was well-formed and the
 * *state* refused it. The kiosk needs the distinction: a 400 means the screen has a bug,
 * a 409 means the screen has something to explain to the reader.
 */
import type { FastifyInstance } from 'fastify'
import type { Kysely } from 'kysely'
import { z } from 'zod'
import { MAX_BOOKS_PER_LOAN } from '@/shared/borrowRules'
import type { DB } from '../db/schema.ts'
import { checkout } from '../services/checkout.ts'
import { returnBook } from '../services/returnBook.ts'
import { findSlip } from '../repos/loans.ts'

const bodySchema = z.object({
  cardCode: z.string().min(1),
  bookIds: z.array(z.string().min(1)).min(1).max(MAX_BOOKS_PER_LOAN),
})

const returnBodySchema = z.object({
  cardCode: z.string().min(1),
  bookId: z.string().min(1),
})

export function registerLoanRoutes(app: FastifyInstance, db: Kysely<DB>): void {
  app.post('/api/loans', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body)
    // Genuinely malformed — a missing card code or an empty list is a caller bug, and the
    // shape is validated here so the service can reason about state rather than about
    // whether its arguments exist.
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid-request', issues: parsed.error.issues })
    }

    const result = await checkout(db, parsed.data)
    if (!result.ok) return reply.code(409).send({ error: 'checkout-failed', failure: result.failure })

    return reply.code(201).send({ slip: result.slip })
  })

  /**
   * Giving a book back — a demo affordance, not a product feature. See
   * `services/returnBook.ts` for why it exists and why it lives outside /kiosk and /mobile.
   *
   * Takes a card and a book rather than a loan id: the account payload the admin screen
   * reads carries book ids, not loan ids, and adding the loan id to that shared shape
   * would ripple into the mobile fixtures for no gain here. The service resolves the pair
   * to the oldest matching open loan.
   */
  app.post('/api/returns', async (request, reply) => {
    const parsed = returnBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid-request', issues: parsed.error.issues })
    }

    const result = await returnBook(db, parsed.data)
    if (!result.ok) return reply.code(409).send({ error: 'return-failed', failure: result.failure })

    return reply.code(200).send({ loan: result.loan })
  })

  /**
   * One slip by number — what a QR code or a `?slip=` link resolves to.
   *
   * This is the half of the kiosk-to-phone handoff that could not exist before: the slip
   * lived in the kiosk browser's localStorage, so a real phone scanning a real kiosk
   * found nothing. Now the number is enough, from any device.
   */
  app.get<{ Params: { id: string } }>('/api/slips/:id', async (request, reply) => {
    const slip = await findSlip(db, request.params.id)
    if (!slip) return reply.code(404).send({ error: 'not-found' })
    return slip
  })
}
