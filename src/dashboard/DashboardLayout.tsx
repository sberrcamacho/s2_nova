import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/dashboard/components/Sidebar'
import { Header } from '@/dashboard/components/Header'
import { DashboardFiltersProvider } from '@/dashboard/DashboardFiltersContext'

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard/overview': { title: 'Resumen', subtitle: 'Tu panorama financiero completo' },
  '/dashboard/transactions': { title: 'Transacciones', subtitle: 'Historial completo de movimientos' },
  '/dashboard/expenses': { title: 'Gastos', subtitle: 'Análisis detallado de tus gastos' },
  '/dashboard/income': { title: 'Ingresos', subtitle: 'Fuentes y evolución de tus ingresos' },
  '/dashboard/budgets': { title: 'Presupuestos', subtitle: 'Control de límites por categoría' },
  '/dashboard/analytics': { title: 'Analítica', subtitle: 'Tendencias y comparativas' },
  '/dashboard/reports': { title: 'Reportes', subtitle: 'Genera y exporta reportes financieros' },
  '/dashboard/settings': { title: 'Configuración', subtitle: 'Cuenta, preferencias y seguridad' },
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const meta = PAGE_META[location.pathname] ?? { title: 'S2 Nova', subtitle: '' }

  return (
    <DashboardFiltersProvider>
      <div className="flex h-screen overflow-hidden bg-bg-secondary">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header title={meta.title} subtitle={meta.subtitle} onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </DashboardFiltersProvider>
  )
}
