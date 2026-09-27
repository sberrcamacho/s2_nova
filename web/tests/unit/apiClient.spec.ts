import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { setCurrentLanguage } from '@/lib/i18n/translations'
import { apiClient } from '@/lib/apiClient'

const BASE = 'http://test.local/api/v1'

// The auth layer's 401 for an expired access token (backend plugins/auth.ts).
const expired = () => HttpResponse.json({ error: 'Invalid or expired access token.', code: 'token_invalid' }, { status: 401 })

describe('apiClient', () => {
  afterEach(() => {
    apiClient.setAccessToken(null)
  })

  it('reads VITE_API_URL from the test env and hits the right base URL', async () => {
    server.use(http.get(`${BASE}/ping`, () => HttpResponse.json({ ok: true })))
    await expect(apiClient.get('/ping')).resolves.toEqual({ ok: true })
  })

  it('sends the access token as a Bearer header once set', async () => {
    apiClient.setAccessToken('token-123')
    let seen: string | null = null
    server.use(
      http.get(`${BASE}/whoami`, ({ request }) => {
        seen = request.headers.get('authorization')
        return HttpResponse.json({})
      }),
    )
    await apiClient.get('/whoami')
    expect(seen).toBe('Bearer token-123')
  })

  it('parses the backend error message and rejects on a non-2xx response', async () => {
    server.use(http.post(`${BASE}/thing`, () => HttpResponse.json({ error: 'Nombre inválido' }, { status: 422 })))
    await expect(apiClient.post('/thing', { name: '' })).rejects.toThrow('Nombre inválido')
  })

  it('falls back to a generic message per status code when the body has none', async () => {
    server.use(http.get(`${BASE}/broken`, () => new HttpResponse(null, { status: 500 })))
    await expect(apiClient.get('/broken')).rejects.toThrow('Tuvimos un problema en el servidor. Intenta de nuevo.')
  })

  it('returns undefined for a 204 No Content response', async () => {
    server.use(http.delete(`${BASE}/thing/1`, () => new HttpResponse(null, { status: 204 })))
    await expect(apiClient.delete('/thing/1')).resolves.toBeUndefined()
  })

  it('on a 401, refreshes once and retries the original request with the new token', async () => {
    let whoamiCalls = 0
    server.use(
      http.get(`${BASE}/secret`, ({ request }) => {
        whoamiCalls++
        const auth = request.headers.get('authorization')
        if (auth !== 'Bearer fresh-token') return expired()
        return HttpResponse.json({ secret: 42 })
      }),
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ accessToken: 'fresh-token' })),
    )
    apiClient.setAccessToken('stale-token')
    await expect(apiClient.get('/secret')).resolves.toEqual({ secret: 42 })
    expect(whoamiCalls).toBe(2)
    expect(apiClient.getAccessToken()).toBe('fresh-token')
  })

  it('de-duplicates concurrent refreshes: a burst of 401s only calls /auth/refresh once', async () => {
    let refreshCalls = 0
    server.use(
      http.get(`${BASE}/secret`, ({ request }) => {
        const auth = request.headers.get('authorization')
        if (auth !== 'Bearer fresh-token') return expired()
        return HttpResponse.json({ ok: true })
      }),
      http.post(`${BASE}/auth/refresh`, async () => {
        refreshCalls++
        return HttpResponse.json({ accessToken: 'fresh-token' })
      }),
    )
    apiClient.setAccessToken('stale-token')
    await Promise.all([apiClient.get('/secret'), apiClient.get('/secret'), apiClient.get('/secret')])
    expect(refreshCalls).toBe(1)
  })

  it('clears the access token and does not retry when the refresh itself fails', async () => {
    apiClient.setAccessToken('stale-token')
    server.use(
      http.get(`${BASE}/secret`, () => expired()),
      http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
    )
    await expect(apiClient.get('/secret')).rejects.toThrow('Tu sesión terminó. Vuelve a iniciar sesión.')
    expect(apiClient.getAccessToken()).toBeNull()
  })

  it("doesn't treat a route's own 401 (a wrong current password) as an expired session", async () => {
    let refreshCalls = 0
    apiClient.setAccessToken('good-token')
    server.use(
      http.post(`${BASE}/me/password`, () => HttpResponse.json({ error: 'Incorrect password.' }, { status: 401 })),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCalls++
        return HttpResponse.json({ accessToken: 'x' })
      }),
    )
    await expect(apiClient.post('/me/password', {})).rejects.toThrow('La contraseña no es correcta.')
    expect(refreshCalls).toBe(0)
    expect(apiClient.getAccessToken()).toBe('good-token')
  })

  it("shows the backend's error sentences in the app language", async () => {
    apiClient.setAccessToken('good-token')
    server.use(
      http.post(`${BASE}/transactions`, () => HttpResponse.json({ error: "Transfers can't repeat." }, { status: 422 })),
      http.get(`${BASE}/goals/g1`, () => HttpResponse.json({ error: 'Goal not found.' }, { status: 404 })),
    )
    await expect(apiClient.post('/transactions', {})).rejects.toThrow('Las transferencias no se pueden repetir.')
    await expect(apiClient.get('/goals/g1')).rejects.toThrow('Algo salió mal. Intenta de nuevo.')
    setCurrentLanguage('en')
    try {
      await expect(apiClient.post('/transactions', {})).rejects.toThrow("Transfers can't repeat.")
    } finally {
      setCurrentLanguage('es')
    }
  })

  it('never tries to refresh a 401 from /auth/refresh itself (would recurse)', async () => {
    let refreshCalls = 0
    server.use(
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCalls++
        return new HttpResponse(null, { status: 401 })
      }),
    )
    await expect(apiClient.post('/auth/refresh')).rejects.toThrow()
    expect(refreshCalls).toBe(1)
  })

  it('honors skipAuthRetry and does not attempt a refresh on 401', async () => {
    let refreshCalls = 0
    server.use(
      http.get(`${BASE}/secret`, () => expired()),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCalls++
        return HttpResponse.json({ accessToken: 'x' })
      }),
    )
    await expect(apiClient.get('/secret', { skipAuthRetry: true })).rejects.toThrow()
    expect(refreshCalls).toBe(0)
  })
})
