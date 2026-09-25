import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/dashboard/components/Sidebar'
import { Header } from '@/dashboard/components/Header'
import { NewTransactionPanel } from '@/components/panels/NewTransactionPanel'
import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'

// Each page draws its own title block and padding per the mockup; this
// title is only the header's (mobile) label.
const PAGE_TITLES: Record<string, TranslationKey> = {
  '/inicio': 'v2.nav.inicio',
  '/movimientos': 'v2.nav.movimientos',
  '/planes': 'v2.nav.planes',
  '/reportes': 'v2.nav.reportes',
  '/ajustes': 'v2.nav.ajustes',
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [newTxOpen, setNewTxOpen] = useState(false)
  const location = useLocation()
  const { t } = useTranslation()
  // Ajustes' sub-views (/ajustes/perfil, …) share its title.
  const titleKey = PAGE_TITLES[location.pathname] ?? (location.pathname.startsWith('/ajustes/') ? PAGE_TITLES['/ajustes'] : undefined)
  const title = titleKey ? t(titleKey) : 'S2 Nova'
  const closeNewTx = useCallback(() => setNewTxOpen(false), [])

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
    <>
      <div className="flex h-screen overflow-hidden bg-v2-bg text-v2-text [line-height:normal]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Header title={title} onMenuClick={() => setSidebarOpen(true)} onNewTransaction={() => setNewTxOpen(true)} />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
      {newTxOpen && <NewTransactionPanel onClose={closeNewTx} />}
    </>
  )
}
