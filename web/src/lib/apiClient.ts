// Thin fetch() wrapper around the real backend (see ARCHITECTURE.md §9).
// The access token lives only in memory — never localStorage — so an XSS
// bug can't exfiltrate a persisted token; the refresh token never touches
// JS at all, it's the backend's httpOnly cookie (see auth.ts's
// REFRESH_COOKIE, scoped to /api/v1/auth).
import { tr, type TranslationKey } from '@/lib/i18n/translations'

const BASE_URL = import.meta.env.VITE_API_URL

let accessToken: string | null = null
let refreshPromise: Promise<RefreshResult> | null = null

// Why a session ended under the user: it ran out (or was closed from
// another device), or the server's "Cierre automático" ended it.
export type SessionEndReason = 'expired' | 'idle'
type RefreshResult = 'ok' | SessionEndReason

let sessionEndedHandler: ((reason: SessionEndReason) => void) | null = null

// AuthContext registers this so a session that can't be renewed signs the
// user out everywhere at once, instead of each page failing on its own.
export function setSessionEndedHandler(handler: ((reason: SessionEndReason) => void) | null) {
  sessionEndedHandler = handler
}

async function errorCode(response: Response): Promise<string | undefined> {
  try {
    return ((await response.clone().json()) as { code?: string }).code
  } catch {
    return undefined
  }
}

async function endReason(response: Response): Promise<SessionEndReason> {
  return (await errorCode(response)) === 'session_idle' ? 'idle' : 'expired'
}

function setAccessToken(token: string | null) {
  accessToken = token
}

function genericErrorMessage(status: number): string {
  if (status === 401) return tr('auth.sessionExpired')
  if (status === 429) return tr('api.tooMany')
  if (status >= 500) return tr('api.server')
  return tr('api.generic')
}

// The backend's (and guest mode's) error sentences, in the app language.
// Ones not listed pass through, except "… not found." and the generic
// ones, which read as the status' own message.
const SERVER_MESSAGES: Record<string, TranslationKey> = {
  'Invalid email or password.': 'api.badCredentials',
  'Invalid or expired access token.': 'auth.sessionExpired',
  'Session ended.': 'auth.sessionExpired',
  'Refresh token is invalid or expired.': 'auth.sessionExpired',
  'An account with that email already exists.': 'api.emailTaken',
  'An account with that email already exists. Sign in with your password, or verify this email with Google first.': 'api.emailTakenGoogle',
  'Incorrect password.': 'api.wrongPassword',
  'The new password must differ from the current one.': 'api.samePassword',
  'Set a password before changing your email.': 'api.passwordFirstEmail',
  'Set a password before deleting your account.': 'api.passwordFirstDelete',
  'Invalid Google token.': 'api.google',
  'Google Sign-In is not configured on this server.': 'api.google',
  'A budget for this category and period already exists.': 'bud.err.taken',
  'A custom range needs startDate <= endDate.': 'api.badRange',
  'This loan has already been settled.': 'api.loanSettled',
  "This loan hasn't been confirmed yet — nothing to settle.": 'api.loanPlanned',
  'This plan has ended.': 'api.planEnded',
  'This recurring series is paused.': 'api.seriesPaused',
  "Transfers can't repeat.": 'api.transferRepeat',
  'Destination must be a different wallet.': 'api.sameWallet',
  'Only custom categories can be deleted.': 'api.customOnly',
  'The goal has no contributing wallet to return funds to.': 'api.goalNoWallet',
  'Necesitas al menos una billetera para usar S2 Nova.': 'api.lastWallet',
  'La moneda principal se elige antes de crear billeteras.': 'api.principalLocked',
  'La moneda principal no se puede quitar.': 'api.principalKeep',
  'Hay billeteras en esta moneda.': 'api.currencyInUse',
  'El archivo supera 10 MB.': 'nm.err.fileSize',
  'Ya existe una categoría con ese nombre.': 'api.categoryTaken',
  'No disponible en modo invitado. Crea una cuenta para usarlo.': 'api.guest',
}

export function localizeServerMessage(message: string, status: number): string {
  const key = SERVER_MESSAGES[message]
  if (key) return tr(key)
  if (/not found\.$/i.test(message) || /is required\.$/.test(message) || message === 'Invalid request.' || message === 'Internal server error.') return genericErrorMessage(status)
  return message
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as { error?: string }
    return body.error ? localizeServerMessage(body.error, response.status) : genericErrorMessage(response.status)
  } catch {
    return genericErrorMessage(response.status)
  }
}

interface RequestOptions {
  skipAuthRetry?: boolean
  // Sent as Idempotency-Key: the same key on a retry is never recorded twice
  // (goal "Abonar" and "Confirmar aporte").
  idempotencyKey?: string
}

// Long enough for the server to wake from sleep (about a minute on the
// free plan), short enough that nobody waits on a stalled connection.
const REQUEST_TIMEOUT_MS = 75_000

// A key for one user action, reused if that action is retried.
export function newRequestKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

async function rawRequest(path: string, init: RequestInit, options: RequestOptions = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('X-Client-Platform', 'web')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      signal: controller.signal,
    })
  } catch (error) {
    if (controller.signal.aborted) throw new ApiError(tr('api.timeout'), 0)
    throw error
  } finally {
    clearTimeout(timer)
  }
}

// A single in-flight refresh is shared by every caller that hits a 401 at
// the same time, so a burst of concurrent requests doesn't fire the
// rotating refresh-token endpoint more than once (it would invalidate the
// token the second caller was about to use).
async function refreshSession(): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = (async (): Promise<RefreshResult> => {
      try {
        const response = await rawRequest('/auth/refresh', { method: 'POST' })
        if (!response.ok) {
          setAccessToken(null)
          return endReason(response)
        }
        const body = (await response.json()) as { accessToken: string }
        setAccessToken(body.accessToken)
        return 'ok'
      } catch {
        // Offline: the session may well be fine, so keep it.
        return 'ok'
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

// A non-2xx response; `status` lets callers tell e.g. a 409 conflict apart.
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(localizeServerMessage(message, status))
    this.status = status
  }
}

async function send(path: string, init: RequestInit, options: RequestOptions = {}): Promise<Response> {
  let response = await rawRequest(path, init, options)

  // Only the auth layer's own 401s concern the session (backend
  // plugins/auth.ts); a wrong current password is just an error.
  const code = response.status === 401 && !options.skipAuthRetry ? await errorCode(response) : undefined
  if (code === 'token_invalid' || code === 'session_ended' || code === 'session_idle') {
    const hadSession = accessToken !== null
    const result: RefreshResult = code === 'token_invalid' ? await refreshSession() : code === 'session_idle' ? 'idle' : 'expired'
    if (result === 'ok') {
      response = await rawRequest(path, init, options)
    } else if (hadSession) {
      setAccessToken(null)
      sessionEndedHandler?.(result)
    }
  }

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status)
  }
  return response
}

// Guest mode ("Continuar como invitado", ONBOARDING.md §1): every request
// is answered by an in-memory stand-in for the backend (lib/guestApi.ts)
// and nothing reaches the server.
type GuestHandler = (method: string, path: string, body: unknown) => Promise<unknown>
let guestHandler: GuestHandler | null = null

export function setGuestHandler(handler: GuestHandler | null) {
  guestHandler = handler
}

export function isGuestMode(): boolean {
  return guestHandler !== null
}

async function request<T>(path: string, init: RequestInit, options: RequestOptions = {}): Promise<T> {
  if (guestHandler) {
    return (await guestHandler(init.method ?? 'GET', path, init.body ? JSON.parse(String(init.body)) : undefined)) as T
  }
  const response = await send(path, init, options)
  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const apiClient = {
  setAccessToken,
  getAccessToken: () => accessToken,

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(path, { method: 'GET' }, options)
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }, options)
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }, options)
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }, options)
  },
  delete<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, { method: 'DELETE', body: body !== undefined ? JSON.stringify(body) : undefined }, options)
  },
  // A file response (e.g. the CSV export), with the name from Content-Disposition.
  async download(path: string): Promise<{ data: Blob; fileName: string | null }> {
    if (guestHandler) return (await guestHandler('DOWNLOAD', path, undefined)) as { data: Blob; fileName: string | null }
    const response = await send(path, { method: 'GET' })
    const match = /filename="?([^";]+)"?/.exec(response.headers.get('content-disposition') ?? '')
    return { data: await response.blob(), fileName: match?.[1] ?? null }
  },
}
