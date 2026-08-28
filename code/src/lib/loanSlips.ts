/**
 * Where a confirmed loan slip goes so the mobile app can show it — Gain Creator 3
 * ("in phiếu hoặc đồng bộ app") and Pain Reliever 4 (app nhắc hạn trả).
 *
 * The kiosk used to hand the slip over as a QR code the reader had to scan. It no longer
 * does: borrowing a book syncs the slip to the reader's account by itself, which is what
 * "đồng bộ app" should have meant all along — a scan step is friction the value map never
 * asked for.
 *
 * With no backend, "syncs to the account" is localStorage. Be honest about what that
 * does and does not cover:
 *
 *   - Same browser (the way this project is demoed): works. The kiosk writes on confirm,
 *     /mobile/phieu-muon reads it back, including after a reload.
 *   - Genuinely separate devices — a real kiosk and a real phone: does not work, and
 *     cannot, until there is a server. Nothing here pretends otherwise.
 *
 * Swap this module for an API client when a backend exists; keep the function shapes.
 */
import type { LoanSlip } from './borrow'

const STORAGE_KEY = 'libassist.slips'

/** Newest first — the mobile screens want the most recent loan without sorting again. */
function readAll(): LoanSlip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as LoanSlip[]) : []
  } catch {
    // Private mode, disabled storage, or a corrupted value. A reader who cannot see a
    // synced slip is a smaller failure than a receipt screen that throws.
    return []
  }
}

export function savedSlips(): LoanSlip[] {
  return readAll()
}

export function findSavedSlip(id: string): LoanSlip | undefined {
  return readAll().find((slip) => slip.id === id)
}

export function latestSavedSlip(): LoanSlip | undefined {
  return readAll()[0]
}

/**
 * Called the moment a borrow is confirmed. Idempotent on slip id, so re-confirming or
 * re-mounting never files the same loan twice.
 */
export function saveSlip(slip: LoanSlip): void {
  try {
    const next = [slip, ...readAll().filter((s) => s.id !== slip.id)]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable — the printed slip still carries everything the reader needs,
    // so the checkout must not fail over this.
  }
}

/** Test helper — the store is module-level, so suites need a way back to empty. */
export function clearSavedSlips(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing to clear */
  }
}
