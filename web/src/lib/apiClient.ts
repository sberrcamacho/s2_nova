// Thin fetch() wrapper around the real backend (see ARCHITECTURE.md §9).
// The access token lives only in memory — never localStorage — so an XSS
// bug can't exfiltrate a persisted token; the refresh token never touches
// JS at all, it's the backend's httpOnly cookie (see auth.ts's
// REFRESH_COOKIE, scoped to /api/v1/auth).
const BASE_URL = import.meta.env.VITE_API_URL

let accessToken: string | null = null
let refreshPromise: Promise<boolean> | null = null

function setAccessToken(token: string | null) {
  accessToken = token
}

function genericErrorMessage(status: number): string {
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  if (status === 429) return 'Demasiados intentos. Intenta de nuevo en un momento.'
  if (status >= 500) return 'Tuvimos un problema en el servidor. Intenta de nuevo.'
  return 'Algo salió mal. Intenta de nuevo.'
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as { error?: string }
    return body.error || genericErrorMessage(response.status)
  } catch {
    return genericErrorMessage(response.status)
  }
}

interface RequestOptions {
  skipAuthRetry?: boolean
}

async function rawRequest(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('X-Client-Platform', 'web')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })
}

// A single in-flight refresh is shared by every caller that hits a 401 at
// the same time, so a burst of concurrent requests doesn't fire the
// rotating refresh-token endpoint more than once (it would invalidate the
// token the second caller was about to use).
async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await rawRequest('/auth/refresh', { method: 'POST' })
        if (!response.ok) {
          setAccessToken(null)
          return false
        }
        const body = (await response.json()) as { accessToken: string }
        setAccessToken(body.accessToken)
        return true
      } catch {
        setAccessToken(null)
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

async function request<T>(path: string, init: RequestInit, options: RequestOptions = {}): Promise<T> {
  let response = await rawRequest(path, init)

  if (response.status === 401 && !options.skipAuthRetry && path !== '/auth/refresh') {
    const refreshed = await refreshSession()
    if (refreshed) {
      response = await rawRequest(path, init)
    }
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

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
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>(path, { method: 'DELETE' }, options)
  },
}
