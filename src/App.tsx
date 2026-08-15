import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, useRoutes } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { ModeSwitcher } from '@/components/ModeSwitcher'
import { ToastViewport } from '@/components/ui/Toast'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { ThemeProvider } from '@/state/ThemeContext'
import { ToastProvider } from '@/state/ToastContext'
import { AuthProvider } from '@/state/AuthContext'
import { AppDataProvider } from '@/state/AppDataContext'

// Code-split by surface: a visitor to the mobile app never pays for the
// dashboard's charts/table bundle, and vice versa.
const MobileRoutes = lazy(() => import('@/mobile/MobileRoutes'))
const DashboardRoutes = lazy(() => import('@/dashboard/DashboardRoutes'))

function FullScreenFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <SplashScreen />
    </div>
  )
}

const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/dashboard/overview" replace /> },
  {
    path: '/app/*',
    element: (
      <Suspense fallback={<FullScreenFallback />}>
        <MobileRoutes />
      </Suspense>
    ),
  },
  {
    path: '/dashboard/*',
    element: (
      <Suspense fallback={<FullScreenFallback />}>
        <DashboardRoutes />
      </Suspense>
    ),
  },
  { path: '*', element: <Navigate to="/dashboard/overview" replace /> },
]

function AppRoutes() {
  return useRoutes(routes)
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppDataProvider>
              <ModeSwitcher />
              <ToastViewport />
              <AppRoutes />
            </AppDataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
