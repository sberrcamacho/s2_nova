import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { userService } from '@/services/userService'
import { useAuth } from '@/state/AuthContext'

// The Dashboard v2 mockup's WGUIDES, keyed like the server's guidesSeen
// (shared with Android, so a guide seen there isn't repeated here).
// Copy: guide.<key>.label / .title / .body.
const GUIDES: Record<string, string> = {
  '/inicio': 'inicio',
  '/movimientos': 'movimientos',
  '/planes': 'planes',
  '/reportes': 'reportes',
  '/billeteras': 'billeteras',
}

// True while any modal, side panel or confirmation is open (they all mark
// themselves aria-modal): the guide hides behind them, as in the mockup.
function useModalOpen(): boolean {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const check = () => setOpen(!!document.querySelector('[aria-modal="true"]'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return open
}

// Mini-guide (ONBOARDING.md §3): one card per main page on the first visit,
// bottom-right. "Entendido" marks the page seen, "Omitir guías" turns them
// all off; Ajustes › "Ver otra vez" resets both.
export function GuideCard() {
  const { user, updateUser } = useAuth()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const modalOpen = useModalOpen()
  const key = GUIDES[pathname]
  if (!user || !key || modalOpen || user.guidesOff || user.guidesSeen.includes(key)) return null
  const copy = (part: string) => t(`guide.${key}.${part}` as TranslationKey)

  const save = (patch: { guidesSeen?: string[]; guidesOff?: boolean }) => {
    updateUser(patch)
    void userService.updateGuides(patch).catch(() => undefined)
  }

  return (
    <div
      role="region"
      aria-label={t('guide.label')}
      className="fixed right-6 bottom-6 z-[45] w-[354px] rounded-[16px] border border-v2-accent-line/45 bg-v2-surface p-4 text-v2-text shadow-[0_18px_44px_rgba(0,0,0,.35)] [line-height:normal]"
    >
      <div className="text-caption font-extrabold tracking-[.12em] text-v2-accent2">{`${t('guide.label').toUpperCase()} · ${copy('label').toUpperCase()}`}</div>
      <div className="mt-[7px] text-title-sm font-extrabold">{copy('title')}</div>
      <div className="mt-[5px] text-caption leading-[1.5] text-v2-muted [text-wrap:pretty]">{copy('body')}</div>
      <div className="mt-3 flex items-center gap-2.5">
        <button type="button" onClick={() => save({ guidesOff: true })} className="cursor-pointer text-caption font-bold text-v2-muted">
          {t('guide.skip')}
        </button>
        <div className="flex-1" />
        <button type="button" onClick={() => save({ guidesSeen: [...user.guidesSeen, key] })} className="cursor-pointer rounded-[10px] bg-v2-accent px-3.5 py-2 text-caption font-extrabold text-white">
          {t('guide.ok')}
        </button>
      </div>
    </div>
  )
}
