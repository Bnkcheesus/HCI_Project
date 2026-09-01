/**
 * Talking to the API.
 *
 * Everything goes through the same origin — Vite proxies `/api` to the server in
 * development — so there is no base URL to configure, no CORS, and no environment
 * variable that can be wrong on someone else's machine.
 */

/**
 * A response the server refused. Carries the status so callers can tell the two kinds
 * apart: a 404 is usually a state to render ("không tìm thấy tài liệu này"), while a 500
 * is a failure to report. `body` holds whatever the server sent — for a rejected
 * checkout, that is the reason the reader needs to be told.
 */
export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(`API ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    // The error body is best-effort: a proxy or a crash can return HTML, and failing to
    // parse it must not replace the real status with a JSON syntax error.
    throw new ApiError(response.status, await response.json().catch(() => null))
  }

  return response.json() as Promise<T>
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

/**
 * A GET whose 404 is an answer rather than a failure.
 *
 * "This book id does not exist" is something screens render — the detail page has a
 * "Không tìm thấy tài liệu này" state — so it comes back as `null` instead of throwing
 * and putting the whole query into an error state.
 */
export async function apiGetOrNull<T>(path: string): Promise<T | null> {
  try {
    return await apiGet<T>(path)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** `?ids=a,b,c`, encoded once so every caller spells it the same way. */
export function idsParam(ids: string[]): string {
  return encodeURIComponent(ids.join(','))
}
