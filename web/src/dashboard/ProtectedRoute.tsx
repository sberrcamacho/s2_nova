import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { useAuth } from '@/state/AuthContext'

// Gates every dashboard route behind a real session. `isInitializing`
// covers the brief window where AuthContext is still trying a silent
// refresh-token restore on page load — redirecting to /login before that
// resolves would bounce an already-logged-in user for a flash.
export function ProtectedRoute() {
  const { user, isAuthenticated, isInitializing } = useAuth()
  const { pathname } = useLocation()

  if (isInitializing) return <SplashScreen />
  // A new account goes through the first run (ONBOARDING.md §2) before
  // anything else, and can't return to it once done. Its back arrow signs
  // out and returns to Crear cuenta.
  const firstRun = pathname === '/bienvenida'
  if (!isAuthenticated) return <Navigate to={firstRun ? '/register' : '/login'} replace />
  if (user && !user.onboardingCompleted && !firstRun) return <Navigate to="/bienvenida" replace />
  if (user?.onboardingCompleted && firstRun) return <Navigate to="/inicio" replace />

  return <Outlet />
}
