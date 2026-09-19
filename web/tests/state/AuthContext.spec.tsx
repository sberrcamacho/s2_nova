import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, renderHook, waitFor } from '@testing-library/react'
import { server } from '../mocks/server'
import { AuthProvider, useAuth } from '@/state/AuthContext'
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

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthContext', () => {
  it('restores a session on mount when the refresh cookie is still valid', async () => {
    server.use(
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ accessToken: 'restored-token' })),
      http.get(`${BASE}/me`, () => HttpResponse.json(ME_RESPONSE)),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isInitializing).toBe(true)

    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.name).toBe('Ada Lovelace')
    expect(apiClient.getAccessToken()).toBe('restored-token')
  })

  it('leaves the user signed out on mount when there is no valid session, without surfacing an error', async () => {
    server.use(http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })))
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('updateUser shallow-merges a partial patch onto the existing user rather than replacing it', async () => {
    server.use(
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ accessToken: 't' })),
      http.get(`${BASE}/me`, () => HttpResponse.json(ME_RESPONSE)),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isInitializing).toBe(false))

    act(() => result.current.updateUser({ name: 'Ada Byron' }))
    expect(result.current.user).toMatchObject({ name: 'Ada Byron', email: 'ada@example.com' })
  })

  it('logout clears the access token and user even if the backend logout call fails', async () => {
    server.use(
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ accessToken: 't' })),
      http.get(`${BASE}/me`, () => HttpResponse.json(ME_RESPONSE)),
      http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 500 })),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isInitializing).toBe(false))
    expect(result.current.isAuthenticated).toBe(true)

    act(() => result.current.logout())
    expect(result.current.isAuthenticated).toBe(false)
    expect(apiClient.getAccessToken()).toBeNull()
  })

  it('login surfaces the backend error message and leaves the user signed out on failure', async () => {
    server.use(
      http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE}/auth/login`, () => HttpResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 })),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isInitializing).toBe(false))

    let ok = true
    await act(async () => {
      ok = await result.current.login({ email: 'ada@example.com', password: 'wrongpass' })
    })
    expect(ok).toBe(false)
    expect(result.current.error).toBe('Credenciales inválidas.')
    expect(result.current.isAuthenticated).toBe(false)
  })
})
