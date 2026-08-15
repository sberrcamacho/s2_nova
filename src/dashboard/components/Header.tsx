import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Calendar, ChevronDown, LogOut, Menu, Moon, Settings, Sun, User } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown } from '@/components/ui/Dropdown'
import { IconButton } from '@/components/ui/IconButton'
import { useAuth } from '@/state/AuthContext'
import { useTheme } from '@/state/ThemeContext'
import { useToast } from '@/state/ToastContext'
import { DATE_RANGE_OPTIONS, useDashboardFilters } from '@/dashboard/DashboardFiltersContext'
import { notifications as mockNotifications } from '@/data/notifications'
import { cn } from '@/lib/cn'

interface HeaderProps {
  title: string
  subtitle?: string
  onMenuClick: () => void
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const { range, setRange, rangeLabel } = useDashboardFilters()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [rangeOpen, setRangeOpen] = useState(false)
  const unreadCount = mockNotifications.filter((n) => !n.read).length

  const onLogout = () => {
    logout()
    showToast('Sesión cerrada', 'info')
    navigate('/app/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <IconButton icon={<Menu className="h-5 w-5" />} label="Abrir menú" variant="ghost" className="lg:hidden" onClick={onMenuClick} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="truncate text-xs font-medium text-ink-tertiary">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <button
            onClick={() => setRangeOpen((o) => !o)}
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-[13px] font-semibold text-ink-secondary transition-colors hover:border-border-strong"
          >
            <Calendar className="h-4 w-4" />
            {rangeLabel}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {rangeOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 min-w-[180px] animate-fade-in rounded-[var(--radius-md)] border border-border bg-surface-elevated p-1.5 shadow-[var(--shadow-lg)]">
              {DATE_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setRange(opt.value)
                    setRangeOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-medium transition-colors',
                    range === opt.value ? 'bg-accent-soft text-primary' : 'text-ink hover:bg-bg-secondary',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <IconButton
          icon={theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          label="Cambiar tema"
          variant="ghost"
          onClick={toggleTheme}
        />

        <Dropdown
          align="right"
          trigger={
            <IconButton
              icon={
                <span className="relative">
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-negative" />}
                </span>
              }
              label="Notificaciones"
              variant="ghost"
            />
          }
          items={mockNotifications.slice(0, 4).map((n) => ({
            label: n.title,
            onSelect: () => showToast(n.message, n.tone === 'warning' ? 'error' : n.tone === 'positive' ? 'success' : 'info'),
          }))}
        />

        <Dropdown
          align="right"
          trigger={<Avatar initials={user?.avatarInitials ?? 'US'} size="sm" className="cursor-pointer" />}
          items={[
            { label: 'Mi perfil', icon: <User className="h-4 w-4" />, onSelect: () => navigate('/dashboard/settings') },
            { label: 'Configuración', icon: <Settings className="h-4 w-4" />, onSelect: () => navigate('/dashboard/settings') },
            { label: 'Cerrar sesión', icon: <LogOut className="h-4 w-4" />, onSelect: onLogout, destructive: true },
          ]}
        />
      </div>
    </header>
  )
}
