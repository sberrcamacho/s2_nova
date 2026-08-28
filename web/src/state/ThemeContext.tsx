import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
}

// Always follows the OS/browser color-scheme preference live — no manual
// override, no persisted choice. If a per-user theme toggle is ever wanted
// again, reintroduce it deliberately rather than restoring this from history.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const theme: Theme = systemDark ? 'dark' : 'light'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const value = useMemo<ThemeContextValue>(() => ({ theme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
