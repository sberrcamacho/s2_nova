import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  preference: ThemePreference
  setPreference: (pref: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'nova-theme-preference'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

// Defaults to following the OS/browser color-scheme preference, but a
// signed-in user can pin Light or Dark from Settings (mirrors Android's
// theme setting, which always follows the system). The choice is persisted
// locally (so it survives a refresh before the user loads) and mirrored to
// `user.preferences.theme` via userService so it follows the account.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref)
    window.localStorage.setItem(STORAGE_KEY, pref)
  }

  const theme: Theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const value = useMemo<ThemeContextValue>(() => ({ theme, preference, setPreference }), [theme, preference])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
