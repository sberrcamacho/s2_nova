import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/dashboard/components/Sidebar'
import { Header } from '@/dashboard/components/Header'
import { DashboardFiltersProvider } from '@/dashboard/DashboardFiltersContext'

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/overview': { title: 'Resumen', subtitle: 'Tu panorama financiero completo' },
  '/transactions': { title: 'Transacciones', subtitle: 'Historial completo de movimientos' },
  '/expenses': { title: 'Gastos', subtitle: 'Análisis detallado de tus gastos' },
  '/income': { title: 'Ingresos', subtitle: 'Fuentes y evolución de tus ingresos' },
  '/budgets': { title: 'Presupuestos', subtitle: 'Control de límites por categoría' },
  '/categories': { title: 'Categorías', subtitle: 'Distribución de tu gasto por categoría' },
  '/analytics': { title: 'Analítica', subtitle: 'Tendencias y comparativas' },
  '/reports': { title: 'Reportes', subtitle: 'Tendencias históricas y exportación' },
  '/settings': { title: 'Configuración', subtitle: 'Cuenta, preferencias y seguridad' },
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
          <Header title={meta.title} onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto mb-5 max-w-[1400px]">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink">{meta.title}</h1>
              {meta.subtitle && <p className="mt-0.5 text-sm font-medium text-ink-tertiary">{meta.subtitle}</p>}
            </div>
            <div className="mx-auto max-w-[1400px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </DashboardFiltersProvider>
  )
}
