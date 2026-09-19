import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { act, renderHook, waitFor } from '@testing-library/react'
import { server } from '../mocks/server'
import { AuthProvider, useAuth } from '@/state/AuthContext'
import { AppDataProvider, useAppData } from '@/state/AppDataContext'

const BASE = 'http://test.local/api/v1'
const ME_RESPONSE = {
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  createdAt: '2024-03-05T12:00:00.000Z',
  hasPassword: true,
  preferences: null,
}
const CATEGORIES = [{ id: 'uuid-food', slug: 'food' }]

function useHarness() {
  const auth = useAuth()
  const data = useAppData()
  return { auth, data }
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppDataProvider>{children}</AppDataProvider>
    </AuthProvider>
  )
}

function mockLoggedOut() {
  server.use(http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })))
}

function mockLoggedIn() {
  server.use(
    http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ accessToken: 't' })),
    http.get(`${BASE}/me`, () => HttpResponse.json(ME_RESPONSE)),
    http.get(`${BASE}/categories`, () => HttpResponse.json(CATEGORIES)),
  )
}

describe('AppDataContext', () => {
  it('loads no data and finishes loading immediately when signed out', async () => {
    mockLoggedOut()
    const { result } = renderHook(() => useHarness(), { wrapper })
    await waitFor(() => expect(result.current.auth.isInitializing).toBe(false))
    expect(result.current.data.isLoading).toBe(false)
    expect(result.current.data.transactions).toEqual([])
    expect(result.current.data.budgets).toEqual([])
  })

  it('fetches transactions and budgets once authenticated', async () => {
    mockLoggedIn()
    server.use(
      http.get(`${BASE}/transactions`, () => HttpResponse.json([])),
      http.get(`${BASE}/budgets`, () =>
        HttpResponse.json([
          { id: 'b1', name: null, categoryId: 'uuid-food', amount: 100_000, spent: 10_000, remaining: 90_000, percentage: 10, status: 'ON_TRACK', month: '2026-06' },
        ]),
      ),
    )
    const { result } = renderHook(() => useHarness(), { wrapper })
    // Waiting on `isLoading` alone is racy here: AppDataContext's effect
    // also fires once, synchronously false, for the initial
    // not-yet-authenticated render before the real (authenticated) load
    // even starts — assert on the loaded data itself instead.
    await waitFor(() => expect(result.current.data.budgets).toHaveLength(1))
  })

  it('clears previously loaded data on logout so it never leaks to the next signed-in user', async () => {
    mockLoggedIn()
    server.use(
      http.get(`${BASE}/transactions`, () => HttpResponse.json([])),
      http.get(`${BASE}/budgets`, () =>
        HttpResponse.json([
          { id: 'b1', name: null, categoryId: 'uuid-food', amount: 100_000, spent: 10_000, remaining: 90_000, percentage: 10, status: 'ON_TRACK', month: '2026-06' },
        ]),
      ),
      http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
    )
    const { result } = renderHook(() => useHarness(), { wrapper })
    await waitFor(() => expect(result.current.data.budgets).toHaveLength(1))

    act(() => result.current.auth.logout())
    await waitFor(() => expect(result.current.data.budgets).toEqual([]))
    expect(result.current.data.transactions).toEqual([])
  })
})
