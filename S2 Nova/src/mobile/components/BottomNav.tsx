import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, Barcode, Home, PencilLine, Receipt, User, Wallet, X } from 'lucide-react'
import { cn } from '@/lib/cn'

const TABS = [
  { to: '/app/home', label: 'Inicio', icon: Home },
  { to: '/app/transactions', label: 'Movimientos', icon: Receipt },
  { to: '/app/budgets', label: 'Presupuestos', icon: Wallet },
  { to: '/app/statistics', label: 'Estadísticas', icon: BarChart3 },
  { to: '/app/profile', label: 'Perfil', icon: User },
]

export function BottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      {sheetOpen && (
        <div className="absolute inset-0 z-30 flex items-end justify-center" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 animate-fade-in bg-[var(--color-overlay)]" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 mb-24 flex w-[86%] animate-fade-in flex-col gap-2 rounded-[var(--radius-lg)] border border-border bg-surface-elevated p-3 shadow-[var(--shadow-lg)]"
          >
            <div className="mb-1 flex items-center justify-between px-1.5">
              <p className="text-[13px] font-bold text-ink">Agregar movimiento</p>
              <button aria-label="Cerrar" onClick={() => setSheetOpen(false)} className="text-ink-tertiary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => {
                setSheetOpen(false)
                navigate('/app/add')
              }}
              className="flex items-center gap-3 rounded-[var(--radius-md)] p-3 text-left transition-colors hover:bg-bg-secondary"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-primary">
                <PencilLine className="h-[18px] w-[18px]" />
              </span>
              <span>
                <p className="text-[13.5px] font-bold text-ink">Agregar manualmente</p>
                <p className="text-xs text-ink-tertiary">Registra un ingreso o gasto</p>
              </span>
            </button>
            <button
              onClick={() => {
                setSheetOpen(false)
                navigate('/app/scan')
              }}
              className="flex items-center gap-3 rounded-[var(--radius-md)] p-3 text-left transition-colors hover:bg-bg-secondary"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-primary">
                <Barcode className="h-[18px] w-[18px]" />
              </span>
              <span>
                <p className="text-[13.5px] font-bold text-ink">Escanear código de barras</p>
                <p className="text-xs text-ink-tertiary">Identifica un producto y registra la compra</p>
              </span>
            </button>
          </div>
        </div>
      )}

      <nav className="relative z-20 flex items-center justify-around border-t border-border bg-surface/95 px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        {TABS.slice(0, 2).map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}

        <button
          aria-label="Agregar movimiento"
          onClick={() => setSheetOpen((o) => !o)}
          className="relative -mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-secondary text-on-primary shadow-[var(--shadow-primary)] transition-transform active:scale-95"
        >
          <PencilLine className="h-6 w-6" strokeWidth={2.25} />
        </button>

        {TABS.slice(2).map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
      </nav>
    </>
  )
}

function TabLink({ to, label, icon: Icon }: (typeof TABS)[number]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex w-14 flex-col items-center gap-1 rounded-[var(--radius-sm)] py-1 text-[10px] font-semibold transition-colors',
          isActive ? 'text-primary' : 'text-ink-tertiary hover:text-ink-secondary',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
          {label}
        </>
      )}
    </NavLink>
  )
}
