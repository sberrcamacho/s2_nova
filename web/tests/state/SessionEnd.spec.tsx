import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, renderHook, waitFor } from '@testing-library/react'
import { server } from '../mocks/server'
import { AuthProvider, useAuth } from '@/state/AuthContext'
import { apiClient } from '@/lib/apiClient'

const BASE = 'http://test.local/api/v1'
const me = (autoLockMinutes: number) => ({
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  createdAt: '2024-03-05T12:00:00.000Z',
  hasPassword: true,
  preferences: { language: 'es', currency: 'COP', theme: 'SYSTEM', notifications: true, biometricLogin: false, blurBalance: false, onboardingCompleted: true, tutorialCompleted: true, autoLockMinutes },
})

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('Session end', () => {
  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('signs out with a notice when the server says the session went idle', async () => {
    server.use(
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ accessToken: 't' })),
      http.get(`${BASE}/me`, () => HttpResponse.json(me(5))),
      http.get(`${BASE}/accounts`, () => HttpResponse.json({ error: 'Session ended.', code: 'session_idle' }, { status: 401 })),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    await act(async () => {
      await apiClient.get('/accounts').catch(() => undefined)
    })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toBe('Cerramos tu sesión por inactividad. Vuelve a entrar.')
    expect(apiClient.getAccessToken()).toBeNull()
  })

  it('signs out when a session can no longer be renewed', async () => {
    let refreshes = 0
    server.use(
      http.post(`${BASE}/auth/refresh`, () => (refreshes++ === 0 ? HttpResponse.json({ accessToken: 't' }) : new HttpResponse(null, { status: 401 }))),
      http.get(`${BASE}/me`, () => HttpResponse.json(me(5))),
      http.get(`${BASE}/accounts`, () => HttpResponse.json({ error: 'Invalid or expired access token.', code: 'token_invalid' }, { status: 401 })),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    await act(async () => {
      await apiClient.get('/accounts').catch(() => undefined)
    })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toBe('Tu sesión terminó. Vuelve a iniciar sesión.')
  })

  it('logs out for real after Cierre automático without activity, and not before', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let loggedOut = false
    server.use(
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ accessToken: 't' })),
      http.get(`${BASE}/me`, () => HttpResponse.json(me(1))),
      http.post(`${BASE}/auth/logout`, () => {
        loggedOut = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    // 45 s idle, then activity: the minute starts over.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_000)
      window.dispatchEvent(new Event('keydown'))
      await vi.advanceTimersByTimeAsync(45_000)
    })
    expect(result.current.isAuthenticated).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000)
    })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(false))
    expect(loggedOut).toBe(true)
    expect(result.current.error).toBe('Cerramos tu sesión por inactividad. Vuelve a entrar.')
  })

  it('never logs out on its own when Cierre automático is Nunca', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    server.use(
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ accessToken: 't' })),
      http.get(`${BASE}/me`, () => HttpResponse.json(me(0))),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60 * 60_000)
    })
    expect(result.current.isAuthenticated).toBe(true)
  })
})
