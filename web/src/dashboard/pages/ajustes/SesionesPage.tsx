import { useCallback, useEffect, useState } from 'react'
import { RowSkeletons } from '@/components/v2/Rows'
import { AjCard, AjOutlineButton, AjSubHeader } from '@/dashboard/components/ajustes/AjustesUi'
import { timeAgo } from '@/lib/ajustes'
import { userService, type Session } from '@/services/userService'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'

// The mockup's device glyphs (desktop, phone, tablet).
const DEVICE_ICON: Record<Session['kind'], string> = {
  desktop: 'M2 4h20v12H2z M8 20h8 M12 16v4',
  phone: 'M7 2h10v20H7z M11 18h2',
  tablet: 'M5 2h14v20H5z M11 18h2',
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Ajustes › Sesiones activas: every device with a live session, this one
// first. The backend has no location for a session, so the detail line is
// only how recently it was active.
export default function SesionesPage() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    userService.getSessions().then(setSessions, (err) => showToast(err instanceof Error ? err.message : t('api.generic'), 'error')).finally(() => setLoaded(true))
  }, [showToast])

  useEffect(load, [load])

  const run = (action: Promise<void>) =>
    action.then(load, (err) => showToast(err instanceof Error ? err.message : t('api.generic'), 'error'))

  const hasOthers = sessions.some((s) => !s.current)
  const now = Date.now()

  return (
    <div className="flex max-w-[816px] flex-col gap-5 px-4 pt-6 pb-12 min-[760px]:px-8 min-[760px]:pt-8">
      <AjSubHeader
        title={t('aj.sessions')}
        subtitle={t('aj.ses.subtitle')}
        action={
          hasOthers && (
            <AjOutlineButton danger onClick={() => run(userService.closeOtherSessions())}>
              {t('aj.ses.closeOthers')}
            </AjOutlineButton>
          )
        }
      />
      <AjCard className="px-5 py-1.5" >
        {!loaded && <div className="py-2"><RowSkeletons count={2} box={42} /></div>}
        {sessions.map((session, i) => (
          <div key={session.id} className={cn('flex items-center gap-3.5 py-[15px]', i < sessions.length - 1 && 'border-b border-divider')}>
            <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[11px] border border-border-input bg-surface-sunken text-ink-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={DEVICE_ICON[session.kind]} />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-title-sm font-semibold">{session.device ?? t('aj.ses.unknown')}</span>
                {session.current && <span className="rounded-[6px] bg-positive-soft px-[7px] py-0.5 text-caption font-semibold text-positive">{t('aj.ses.thisDevice')}</span>}
              </div>
              <div className="text-body-sm text-ink-secondary">{session.current ? t('aj.ses.activeNow') : capitalize(timeAgo(session.lastActiveAt, now, t))}</div>
            </div>
            {!session.current && (
              <button
                type="button"
                onClick={() => run(userService.closeSession(session.id))}
                className="h-9 flex-none cursor-pointer whitespace-nowrap rounded-[12px] border border-border-input bg-surface px-4 text-label font-semibold text-ink hover:bg-surface-sunken"
              >
                {t('aj.ses.signOut')}
              </button>
            )}
          </div>
        ))}
      </AjCard>
    </div>
  )
}
