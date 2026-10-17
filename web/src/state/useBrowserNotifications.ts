import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MoneyTemplate } from '@/components/v2/Money'
import { alertCopy } from '@/lib/alertCopy'
import { formatMoney } from '@/lib/currency'
import { todayISO } from '@/lib/date'
import { loadDismissed } from '@/lib/inicio'
import { accountService } from '@/services/accountService'
import { alertService } from '@/services/alertService'
import { useAuth } from '@/state/AuthContext'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'

// "Notificaciones" on Web: while a tab with S2 Nova is open, the shared
// alerts (GET /alerts, the same rule set Android notifies from) are checked
// every 15 minutes and each new one shows once as a browser notification.
// There is no push server, so nothing arrives with every tab closed; the
// Ajustes hint says so. Needs the preference on and the browser's
// permission, which Ajustes asks for when the switch is turned on.
export const NOTIFY_EVERY_MS = 15 * 60 * 1000
const MAX_PER_CHECK = 3
const seenKey = (userId: string) => `s2nova.notifiedAlerts.${userId}`

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

function loadSeen(userId: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(seenKey(userId)) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function saveSeen(userId: string, ids: string[]): void {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify(ids))
  } catch {
    // Storage blocked: an alert may show again on the next visit.
  }
}

// A card body as plain text; amounts masked when "Ocultar montos" is on.
export function plainText(parts: MoneyTemplate[], format: (v: number) => string, hidden: boolean): string {
  return parts
    .map((part) =>
      part.template.replace(/\{(\d+)\}/g, (_, i: string) => {
        const arg = part.args[Number(i)]
        if (arg === undefined) return ''
        if (typeof arg === 'object') return hidden ? '•••' : arg.currency ? formatMoney(arg.amount, arg.currency) : format(arg.amount)
        return String(arg)
      }),
    )
    .join(' ')
}

export function useBrowserNotifications(): void {
  const { user } = useAuth()
  const { t, tCategory, language } = useTranslation()
  const { format } = useCurrency()
  const navigate = useNavigate()
  const userId = user?.id
  const on = !!user && !user.isGuest && user.preferences.notifications
  const hidden = user?.preferences.hideAmounts ?? false

  useEffect(() => {
    if (!on || !userId || !notificationsSupported()) return
    let cancelled = false
    const check = async () => {
      if (Notification.permission !== 'granted') return
      try {
        const today = todayISO()
        const [alerts, wallets] = await Promise.all([alertService.getAlerts(today), accountService.getWallets().catch(() => [])])
        if (cancelled) return
        const live = new Set(alerts.map((a) => a.id))
        // Ids no longer live are dropped, so a condition that comes back shows again.
        const seen = loadSeen(userId).filter((id) => live.has(id))
        const dismissed = new Set(loadDismissed(userId))
        const fresh = alerts.filter((a) => !seen.includes(a.id) && !dismissed.has(a.id))
        for (const alert of fresh.slice(0, MAX_PER_CHECK)) {
          const copy = alertCopy(alert, today, language, t, tCategory, wallets)
          const notice = new Notification(copy.title, { body: plainText(copy.body, format, hidden), tag: alert.id, icon: `${import.meta.env.BASE_URL}favicon.png` })
          notice.onclick = () => {
            window.focus()
            navigate('/inicio')
            notice.close()
          }
        }
        // Everything live counts as seen: past the first three, the rest wait on Inicio.
        saveSeen(userId, [...live])
      } catch {
        // Offline or signed out: the next check tries again.
      }
    }
    void check()
    const timer = window.setInterval(() => void check(), NOTIFY_EVERY_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [on, userId, hidden, language, t, tCategory, format, navigate])
}
