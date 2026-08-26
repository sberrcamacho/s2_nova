import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/dashboard/DashboardLayout'
import { ProtectedRoute } from '@/dashboard/ProtectedRoute'
import LoginPage from '@/auth/LoginPage'
import RegisterPage from '@/auth/RegisterPage'
import OverviewPage from '@/dashboard/pages/OverviewPage'
import TransactionsPage from '@/dashboard/pages/TransactionsPage'
import BudgetsPage from '@/dashboard/pages/BudgetsPage'
import GoalsPage from '@/dashboard/pages/GoalsPage'
import AnalyticsPage from '@/dashboard/pages/AnalyticsPage'
import InsightsPage from '@/dashboard/pages/InsightsPage'
import ReportsPage from '@/dashboard/pages/ReportsPage'
import SettingsPage from '@/dashboard/pages/SettingsPage'

// Primary nav is exactly 7 items (Overview, Insights, Analytics, Budgets,
// Goals, Reports, Settings) — see Sidebar.tsx. `/transactions` stays
// routable as a deep link (linked from Overview's recent-transactions
// list) without being a nav item, since its filter/sort/paginate table is
// unique functionality, not a metric page absorbed elsewhere.
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
          { index: true, element: <Navigate to="overview" replace /> },
          { path: 'overview', element: <OverviewPage /> },
          { path: 'transactions', element: <TransactionsPage /> },
          { path: 'budgets', element: <BudgetsPage /> },
          { path: 'goals', element: <GoalsPage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'insights', element: <InsightsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
]
