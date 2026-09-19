import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { mapMeResponse, userService } from '@/services/userService'
import { apiClient } from '@/lib/apiClient'

const BASE = 'http://test.local/api/v1'

describe('mapMeResponse', () => {
  it('maps a full backend /me response', () => {
    const user = mapMeResponse({
      id: 'u1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      createdAt: '2024-03-05T12:00:00.000Z',
      hasPassword: true,
      preferences: {
        language: 'en',
        currency: 'USD',
        theme: 'DARK',
        notifications: false,
        biometricLogin: true,
        onboardingCompleted: true,
        tutorialCompleted: true,
      },
    })
    expect(user).toMatchObject({
      id: 'u1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      hasPassword: true,
      avatarInitials: 'AL',
      currency: 'USD',
      memberSince: '2024-03-05',
      preferences: { theme: 'dark', notifications: false, biometricLogin: true, hideAmounts: false, language: 'en' },
    })
  })

  it('defaults missing preferences to Spanish/COP/system/on, and hideAmounts always false', () => {
    const user = mapMeResponse({
      id: 'u2',
      name: 'Solo Name',
      email: 'solo@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
      hasPassword: false,
      preferences: null,
    })
    expect(user.currency).toBe('COP')
    expect(user.preferences).toEqual({
      theme: 'system',
      notifications: true,
      biometricLogin: false,
      hideAmounts: false,
      language: 'es',
    })
  })

  it('derives avatar initials from up to the first two words of the name', () => {
    expect(mapMeResponse({ id: '1', name: 'Solo', email: 'a@b.co', createdAt: '2024-01-01', hasPassword: true, preferences: null }).avatarInitials).toBe('S')
    expect(
      mapMeResponse({ id: '1', name: 'Ana Maria Perez', email: 'a@b.co', createdAt: '2024-01-01', hasPassword: true, preferences: null }).avatarInitials,
    ).toBe('AM')
  })
})

describe('userService', () => {
  it('sends only the provided preference fields, uppercasing theme, and skips the request entirely when nothing changed', async () => {
    let body: unknown = null
    let calls = 0
    server.use(
      http.patch(`${BASE}/me/preferences`, async ({ request }) => {
        calls++
        body = await request.json()
        return HttpResponse.json({})
      }),
    )
    await userService.updatePreferences({ theme: 'dark' })
    expect(body).toEqual({ theme: 'DARK' })

    await userService.updatePreferences({})
    expect(calls).toBe(1) // the empty-patch call above never hit the network
  })

  it('changePassword posts to /me/password with the given fields', async () => {
    let body: unknown = null
    server.use(
      http.post(`${BASE}/me/password`, async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await userService.changePassword({ currentPassword: 'old', newPassword: 'NewPass1' })
    expect(body).toEqual({ currentPassword: 'old', newPassword: 'NewPass1' })
  })

  it('getCurrentUser fetches /me and maps it', async () => {
    server.use(
      http.get(`${BASE}/me`, () =>
        HttpResponse.json({
          id: 'u1',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          createdAt: '2024-03-05T12:00:00.000Z',
          hasPassword: true,
          preferences: null,
        }),
      ),
    )
    apiClient.setAccessToken('t')
    const user = await userService.getCurrentUser()
    expect(user.name).toBe('Ada Lovelace')
  })
})
