import { apiClient } from '@/lib/apiClient'
import type { LanguageCode, User } from '@/types'

// Wire shape of GET/PATCH /me — see backend/src/routes/me.ts's serializeMe.
export interface MeResponse {
  id: string
  name: string
  email: string
  createdAt: string
  hasPassword: boolean
  preferences: {
    language: string
    currency: 'COP' | 'USD'
    theme: 'LIGHT' | 'DARK' | 'SYSTEM'
    notifications: boolean
    biometricLogin: boolean
    blurBalance: boolean
    onboardingCompleted: boolean
    tutorialCompleted: boolean
  } | null
}

function initialsFrom(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return initials || 'US'
}

// The account model is deliberately minimal (name, email, password/Google
// login only — see ARCHITECTURE.md's account-fields decision), so there's
// no phone/city to map here. `avatarInitials` is derived client-side;
// `memberSince` maps to the backend's createdAt.
export function mapMeResponse(me: MeResponse): User {
  return {
    id: me.id,
    name: me.name,
    email: me.email,
    hasPassword: me.hasPassword,
    avatarInitials: initialsFrom(me.name),
    currency: me.preferences?.currency ?? 'COP',
    memberSince: me.createdAt.slice(0, 10),
    preferences: {
      theme: (me.preferences?.theme ?? 'SYSTEM').toLowerCase() as 'light' | 'dark' | 'system',
      notifications: me.preferences?.notifications ?? true,
      biometricLogin: me.preferences?.biometricLogin ?? false,
      // Backed by the shared `blurBalance` preference — the same switch as
      // Android's "Difuminar el saldo total", so hiding amounts follows the
      // account across both clients.
      hideAmounts: me.preferences?.blurBalance ?? false,
      language: (me.preferences?.language as LanguageCode) ?? 'es',
    },
  }
}

export const userService = {
  async getCurrentUser(): Promise<User> {
    const me = await apiClient.get<MeResponse>('/me')
    return mapMeResponse(me)
  },

  async updateProfile(patch: { name?: string; email?: string; currentPassword?: string }): Promise<User> {
    const me = await apiClient.patch<MeResponse>('/me', patch)
    return mapMeResponse(me)
  },

  async changePassword(input: { currentPassword?: string; newPassword: string }): Promise<void> {
    await apiClient.post<void>('/me/password', input)
  },

  async updatePreferences(patch: Partial<User['preferences']>): Promise<void> {
    const body: Record<string, unknown> = {}
    if (patch.language !== undefined) body.language = patch.language
    if (patch.theme !== undefined) body.theme = patch.theme.toUpperCase()
    if (patch.notifications !== undefined) body.notifications = patch.notifications
    if (patch.biometricLogin !== undefined) body.biometricLogin = patch.biometricLogin
    if (patch.hideAmounts !== undefined) body.blurBalance = patch.hideAmounts
    if (Object.keys(body).length === 0) return
    await apiClient.patch('/me/preferences', body)
  },

  async updateCurrency(currency: User['currency']): Promise<void> {
    await apiClient.patch('/me/preferences', { currency })
  },
}
