import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiClient, setGuestHandler, setSessionEndedHandler, type SessionEndReason } from '@/lib/apiClient'
import { resetCategoryCache } from '@/lib/backendCategories'
import { createGuestApi } from '@/lib/guestApi'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { useIdleLogout } from '@/state/useIdleLogout'
import { setCurrentLanguage, tr, translate } from '@/lib/i18n/translations'
import type { AuthCredentials, LanguageCode, RegisterInput, User } from '@/types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isInitializing: boolean
  isSubmitting: boolean
  error: string | null
  login: (credentials: AuthCredentials) => Promise<boolean>
  register: (input: RegisterInput) => Promise<boolean>
  loginWithGoogle: (idToken: string) => Promise<boolean>
  enterGuest: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  updateUser: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Signing out in one tab signs out the others (they share the session).
const AUTH_CHANNEL = 's2nova-auth'

function openChannel(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(AUTH_CHANNEL)
  } catch {
    return null
  }
}

// Signed out, screens read in the last signed-in user's language.
const LAST_LANGUAGE_KEY = 's2nova.language'

function lastLanguage(): LanguageCode {
  try {
    return localStorage.getItem(LAST_LANGUAGE_KEY) === 'en' ? 'en' : 'es'
  } catch {
    return 'es'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Before the children render, so helpers outside React agree with them.
  const language = user?.preferences.language ?? lastLanguage()
  setCurrentLanguage(language)
  useEffect(() => {
    if (!user) return
    try {
      localStorage.setItem(LAST_LANGUAGE_KEY, user.preferences.language)
    } catch {
      // Private mode: signed-out screens fall back to Spanish.
    }
  }, [user])

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

  // Clears everything this tab holds about the session. `notice` is shown on
  // Login (why the user landed there, if it wasn't their own doing).
  const clearSession = useCallback((notice: string | null) => {
    setGuestHandler(null)
    apiClient.setAccessToken(null)
    resetCategoryCache()
    setUser(null)
    setError(notice)
  }, [])

  const noticeFor = useCallback(
    (reason: SessionEndReason) => translate(reason === 'idle' ? 'auth.sessionIdle' : 'auth.sessionExpired', language),
    [language],
  )

  // Ends the session for real: the server revokes it before this tab and
  // the others forget it.
  const endSession = useCallback(
    async (notice: string | null) => {
      await authService.logout()
      clearSession(notice)
      openChannel()?.postMessage({ type: 'logout', notice })
    },
    [clearSession],
  )

  // A request found the session over (expired, closed from another device,
  // or ended by the server's own idle check).
  useEffect(() => {
    setSessionEndedHandler((reason) => clearSession(noticeFor(reason)))
    return () => setSessionEndedHandler(null)
  }, [clearSession, noticeFor])

  useEffect(() => {
    const channel = openChannel()
    if (!channel) return
    channel.onmessage = (event: MessageEvent<{ type?: string; notice?: string | null }>) => {
      if (event.data?.type === 'logout') clearSession(event.data.notice ?? null)
    }
    return () => channel.close()
  }, [clearSession])

  useIdleLogout(
    user?.preferences.autoLockMinutes ?? 0,
    !!user,
    () => void endSession(noticeFor('idle')),
    () => {
      if (!user?.isGuest) void authService.activity()
    },
  )

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
          setError(err instanceof Error ? err.message : tr('auth.err.login'))
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
          setError(err instanceof Error ? err.message : tr('auth.err.register'))
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
          setError(err instanceof Error ? err.message : tr('auth.err.google'))
          return false
        } finally {
          setIsSubmitting(false)
        }
      },
      // "Continuar como invitado" (ONBOARDING.md §1): the example account,
      // answered in memory by lib/guestApi.ts until the guest signs out.
      enterGuest: async () => {
        setGuestHandler(createGuestApi())
        resetCategoryCache()
        const me = await userService.getCurrentUser()
        setUser({ ...me, isGuest: true })
      },
      logout: () => endSession(null),
      updateUser: (patch) => {
        setUser((prev) => (prev ? { ...prev, ...patch } : prev))
      },
    }),
    [user, isInitializing, isSubmitting, error, endSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
