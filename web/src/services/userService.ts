import { mockUser } from '@/data/user'
import { delay } from '@/lib/async'
import type { User } from '@/types'

let currentUser: User = { ...mockUser }

export const userService = {
  async getCurrentUser(): Promise<User> {
    return delay(currentUser)
  },

  async updateProfile(patch: Partial<Pick<User, 'name' | 'email' | 'phone' | 'city'>>): Promise<User> {
    currentUser = { ...currentUser, ...patch }
    return delay(currentUser, 350)
  },

  async updatePreferences(patch: Partial<User['preferences']>): Promise<User> {
    currentUser = { ...currentUser, preferences: { ...currentUser.preferences, ...patch } }
    return delay(currentUser, 200)
  },
}
