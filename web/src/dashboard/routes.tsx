import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/dashboard/DashboardLayout'
import { ProtectedRoute } from '@/dashboard/ProtectedRoute'
import LoginPage from '@/auth/LoginPage'
import RegisterPage from '@/auth/RegisterPage'
import InicioPage from '@/dashboard/pages/InicioPage'
import MovimientosPage from '@/dashboard/pages/MovimientosPage'
import PlanesPage from '@/dashboard/pages/PlanesPage'
import ReportesPage from '@/dashboard/pages/ReportesPage'
import AjustesPage from '@/dashboard/pages/AjustesPage'
import ContrasenaPage from '@/dashboard/pages/ajustes/ContrasenaPage'
import EliminarPage from '@/dashboard/pages/ajustes/EliminarPage'
import PerfilPage from '@/dashboard/pages/ajustes/PerfilPage'
import SesionesPage from '@/dashboard/pages/ajustes/SesionesPage'

// Web v2 information architecture (root AGENTS.md, STAGE-2-INICIO §2):
// Inicio · Movimientos · Planes · Reportes, plus Ajustes. The pre-v2 paths
// redirect so old bookmarks keep working; Analytics, Insights and the old
// Reports page all fold into Reportes.
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
          { path: 'reportes', element: <ReportesPage /> },
          { path: 'ajustes', element: <AjustesPage /> },
          { path: 'ajustes/perfil', element: <PerfilPage /> },
          { path: 'ajustes/contrasena', element: <ContrasenaPage /> },
          { path: 'ajustes/sesiones', element: <SesionesPage /> },
          { path: 'ajustes/eliminar', element: <EliminarPage /> },
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
