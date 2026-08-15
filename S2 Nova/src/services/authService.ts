import { demoCredentials, mockUser } from '@/data/user'
import { delay } from '@/lib/async'
import type { AuthCredentials, RegisterInput, User } from '@/types'

// Mock authentication only — no real backend/session/token. Login succeeds
// for the demo account or for anyone who registers during this session so
// the flow feels real without pretending to be a live auth provider.
const registeredEmails = new Set<string>([demoCredentials.email])

export const authService = {
  async login({ email, password }: AuthCredentials): Promise<User> {
    await delay(null, 500)
    const normalized = email.trim().toLowerCase()
    if (!registeredEmails.has(normalized)) {
      throw new Error('No encontramos una cuenta con ese correo.')
    }
    if (password.length < 4) {
      throw new Error('Contraseña incorrecta.')
    }
    return { ...mockUser, email: normalized }
  },

  async register({ name, email, password }: RegisterInput): Promise<User> {
    await delay(null, 600)
    const normalized = email.trim().toLowerCase()
    if (registeredEmails.has(normalized)) {
      throw new Error('Ya existe una cuenta con ese correo.')
    }
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.')
    }
    registeredEmails.add(normalized)
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('')
    return { ...mockUser, name, email: normalized, avatarInitials: initials || 'US' }
  },

  async requestPasswordReset(email: string): Promise<{ sent: boolean }> {
    await delay(null, 500)
    return { sent: registeredEmails.has(email.trim().toLowerCase()) }
  },
}
