import { Navigate, Outlet } from 'react-router-dom'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { useAuth } from '@/state/AuthContext'

// Gates every dashboard route behind a real session. `isInitializing`
// covers the brief window where AuthContext is still trying a silent
// refresh-token restore on page load — redirecting to /login before that
// resolves would bounce an already-logged-in user for a flash.
export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth()

  if (isInitializing) return <SplashScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}
