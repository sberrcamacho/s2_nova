import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/dashboard/components/Sidebar'
import { Header } from '@/dashboard/components/Header'
import { DashboardFiltersProvider } from '@/dashboard/DashboardFiltersContext'
import { NewTransactionPanel } from '@/components/panels/NewTransactionPanel'
import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'

// `ownHeader` pages (the v2-migrated ones) draw their own title block and
// padding per the mockup; the rest keep the older layout title until their
// own stage migrates them.
const PAGE_META: Record<string, { titleKey: TranslationKey; subtitleKey?: TranslationKey; ownHeader?: boolean }> = {
  '/inicio': { titleKey: 'v2.nav.inicio', ownHeader: true },
  '/movimientos': { titleKey: 'v2.nav.movimientos', subtitleKey: 'page.transactions.subtitle' },
  '/planes': { titleKey: 'v2.nav.planes', ownHeader: true },
  '/reportes': { titleKey: 'v2.nav.reportes', subtitleKey: 'page.analytics.subtitle' },
  '/ajustes': { titleKey: 'v2.nav.ajustes', subtitleKey: 'page.settings.subtitle' },
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
  const meta = PAGE_META[location.pathname]
  const title = meta ? t(meta.titleKey) : 'S2 Nova'
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
    <DashboardFiltersProvider>
      <div className="flex h-screen overflow-hidden bg-v2-bg text-v2-text [line-height:normal]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Header title={title} onMenuClick={() => setSidebarOpen(true)} onNewTransaction={() => setNewTxOpen(true)} />
          <main className="flex-1">
            {meta?.ownHeader ? (
              <Outlet />
            ) : (
              <div className="p-4 sm:p-6">
                <div className="mx-auto mb-5 max-w-[1400px]">
                  <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
                  {meta?.subtitleKey && <p className="mt-0.5 text-sm font-medium text-ink-tertiary">{t(meta.subtitleKey)}</p>}
                </div>
                <div className="mx-auto max-w-[1400px]">
                  <Outlet />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      {newTxOpen && <NewTransactionPanel onClose={closeNewTx} />}
    </DashboardFiltersProvider>
  )
}
