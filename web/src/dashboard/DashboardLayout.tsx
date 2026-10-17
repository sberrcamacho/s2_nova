import { tr } from '@/lib/i18n/translations'
import { useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/dashboard/components/Sidebar'
import { TourProvider } from '@/components/tour/TourProvider'
import { Header } from '@/dashboard/components/Header'
import { NewTransactionPanel, type MovementDraft } from '@/components/panels/NewTransactionPanel'
import { useAuth } from '@/state/AuthContext'
import { useBrowserNotifications } from '@/state/useBrowserNotifications'
import { NewMovementContext } from '@/state/NewMovementContext'
import { AssistantPanel, type AssistantTurn } from '@/dashboard/components/AssistantPanel'
import { assistantService } from '@/services/assistantService'
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
    <div className="mx-4 mt-6 flex items-center gap-3.5 rounded-[16px] border border-border bg-surface px-4 py-3 min-[760px]:mx-8">
      <div className="min-w-0 flex-1">
        <span className="text-label font-semibold">{tr('guest.title')}</span>{' '}
        <span className="text-label text-v2-muted">{tr('guest.body')}</span>
      </div>
      <button type="button" onClick={() => navigate('/register')} className="btn-cta h-9 flex-none cursor-pointer whitespace-nowrap rounded-[10px] px-4 text-label font-semibold">
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
  const [draft, setDraft] = useState<MovementDraft | undefined>(undefined)
  // "Asistente": shown when the server has it on (guests see why to sign up).
  const [assistantOn, setAssistantOn] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantTurns, setAssistantTurns] = useState<AssistantTurn[]>([])
  useEffect(() => {
    if (!user) return
    if (user.isGuest) return setAssistantOn(true)
    assistantService.status().then((s) => setAssistantOn(s.available)).catch(() => setAssistantOn(false))
  }, [user])
  const location = useLocation()
  const { t } = useTranslation()
  useBrowserNotifications()
  // Ajustes' sub-views (/ajustes/perfil, …) share its title.
  const titleKey = PAGE_TITLES[location.pathname] ?? (location.pathname.startsWith('/ajustes/') ? PAGE_TITLES['/ajustes'] : undefined)
  const title = titleKey ? t(titleKey) : 'S2 Nova'
  const closeNewTx = useCallback(() => {
    setNewTxOpen(false)
    setEditing(undefined)
    setDraft(undefined)
  }, [])
  const openNewTx = useCallback((tx?: Transaction, from?: MovementDraft) => {
    setEditing(tx)
    setDraft(from)
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
      <TourProvider>
      <div className="nova-canvas flex h-dvh overflow-hidden text-v2-text [line-height:normal]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {/* `relative` so absolutely positioned descendants (sr-only text, bars)
            are contained and clipped here instead of growing the document. */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Header title={title} onMenuClick={() => setSidebarOpen(true)} onNewTransaction={() => setNewTxOpen(true)} onAssistant={assistantOn ? () => setAssistantOpen(true) : undefined} />
          {user?.isGuest && <GuestBanner />}
          {/* Each page arrives with a short rise and fade (route-in); keyed by
              path so query changes (filters, tabs, period) don't replay it. */}
          <main key={location.pathname} className="flex-1 animate-route-in">
            <Outlet />
          </main>
        </div>
      </div>
      {assistantOpen && (
        <AssistantPanel
          turns={assistantTurns}
          setTurns={setAssistantTurns}
          onClose={() => setAssistantOpen(false)}
          onDraft={(p) => {
            setAssistantOpen(false)
            openNewTx(undefined, { type: p.type, amount: p.amount, title: p.description || undefined, category: p.category, date: p.date ?? undefined })
          }}
        />
      )}
      {newTxOpen && <NewTransactionPanel key={editing?.id ?? (draft ? `draft-${draft.amount}-${draft.title ?? ''}` : 'new')} onClose={closeNewTx} editing={editing} draft={draft} />}
      </TourProvider>
    </NewMovementContext.Provider>
  )
}
