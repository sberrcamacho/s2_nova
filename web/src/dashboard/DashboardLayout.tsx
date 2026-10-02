import { tr } from '@/lib/i18n/translations'
import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/dashboard/components/Sidebar'
import { GuideCard } from '@/dashboard/components/GuideCard'
import { Header } from '@/dashboard/components/Header'
import { NewTransactionPanel } from '@/components/panels/NewTransactionPanel'
import { useAuth } from '@/state/AuthContext'
import { NewMovementContext } from '@/state/NewMovementContext'
import type { Transaction } from '@/types'
import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'

// Each page draws its own title block and padding per the mockup; this
// title is only the header's (mobile) label.
const PAGE_TITLES: Record<string, TranslationKey> = {
  '/inicio': 'v2.nav.inicio',
  '/movimientos': 'v2.nav.movimientos',
  '/planes': 'v2.nav.planes',
  '/reportes': 'v2.nav.reportes',
  '/billeteras': 'v2.nav.billeteras',
  '/ajustes': 'v2.nav.ajustes',
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

// "Modo invitado" (ONBOARDING.md §1), above every page. "Crear cuenta"
// leaves the example account on the way (RegisterPage signs the guest out).
function GuestBanner() {
  const navigate = useNavigate()
  return (
    <div className="mx-7 mt-[18px] flex items-center gap-3.5 rounded-[14px] border border-v2-accent-line/35 bg-v2-accent/12 px-4 py-3">
      <div className="min-w-0 flex-1">
        <span className="text-caption font-extrabold">{tr('guest.title')}</span>{' '}
        <span className="text-caption text-v2-muted">{tr('guest.body')}</span>
      </div>
      <button type="button" onClick={() => navigate('/register')} className="cursor-pointer rounded-[10px] bg-v2-accent px-3.5 py-2 text-caption font-extrabold text-white">
        {tr('guest.cta')}
      </button>
    </div>
  )
}

export function DashboardLayout() {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [newTxOpen, setNewTxOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>(undefined)
  const location = useLocation()
  const { t } = useTranslation()
  // Ajustes' sub-views (/ajustes/perfil, …) share its title.
  const titleKey = PAGE_TITLES[location.pathname] ?? (location.pathname.startsWith('/ajustes/') ? PAGE_TITLES['/ajustes'] : undefined)
  const title = titleKey ? t(titleKey) : 'S2 Nova'
  const closeNewTx = useCallback(() => {
    setNewTxOpen(false)
    setEditing(undefined)
  }, [])
  const openNewTx = useCallback((tx?: Transaction) => {
    setEditing(tx)
    setNewTxOpen(true)
  }, [])

  // "N" opens "Nuevo movimiento" from anywhere, unless the user is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      e.preventDefault()
      setNewTxOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <NewMovementContext.Provider value={openNewTx}>
      <div className="flex h-screen overflow-hidden bg-v2-bg text-v2-text [line-height:normal]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Header title={title} onMenuClick={() => setSidebarOpen(true)} onNewTransaction={() => setNewTxOpen(true)} />
          {user?.isGuest && <GuestBanner />}
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
      {newTxOpen && <NewTransactionPanel key={editing?.id ?? 'new'} onClose={closeNewTx} editing={editing} />}
      <GuideCard />
    </NewMovementContext.Provider>
  )
}
