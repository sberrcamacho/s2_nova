import { useRoutes } from 'react-router-dom'
import { dashboardRoutes } from '@/dashboard/routes'

// Mounted at "/dashboard/*" behind React.lazy — see MobileRoutes.tsx for why.
export default function DashboardRoutes() {
  return useRoutes(dashboardRoutes)
}
