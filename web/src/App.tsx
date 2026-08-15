import { BrowserRouter, useRoutes } from 'react-router-dom'
import { ToastViewport } from '@/components/ui/Toast'
import { ThemeProvider } from '@/state/ThemeContext'
import { ToastProvider } from '@/state/ToastContext'
import { AuthProvider } from '@/state/AuthContext'
import { AppDataProvider } from '@/state/AppDataContext'
import { dashboardRoutes } from '@/dashboard/routes'

function AppRoutes() {
  return useRoutes(dashboardRoutes)
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppDataProvider>
              <ToastViewport />
              <AppRoutes />
            </AppDataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
