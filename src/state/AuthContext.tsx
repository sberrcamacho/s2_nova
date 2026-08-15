import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService } from '@/services/authService'
import type { AuthCredentials, RegisterInput, User } from '@/types'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isInitializing: boolean
  isSubmitting: boolean
  error: string | null
  login: (credentials: AuthCredentials) => Promise<boolean>
  register: (input: RegisterInput) => Promise<boolean>
  logout: () => void
  clearError: () => void
  updateUser: (patch: Partial<User>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const STORAGE_KEY = 's2nova.session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        setUser(JSON.parse(raw))
      } catch {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    }
    setIsInitializing(false)
  }, [])

  const persist = (nextUser: User | null) => {
    setUser(nextUser)
    if (nextUser) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

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
          const loggedInUser = await authService.login(credentials)
          persist(loggedInUser)
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
          const newUser = await authService.register(input)
          persist(newUser)
          return true
        } catch (err) {
          setError(err instanceof Error ? err.message : 'No pudimos crear tu cuenta.')
          return false
        } finally {
          setIsSubmitting(false)
        }
      },
      logout: () => persist(null),
      updateUser: (patch) => {
        setUser((prev) => {
          if (!prev) return prev
          const next = { ...prev, ...patch }
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          return next
        })
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
