import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/dashboard/DashboardLayout'
import { ProtectedRoute } from '@/dashboard/ProtectedRoute'
import LoginPage from '@/auth/LoginPage'
import RegisterPage from '@/auth/RegisterPage'
import InicioPage from '@/dashboard/pages/InicioPage'
import MovimientosPage from '@/dashboard/pages/MovimientosPage'
import PlanesPage from '@/dashboard/pages/PlanesPage'
import AnalyticsPage from '@/dashboard/pages/AnalyticsPage'
import SettingsPage from '@/dashboard/pages/SettingsPage'

// Web v2 information architecture (root AGENTS.md, STAGE-2-INICIO §2):
// Inicio · Movimientos · Planes · Reportes, plus Ajustes. The pre-v2 paths
// redirect so old bookmarks keep working. Insights and the old Reports page
// are no longer routed (their content folds into Reportes in its stage).
//
// /login and /register sit outside DashboardLayout/ProtectedRoute — they
// must render for a signed-out visitor, which every other route can't.
export const dashboardRoutes: RouteObject[] = [
  { path: 'login', element: <LoginPage /> },
  { path: 'register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="/inicio" replace /> },
          { path: 'inicio', element: <InicioPage /> },
          { path: 'movimientos', element: <MovimientosPage /> },
          { path: 'planes', element: <PlanesPage /> },
          { path: 'reportes', element: <AnalyticsPage /> },
          { path: 'ajustes', element: <SettingsPage /> },
          { path: 'overview', element: <Navigate to="/inicio" replace /> },
          { path: 'transactions', element: <Navigate to="/movimientos" replace /> },
          { path: 'budgets', element: <Navigate to="/planes?tab=presupuestos" replace /> },
          { path: 'goals', element: <Navigate to="/planes?tab=metas" replace /> },
          { path: 'analytics', element: <Navigate to="/reportes" replace /> },
          { path: 'insights', element: <Navigate to="/reportes" replace /> },
          { path: 'reports', element: <Navigate to="/reportes" replace /> },
          { path: 'settings', element: <Navigate to="/ajustes" replace /> },
        ],
      },
    ],
  },
]
