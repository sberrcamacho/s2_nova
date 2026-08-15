import { NavLink } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  FileText,
  LayoutGrid,
  Receipt,
  Settings,
  Wallet,
  X,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/cn'

const NAV_ITEMS = [
  { to: '/dashboard/overview', label: 'Resumen', icon: LayoutGrid },
  { to: '/dashboard/transactions', label: 'Transacciones', icon: Receipt },
  { to: '/dashboard/expenses', label: 'Gastos', icon: ArrowUpRight },
  { to: '/dashboard/income', label: 'Ingresos', icon: ArrowDownLeft },
  { to: '/dashboard/budgets', label: 'Presupuestos', icon: Wallet },
  { to: '/dashboard/analytics', label: 'Analítica', icon: BarChart3 },
  { to: '/dashboard/reports', label: 'Reportes', icon: FileText },
  { to: '/dashboard/settings', label: 'Configuración', icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-[var(--color-overlay)] lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo size="sm" />
          <button className="text-ink-tertiary lg:hidden" onClick={onClose} aria-label="Cerrar menú">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
                  isActive
                    ? 'bg-accent-soft text-primary'
                    : 'text-ink-secondary hover:bg-bg-secondary hover:text-ink',
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="rounded-[var(--radius-md)] bg-bg-secondary p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-tertiary">S2 Nova</p>
            <p className="mt-1 text-xs font-medium text-ink-secondary">Datos de demostración · sin conexión a un backend real.</p>
          </div>
        </div>
      </aside>
    </>
  )
}
