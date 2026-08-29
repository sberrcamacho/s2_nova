import { NavLink } from 'react-router-dom'
import { BarChart3, FileText, Flag, Lightbulb, LayoutGrid, PiggyBank, Settings, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/state/AuthContext'
import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'
import { cn } from '@/lib/cn'

// Primary navigation is intentionally capped at exactly 7 items — the
// consolidated Information Architecture. Everything else (transaction
// detail, expenses/income/net-worth/recurring breakdowns, wallets,
// categories) lives inside these pages (Analytics' tabs, Overview's
// widgets) rather than as separate top-level destinations.
const NAV_ITEMS: { to: string; labelKey: TranslationKey; icon: typeof LayoutGrid }[] = [
  { to: '/overview', labelKey: 'nav.overview', icon: LayoutGrid },
  { to: '/insights', labelKey: 'nav.insights', icon: Lightbulb },
  { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { to: '/budgets', labelKey: 'nav.budgets', icon: PiggyBank },
  { to: '/goals', labelKey: 'nav.goals', icon: Flag },
  { to: '/reports', labelKey: 'nav.reports', icon: FileText },
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
          'fixed inset-y-0 left-0 z-50 flex w-[234px] shrink-0 flex-col border-r border-[#1c1c28] bg-[#0b0b14] transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-[18px] pb-[22px] pt-[18px]">
          <Logo size="sm" tone="inverted" />
          <button className="text-white/50 lg:hidden" onClick={onClose} aria-label={t('sidebar.closeMenu')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2" aria-label={t('sidebar.mainNavigation')}>
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} onClick={onClose} />
          ))}

          <div className="mt-auto flex flex-col gap-1 pt-2">
            <SidebarLink item={{ to: '/settings', labelKey: 'nav.settings', icon: Settings }} onClick={onClose} />
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-white/5 p-3">
            <Avatar initials={user?.avatarInitials ?? 'US'} size="sm" className="h-[30px] w-[30px] text-[11px]" />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-bold text-white">{user?.name ?? t('sidebar.fallbackUserName')}</p>
              <p className="truncate text-[10.5px] font-medium text-white/45">{user?.email ?? ''}</p>
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
          'flex items-center gap-[11px] rounded-[11px] px-3 py-[9px] text-[13px] font-semibold transition-colors',
          isActive
            ? 'bg-primary font-bold text-on-primary shadow-[var(--shadow-primary)]'
            : 'text-white/55 hover:bg-white/8 hover:text-white',
        )
      }
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
      {t(item.labelKey)}
    </NavLink>
  )
}
