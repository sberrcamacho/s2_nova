import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/dashboard/DashboardLayout'
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
export const dashboardRoutes: RouteObject[] = [
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
]
