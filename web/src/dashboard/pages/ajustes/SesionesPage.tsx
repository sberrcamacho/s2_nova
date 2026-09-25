import { useCallback, useEffect, useState } from 'react'
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

  const load = useCallback(() => {
    userService.getSessions().then(setSessions, (err) => showToast(err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.', 'error'))
  }, [showToast])

  useEffect(load, [load])

  const run = (action: Promise<void>) =>
    action.then(load, (err) => showToast(err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.', 'error'))

  const hasOthers = sessions.some((s) => !s.current)
  const now = Date.now()

  return (
    <div className="flex max-w-[816px] flex-col gap-[18px] px-7 pt-[26px] pb-10">
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
      <AjCard className="px-5 py-1.5">
        {sessions.map((session, i) => (
          <div key={session.id} className={cn('flex items-center gap-3.5 py-[15px]', i < sessions.length - 1 && 'border-b border-v2-subtle')}>
            <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[11px] border border-v2-line2 bg-v2-surface2 text-v2-muted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d={DEVICE_ICON[session.kind]} />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-bold">{session.device ?? t('aj.ses.unknown')}</span>
                {session.current && <span className="rounded-[6px] bg-[rgba(124,240,187,.12)] px-[7px] py-0.5 text-[10.5px] font-bold text-v2-pos">{t('aj.ses.thisDevice')}</span>}
              </div>
              <div className="mt-0.5 text-[11.5px] text-v2-dim">{session.current ? t('aj.ses.activeNow') : capitalize(timeAgo(session.lastActiveAt, now, t))}</div>
            </div>
            {!session.current && (
              <button
                type="button"
                onClick={() => run(userService.closeSession(session.id))}
                className="flex-none cursor-pointer rounded-[10px] border border-v2-line2 px-3.5 py-2 text-[12px] font-bold text-v2-muted hover:text-v2-neg"
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
