import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { authService } from '@/services/authService'
import { apiClient } from '@/lib/apiClient'

const BASE = 'http://test.local/api/v1'

const ME_RESPONSE = {
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  createdAt: '2024-03-05T12:00:00.000Z',
  hasPassword: true,
  preferences: null,
}

describe('authService', () => {
  afterEach(() => apiClient.setAccessToken(null))

  it('login completes the session: sets the access token, then fetches /me', async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () => HttpResponse.json({ accessToken: 'tok-1', user: { id: 'u1', name: 'x', email: 'x@y.co' } })),
      http.get(`${BASE}/me`, () => HttpResponse.json(ME_RESPONSE)),
    )
    const user = await authService.login({ email: 'ada@example.com', password: 'whatever8' })
    expect(user.name).toBe('Ada Lovelace')
    expect(apiClient.getAccessToken()).toBe('tok-1')
  })

  it('register completes the session the same way', async () => {
    server.use(
      http.post(`${BASE}/auth/register`, () => HttpResponse.json({ accessToken: 'tok-2', user: { id: 'u1', name: 'x', email: 'x@y.co' } })),
      http.get(`${BASE}/me`, () => HttpResponse.json(ME_RESPONSE)),
    )
    const user = await authService.register({ name: 'Ada', email: 'ada@example.com', password: 'whatever8' })
    expect(user.email).toBe('ada@example.com')
  })

  it('loginWithGoogle posts the idToken and completes the session', async () => {
    let body: unknown = null
    server.use(
      http.post(`${BASE}/auth/google`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ accessToken: 'tok-3', user: { id: 'u1', name: 'x', email: 'x@y.co' } })
      }),
      http.get(`${BASE}/me`, () => HttpResponse.json(ME_RESPONSE)),
    )
    await authService.loginWithGoogle('id-token-abc')
    expect(body).toEqual({ idToken: 'id-token-abc' })
  })

  it('login never triggers a refresh-and-retry loop on its own 401 (skipAuthRetry)', async () => {
    let refreshCalls = 0
    server.use(
      http.post(`${BASE}/auth/login`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCalls++
        return HttpResponse.json({ accessToken: 'x' })
      }),
    )
    await expect(authService.login({ email: 'a@b.co', password: 'wrongpass' })).rejects.toThrow()
    expect(refreshCalls).toBe(0)
  })

  it('logout swallows a network/server failure so the client can still clear local state', async () => {
    server.use(http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 500 })))
    await expect(authService.logout()).resolves.toBeUndefined()
  })

  it('logout calls POST /auth/logout when it succeeds', async () => {
    const handler = vi.fn(() => new HttpResponse(null, { status: 204 }))
    server.use(http.post(`${BASE}/auth/logout`, handler))
    await authService.logout()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
