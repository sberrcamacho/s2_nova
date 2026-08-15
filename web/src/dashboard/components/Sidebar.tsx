import { NavLink } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  FileText,
  LayoutGrid,
  Receipt,
  Settings,
  Shapes,
  Wallet,
  X,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/state/AuthContext'
import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'
import { cn } from '@/lib/cn'

const TOP_ITEM = { to: '/overview', labelKey: 'nav.overview' as TranslationKey, icon: LayoutGrid }

const NAV_GROUPS = [
  {
    labelKey: 'nav.group.transactions' as TranslationKey,
    items: [
      { to: '/transactions', labelKey: 'nav.transactions' as TranslationKey, icon: Receipt },
      { to: '/expenses', labelKey: 'nav.expenses' as TranslationKey, icon: ArrowUpRight },
      { to: '/income', labelKey: 'nav.income' as TranslationKey, icon: ArrowDownLeft },
    ],
  },
  {
    labelKey: 'nav.group.planning' as TranslationKey,
    items: [
      { to: '/budgets', labelKey: 'nav.budgets' as TranslationKey, icon: Wallet },
      { to: '/categories', labelKey: 'nav.categories' as TranslationKey, icon: Shapes },
    ],
  },
  {
    labelKey: 'nav.group.analysis' as TranslationKey,
    items: [
      { to: '/analytics', labelKey: 'nav.analytics' as TranslationKey, icon: BarChart3 },
      { to: '/reports', labelKey: 'nav.reports' as TranslationKey, icon: FileText },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth()
  const { t } = useTranslation()

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-[var(--color-overlay)] lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[252px] shrink-0 flex-col border-r border-[#1c1c28] bg-[#0b0b14] transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo size="sm" tone="inverted" />
          <button className="text-white/50 lg:hidden" onClick={onClose} aria-label={t('sidebar.closeMenu')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2" aria-label="Navegación principal">
          <SidebarLink item={TOP_ITEM} onClick={onClose} />

          {NAV_GROUPS.map((group) => (
            <div key={group.labelKey}>
              <p className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-white/35">
                {t(group.labelKey)}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <SidebarLink key={item.to} item={item} onClick={onClose} />
                ))}
              </div>
            </div>
          ))}

          <div className="mt-auto flex flex-col gap-1 pt-2">
            <SidebarLink item={{ to: '/settings', labelKey: 'nav.settings', icon: Settings }} onClick={onClose} />
          </div>
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-white/5 p-3">
            <Avatar initials={user?.avatarInitials ?? 'US'} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-white">{user?.name ?? 'Usuario S2 Nova'}</p>
              <p className="text-[11px] font-medium text-white/45">{t('sidebar.demoAccount')}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function SidebarLink({
  item,
  onClick,
}: {
  item: { to: string; labelKey: TranslationKey; icon: typeof LayoutGrid }
  onClick: () => void
}) {
  const { t } = useTranslation()
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
          isActive ? 'bg-primary text-on-primary shadow-[var(--shadow-primary)]' : 'text-white/60 hover:bg-white/8 hover:text-white',
        )
      }
    >
      <item.icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
      {t(item.labelKey)}
    </NavLink>
  )
}
