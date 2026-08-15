import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/state/AuthContext'
import { BottomNav } from '@/mobile/components/BottomNav'
import { SplashScreen } from '@/components/ui/SplashScreen'

export function AppLayout() {
  const { isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) return <SplashScreen />

  if (!isAuthenticated) {
    return <Navigate to="/app/login" state={{ from: location.pathname }} replace />
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
