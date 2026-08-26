import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiClient } from '@/lib/apiClient'
import { resetCategoryCache } from '@/lib/backendCategories'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import type { AuthCredentials, RegisterInput, User } from '@/types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isInitializing: boolean
  isSubmitting: boolean
  error: string | null
  login: (credentials: AuthCredentials) => Promise<boolean>
  register: (input: RegisterInput) => Promise<boolean>
  loginWithGoogle: (idToken: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
  updateUser: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Silent session restore: the refresh token lives in an httpOnly
    // cookie (never in JS), so on a fresh page load the only way to know
    // whether a session still exists is to ask the backend for a new
    // access token with it.
    let cancelled = false
    ;(async () => {
      try {
        const response = await apiClient.post<{ accessToken: string }>('/auth/refresh', undefined, { skipAuthRetry: true })
        apiClient.setAccessToken(response.accessToken)
        const me = await userService.getCurrentUser()
        if (!cancelled) setUser(me)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsInitializing(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isInitializing,
      isSubmitting,
      error,
      clearError: () => setError(null),
      login: async (credentials) => {
        setIsSubmitting(true)
        setError(null)
        try {
          setUser(await authService.login(credentials))
          return true
        } catch (err) {
          setError(err instanceof Error ? err.message : 'No pudimos iniciar sesión.')
          return false
        } finally {
          setIsSubmitting(false)
        }
      },
      register: async (input) => {
        setIsSubmitting(true)
        setError(null)
        try {
          setUser(await authService.register(input))
          return true
        } catch (err) {
          setError(err instanceof Error ? err.message : 'No pudimos crear tu cuenta.')
          return false
        } finally {
          setIsSubmitting(false)
        }
      },
      loginWithGoogle: async (idToken) => {
        setIsSubmitting(true)
        setError(null)
        try {
          setUser(await authService.loginWithGoogle(idToken))
          return true
        } catch (err) {
          setError(err instanceof Error ? err.message : 'No pudimos iniciar sesión con Google.')
          return false
        } finally {
          setIsSubmitting(false)
        }
      },
      logout: () => {
        void authService.logout()
        apiClient.setAccessToken(null)
        resetCategoryCache()
        setUser(null)
      },
      updateUser: (patch) => {
        setUser((prev) => (prev ? { ...prev, ...patch } : prev))
      },
    }),
    [user, isInitializing, isSubmitting, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
