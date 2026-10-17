import type { User } from '@/types'

// Who was signed in when "Cierre automático" ended the session, so the
// lock screen (/bloqueo) can ask only for that account's password or
// Google sign-in. Not a credential: the session itself is already closed on
// the server. Cleared by "Cerrar sesión", a manual sign-out, deleting the
// account, or unlocking.
export interface LockedAccount {
  userId: string
  name: string
  email: string
  hasPassword: boolean
  hasGoogle: boolean
}

const KEY = 's2nova.lockedAccount'

export function readLockedAccount(): LockedAccount | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<LockedAccount>
    if (typeof value.userId !== 'string' || typeof value.email !== 'string') return null
    return {
      userId: value.userId,
      name: typeof value.name === 'string' ? value.name : value.email,
      email: value.email,
      hasPassword: value.hasPassword !== false,
      hasGoogle: value.hasGoogle === true,
    }
  } catch {
    return null
  }
}

export function saveLockedAccount(user: User) {
  const value: LockedAccount = { userId: user.id, name: user.name, email: user.email, hasPassword: user.hasPassword, hasGoogle: user.hasGoogle }
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  } catch {
    // Private mode: the user lands on Login instead.
  }
}

export function clearLockedAccount() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing stored.
  }
}
