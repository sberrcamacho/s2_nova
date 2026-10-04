import { NavLink, useNavigate } from 'react-router-dom'
import logoMarkDark from '@/assets/logo-mark-dark.png'
import { NAV_ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'
import { cn } from '@/lib/cn'

// Web v2 information architecture: the same four primary destinations as
// Android's bottom bar, in the same order, plus Billeteras and Ajustes in
// the footer (S2 Nova Dashboard v2.dc.html, `aside`, navFooter).
export const NAV_ITEMS: { to: string; labelKey: TranslationKey; icon: keyof typeof NAV_ICON_PATHS }[] = [
  { to: '/inicio', labelKey: 'v2.nav.inicio', icon: 'inicio' },
  { to: '/movimientos', labelKey: 'v2.nav.movimientos', icon: 'movimientos' },
  { to: '/planes', labelKey: 'v2.nav.planes', icon: 'planes' },
  { to: '/reportes', labelKey: 'v2.nav.reportes', icon: 'reportes' },
]
const FOOTER_ITEMS: { to: string; labelKey: TranslationKey; icon: keyof typeof NAV_ICON_PATHS }[] = [
  { to: '/billeteras', labelKey: 'v2.nav.billeteras', icon: 'billeteras' },
  { to: '/ajustes', labelKey: 'v2.nav.ajustes', icon: 'ajustes' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const onLogout = () => {
    logout()
    showToast(t('header.sessionClosed'), 'info')
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-[rgba(6,6,12,.5)] min-[760px]:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-[240px] flex-none flex-col border-r border-v2-line bg-v2-sidebar text-v2-text transition-transform duration-200 min-[760px]:sticky min-[760px]:top-0 min-[760px]:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-5 pb-8 pt-6">
          <img src={logoMarkDark} alt="S2 Nova" className="h-9 w-9 flex-none rounded-[10px] object-cover shadow-[var(--cta-glow)]" />
          <div className="min-w-0">
            <div className="text-title-sm font-semibold tracking-[-.01em]">S2 Nova</div>
            <div className="truncate text-caption font-medium text-v2-dim">{t('v2.sidebar.tagline')}</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label={t('sidebar.mainNavigation')}>
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} onClick={onClose} />
          ))}
          <div className="mt-auto flex flex-col gap-1 border-t border-v2-line pt-4">
            {FOOTER_ITEMS.map((item) => (
              <SidebarLink key={item.to} item={item} onClick={onClose} />
            ))}
          </div>
        </nav>

        <div className="p-3">
          <div className="flex items-center gap-3 rounded-[14px] border border-v2-line bg-v2-surface p-2.5">
            <button
              type="button"
              onClick={() => navigate('/ajustes/perfil')}
              title={t('v2.sidebar.editProfile')}
              aria-label={t('v2.sidebar.editProfile')}
              className="btn-cta flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full text-caption font-semibold"
            >
              {user?.avatarInitials ?? 'US'}
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => navigate('/ajustes/perfil')}
                className="block w-full cursor-pointer truncate text-left text-label font-semibold text-v2-text"
              >
                {user?.name ?? t('sidebar.fallbackUserName')}
              </button>
              <button type="button" onClick={onLogout} className="block min-h-6 cursor-pointer text-caption font-semibold text-v2-accent2 hover:underline">
                {t('v2.sidebar.logout')}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function SidebarLink({ item, onClick }: { item: { to: string; labelKey: TranslationKey; icon: keyof typeof NAV_ICON_PATHS }; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group relative flex min-h-10 items-center gap-3 overflow-hidden rounded-[12px] border px-3 py-2 text-body-sm transition-colors duration-150',
          isActive
            ? 'border-[var(--nav-active-line)] font-semibold text-v2-text [background:var(--nav-active-bg)]'
            : 'border-transparent font-medium text-v2-muted hover:bg-v2-surface hover:text-v2-text',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* The active item carries a brand bar as well as its fill and weight. */}
          {isActive && <span aria-hidden="true" className="nova-nav-bar absolute inset-y-1.5 left-0 w-[3px] rounded-r-full" style={{ background: 'var(--brand-bar)' }} />}
          <span className={cn('nova-nav-icon', isActive && 'text-[var(--nav-active-icon)]')}>
            <StrokeIcon paths={NAV_ICON_PATHS[item.icon]} size={19} strokeWidth={1.9} />
          </span>
          {t(item.labelKey)}
        </>
      )}
    </NavLink>
  )
}
