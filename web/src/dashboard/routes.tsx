import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/dashboard/DashboardLayout'
import OverviewPage from '@/dashboard/pages/OverviewPage'
import TransactionsPage from '@/dashboard/pages/TransactionsPage'
import ExpensesPage from '@/dashboard/pages/ExpensesPage'
import IncomePage from '@/dashboard/pages/IncomePage'
import BudgetsPage from '@/dashboard/pages/BudgetsPage'
import CategoriesPage from '@/dashboard/pages/CategoriesPage'
import AnalyticsPage from '@/dashboard/pages/AnalyticsPage'
import ReportsPage from '@/dashboard/pages/ReportsPage'
import SettingsPage from '@/dashboard/pages/SettingsPage'

export const dashboardRoutes: RouteObject[] = [
  {
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Navigate to="overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'expenses', element: <ExpensesPage /> },
      { path: 'income', element: <IncomePage /> },
      { path: 'budgets', element: <BudgetsPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]
