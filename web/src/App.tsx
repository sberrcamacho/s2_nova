import { useEffect, useRef } from 'react'
import { BrowserRouter, useRoutes } from 'react-router-dom'
import { ToastViewport } from '@/components/ui/Toast'
import { ThemeProvider, useTheme } from '@/state/ThemeContext'
import { ToastProvider } from '@/state/ToastContext'
import { AuthProvider, useAuth } from '@/state/AuthContext'
import { AppDataProvider } from '@/state/AppDataContext'
import { dashboardRoutes } from '@/dashboard/routes'

function AppRoutes() {
  return useRoutes(dashboardRoutes)
}

// Applies the signed-in user's saved theme preference once per session load
// (login, or a restored session) without clobbering a change the user just
// made locally in Settings before this effect re-runs.
function ThemePreferenceSync() {
  const { user } = useAuth()
  const { preference, setPreference } = useTheme()
  const syncedUserId = useRef<string | null>(null)

  useEffect(() => {
    if (!user || syncedUserId.current === user.id) return
    syncedUserId.current = user.id
    if (user.preferences.theme !== preference) setPreference(user.preferences.theme)
  }, [user, preference, setPreference])

  return null
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppDataProvider>
              <ThemePreferenceSync />
              <ToastViewport />
              <AppRoutes />
            </AppDataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
