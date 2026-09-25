import { NavLink, useNavigate } from 'react-router-dom'
import logoMarkDark from '@/assets/logo-mark-dark.png'
import { NAV_ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'
import { cn } from '@/lib/cn'

// Web v2 information architecture: the same four primary destinations as
// Android's bottom bar, in the same order, plus Ajustes in the footer
// (s2_nova_stage2_handoff/S2 Nova Dashboard v2.dc.html, `aside`).
export const NAV_ITEMS: { to: string; labelKey: TranslationKey; icon: keyof typeof NAV_ICON_PATHS }[] = [
  { to: '/inicio', labelKey: 'v2.nav.inicio', icon: 'inicio' },
  { to: '/movimientos', labelKey: 'v2.nav.movimientos', icon: 'movimientos' },
  { to: '/planes', labelKey: 'v2.nav.planes', icon: 'planes' },
  { to: '/reportes', labelKey: 'v2.nav.reportes', icon: 'reportes' },
]
const FOOTER_ITEM = { to: '/ajustes', labelKey: 'v2.nav.ajustes' as TranslationKey, icon: 'ajustes' as const }

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
          'fixed inset-y-0 left-0 z-50 flex h-screen w-[213px] flex-none flex-col border-r border-v2-line bg-v2-sidebar text-v2-text transition-transform duration-200 min-[760px]:sticky min-[760px]:top-0 min-[760px]:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2.5 px-[18px] pb-[22px] pt-[18px]">
          <img src={logoMarkDark} alt="S2 Nova" className="h-[30px] w-[30px] flex-none rounded-[9px] object-cover" />
          <div>
            <div className="text-[14px] font-extrabold tracking-[-.01em]">S2 Nova</div>
            <div className="text-[9.5px] font-semibold tracking-[.1em] text-v2-dim">{t('v2.sidebar.tagline')}</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2.5" aria-label={t('sidebar.mainNavigation')}>
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} onClick={onClose} />
          ))}
          <div className="mt-auto pt-2">
            <SidebarLink item={FOOTER_ITEM} onClick={onClose} />
          </div>
        </nav>

        <div className="p-3.5">
          <div className="flex items-center gap-2.5 rounded-[12px] bg-v2-subtle p-2.5">
            <button
              type="button"
              onClick={() => navigate('/ajustes')}
              title={t('v2.sidebar.editProfile')}
              aria-label={t('v2.sidebar.editProfile')}
              className="flex h-[30px] w-[30px] flex-none cursor-pointer items-center justify-center rounded-full bg-v2-accent text-[11px] font-extrabold text-v2-text"
            >
              {user?.avatarInitials ?? 'US'}
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => navigate('/ajustes')}
                className="block w-full cursor-pointer truncate text-left text-[12.5px] font-bold text-v2-text"
              >
                {user?.name ?? t('sidebar.fallbackUserName')}
              </button>
              <button type="button" onClick={onLogout} className="block cursor-pointer text-[10.5px] font-bold text-v2-accent2">
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
          'flex items-center gap-[11px] rounded-[11px] px-3 py-[9px] text-[13px]',
          isActive ? 'bg-v2-accent font-bold text-white shadow-[0_8px_24px_rgba(108,92,231,.35)]' : 'font-semibold text-v2-muted hover:text-v2-text',
        )
      }
    >
      <StrokeIcon paths={NAV_ICON_PATHS[item.icon]} size={18} strokeWidth={2.1} />
      {t(item.labelKey)}
    </NavLink>
  )
}
