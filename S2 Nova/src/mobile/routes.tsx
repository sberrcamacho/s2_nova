import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { AppLayout } from '@/mobile/layouts/AppLayout'
import LoginScreen from '@/mobile/screens/LoginScreen'
import RegisterScreen from '@/mobile/screens/RegisterScreen'
import ForgotPasswordScreen from '@/mobile/screens/ForgotPasswordScreen'
import HomeScreen from '@/mobile/screens/HomeScreen'
import TransactionsScreen from '@/mobile/screens/TransactionsScreen'
import AddTransactionScreen from '@/mobile/screens/AddTransactionScreen'
import ScannerScreen from '@/mobile/screens/ScannerScreen'
import BudgetsScreen from '@/mobile/screens/BudgetsScreen'
import StatisticsScreen from '@/mobile/screens/StatisticsScreen'
import ProfileScreen from '@/mobile/screens/ProfileScreen'
import SettingsScreen from '@/mobile/screens/SettingsScreen'

export const mobileRoutes: RouteObject[] = [
  { index: true, element: <Navigate to="home" replace /> },
  { path: 'login', element: <LoginScreen /> },
  { path: 'register', element: <RegisterScreen /> },
  { path: 'forgot-password', element: <ForgotPasswordScreen /> },
  {
    element: <AppLayout />,
    children: [
      { path: 'home', element: <HomeScreen /> },
      { path: 'transactions', element: <TransactionsScreen /> },
      { path: 'add', element: <AddTransactionScreen /> },
      { path: 'scan', element: <ScannerScreen /> },
      { path: 'budgets', element: <BudgetsScreen /> },
      { path: 'statistics', element: <StatisticsScreen /> },
      { path: 'profile', element: <ProfileScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
    ],
  },
]
