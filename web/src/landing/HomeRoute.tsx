import { Navigate } from 'react-router-dom'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { useAuth } from '@/state/AuthContext'
import LandingPage from '@/landing/LandingPage'

// Waits for the silent session restore so a signed-in user isn't shown the
// front page for a flash; ProtectedRoute takes it from /inicio (first run
// included).
export function HomeRoute() {
  const { isAuthenticated, isInitializing } = useAuth()
  if (isInitializing) return <SplashScreen />
  if (isAuthenticated) return <Navigate to="/inicio" replace />
  return <LandingPage />
}
