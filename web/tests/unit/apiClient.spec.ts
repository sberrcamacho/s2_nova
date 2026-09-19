import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { apiClient } from '@/lib/apiClient'

const BASE = 'http://test.local/api/v1'

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
        if (auth !== 'Bearer fresh-token') return new HttpResponse(null, { status: 401 })
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
        if (auth !== 'Bearer fresh-token') return new HttpResponse(null, { status: 401 })
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
      http.get(`${BASE}/secret`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
    )
    await expect(apiClient.get('/secret')).rejects.toThrow('Tu sesión expiró. Vuelve a iniciar sesión.')
    expect(apiClient.getAccessToken()).toBeNull()
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
      http.get(`${BASE}/secret`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCalls++
        return HttpResponse.json({ accessToken: 'x' })
      }),
    )
    await expect(apiClient.get('/secret', { skipAuthRetry: true })).rejects.toThrow()
    expect(refreshCalls).toBe(0)
  })
})
