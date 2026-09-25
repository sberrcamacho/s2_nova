import { apiClient } from '@/lib/apiClient'
import type { LanguageCode, User } from '@/types'

// Wire shape of GET/PATCH /me — see backend/src/routes/me.ts's serializeMe.
export interface MeResponse {
  id: string
  name: string
  email: string
  phone: string | null
  city: string | null
  createdAt: string
  hasPassword: boolean
  passwordChangedAt: string | null
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

// `avatarInitials` is derived client-side; `memberSince` maps to the
// backend's createdAt.
export function mapMeResponse(me: MeResponse): User {
  return {
    id: me.id,
    name: me.name,
    email: me.email,
    hasPassword: me.hasPassword,
    passwordChangedAt: me.passwordChangedAt,
    phone: me.phone ?? '',
    city: me.city ?? '',
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

// Ajustes › Sesiones activas — one row per signed-in device.
export interface Session {
  id: string
  device: string | null
  kind: 'desktop' | 'phone' | 'tablet'
  lastActiveAt: string
  current: boolean
}

// What deleting the account removes (Ajustes › Eliminar cuenta).
export interface Footprint {
  transactions: number
  budgets: number
  goals: number
  loans: number
  wallets: number
  recurringSeries: number
}

export const userService = {
  async getCurrentUser(): Promise<User> {
    const me = await apiClient.get<MeResponse>('/me')
    return mapMeResponse(me)
  },

  async updateProfile(patch: { name?: string; email?: string; phone?: string; city?: string; currentPassword?: string }): Promise<User> {
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

  getSessions(): Promise<Session[]> {
    return apiClient.get<Session[]>('/me/sessions')
  },

  async closeSession(id: string): Promise<void> {
    await apiClient.delete(`/me/sessions/${id}`)
  },

  async closeOtherSessions(): Promise<void> {
    await apiClient.delete('/me/sessions')
  },

  getFootprint(): Promise<Footprint> {
    return apiClient.get<Footprint>('/me/footprint')
  },

  // Saves the backend's CSV (movimientos, presupuestos, metas, préstamos)
  // through a temporary link, keeping the server's file name.
  async exportData(): Promise<void> {
    const blob = await apiClient.download('/me/export')
    const url = URL.createObjectURL(blob.data)
    const link = document.createElement('a')
    link.href = url
    link.download = blob.fileName ?? 's2-nova.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },

  async deleteAccount(password: string): Promise<void> {
    await apiClient.delete('/me', { password })
  },
}
