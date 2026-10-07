import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/dashboard/DashboardLayout'
import { ProtectedRoute } from '@/dashboard/ProtectedRoute'
import { AccountOnly } from '@/dashboard/AccountOnly'
import LoginPage from '@/auth/LoginPage'
import RegisterPage from '@/auth/RegisterPage'
import { RecuperarPage, NuevaContrasenaPage } from '@/auth/RecoveryPages'
import FirstRunPage from '@/auth/FirstRunPage'
import { HomeRoute } from '@/landing/HomeRoute'
import InicioPage from '@/dashboard/pages/InicioPage'
import MovimientosPage from '@/dashboard/pages/MovimientosPage'
import PlanesPage from '@/dashboard/pages/PlanesPage'
import ReportesPage from '@/dashboard/pages/ReportesPage'
import AjustesPage from '@/dashboard/pages/AjustesPage'
import BilleterasPage from '@/dashboard/pages/BilleterasPage'
import CategoriasPage from '@/dashboard/pages/ajustes/CategoriasPage'
import ContrasenaPage from '@/dashboard/pages/ajustes/ContrasenaPage'
import EliminarPage from '@/dashboard/pages/ajustes/EliminarPage'
import ImportarPage from '@/dashboard/pages/ajustes/ImportarPage'
import RestablecerPage from '@/dashboard/pages/ajustes/RestablecerPage'
import PerfilPage from '@/dashboard/pages/ajustes/PerfilPage'
import MonedasPage from '@/dashboard/pages/ajustes/MonedasPage'
import SesionesPage from '@/dashboard/pages/ajustes/SesionesPage'

// Web v2 information architecture (root AGENTS.md, STAGE-2-INICIO §2):
// Inicio · Movimientos · Planes · Reportes, plus Billeteras and Ajustes. The pre-v2 paths
// redirect so old bookmarks keep working; Analytics, Insights and the old
// Reports page all fold into Reportes.
//
// /login and /register sit outside DashboardLayout/ProtectedRoute — they
// must render for a signed-out visitor, which every other route can't.
export const dashboardRoutes: RouteObject[] = [
  // `/`: the public front page signed out, Inicio signed in.
  { index: true, element: <HomeRoute /> },
  { path: 'login', element: <LoginPage /> },
  { path: 'register', element: <RegisterPage /> },
  { path: 'recuperar', element: <RecuperarPage /> },
  { path: 'restablecer', element: <NuevaContrasenaPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: 'inicio', element: <InicioPage /> },
          { path: 'movimientos', element: <MovimientosPage /> },
          { path: 'planes', element: <PlanesPage /> },
          { path: 'reportes', element: <ReportesPage /> },
          { path: 'billeteras', element: <BilleterasPage /> },
          { path: 'ajustes', element: <AjustesPage /> },
          { path: 'ajustes/perfil', element: <AccountOnly><PerfilPage /></AccountOnly> },
          { path: 'ajustes/contrasena', element: <AccountOnly><ContrasenaPage /></AccountOnly> },
          { path: 'ajustes/sesiones', element: <SesionesPage /> },
          { path: 'ajustes/eliminar', element: <AccountOnly><EliminarPage /></AccountOnly> },
          { path: 'ajustes/restablecer', element: <AccountOnly><RestablecerPage /></AccountOnly> },
          { path: 'ajustes/importar', element: <ImportarPage /> },
          { path: 'ajustes/monedas', element: <MonedasPage /> },
          { path: 'ajustes/categorias', element: <CategoriasPage /> },
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
      // First run (ONBOARDING.md §2): signed in, but outside the app shell.
      { path: 'bienvenida', element: <FirstRunPage /> },
    ],
  },
]
