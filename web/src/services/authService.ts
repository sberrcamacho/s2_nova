import { apiClient } from '@/lib/apiClient'
import { mapMeResponse, type MeResponse } from '@/services/userService'
import type { AuthCredentials, RegisterInput, User } from '@/types'

interface SessionResponse {
  accessToken: string
  user: { id: string; name: string; email: string }
}

// Every auth entry point does the same two calls: get an access token, then
// fetch the full profile (login/register/google only return the bare
// id/name/email — preferences and hasPassword come from GET /me).
async function completeSession(response: SessionResponse): Promise<User> {
  apiClient.setAccessToken(response.accessToken)
  const me = await apiClient.get<MeResponse>('/me')
  return mapMeResponse(me)
}

export const authService = {
  async login({ email, password }: AuthCredentials): Promise<User> {
    const response = await apiClient.post<SessionResponse>('/auth/login', { email, password }, { skipAuthRetry: true })
    return completeSession(response)
  },

  async register({ name, email, password }: RegisterInput): Promise<User> {
    const response = await apiClient.post<SessionResponse>('/auth/register', { name, email, password }, { skipAuthRetry: true })
    return completeSession(response)
  },

  async loginWithGoogle(idToken: string): Promise<User> {
    const response = await apiClient.post<SessionResponse>('/auth/google', { idToken }, { skipAuthRetry: true })
    return completeSession(response)
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post<void>('/auth/logout', undefined, { skipAuthRetry: true })
    } catch {
      // Best-effort — the client clears its own state regardless (see
      // AuthContext.logout), so a network failure here shouldn't block
      // signing out locally.
    }
  },
}
