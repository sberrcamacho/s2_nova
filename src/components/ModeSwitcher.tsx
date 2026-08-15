import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Smartphone } from 'lucide-react'
import { cn } from '@/lib/cn'

// Dev/demo convenience only — lets a visitor jump between the two S2 Nova
// surfaces (mobile app and web dashboard) that this single project hosts.
export function ModeSwitcher() {
  return (
    <div className="fixed left-1/2 top-3 z-[150] flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-surface-elevated p-1 shadow-[var(--shadow-md)]">
      <ModeLink to="/app" icon={<Smartphone className="h-3.5 w-3.5" />} label="App móvil" />
      <ModeLink to="/dashboard" icon={<LayoutDashboard className="h-3.5 w-3.5" />} label="Dashboard" />
    </div>
  )
}

function ModeLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition-all',
          isActive ? 'bg-primary text-on-primary shadow-[var(--shadow-primary)]' : 'text-ink-secondary hover:text-ink',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
