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
      className="fixed right-6 bottom-6 z-[45] w-[354px] overflow-hidden rounded-[20px] border border-v2-line2 bg-v2-surface p-5 text-v2-text shadow-[var(--shadow-lg)] [line-height:normal]"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ background: 'var(--cta-bg)' }} />
      <div className="text-caption font-semibold tracking-[.1em] text-v2-accent2">{`${t('guide.label').toUpperCase()} · ${copy('label').toUpperCase()}`}</div>
      <div className="mt-2 text-title font-medium tracking-[-.01em]">{copy('title')}</div>
      <div className="mt-1.5 text-body-sm leading-[1.5] text-v2-muted [text-wrap:pretty]">{copy('body')}</div>
      <div className="mt-4 flex items-center gap-2.5">
        <button type="button" onClick={() => save({ guidesOff: true })} className="min-h-8 cursor-pointer rounded-full px-2 text-label font-medium text-v2-muted hover:text-v2-text">
          {t('guide.skip')}
        </button>
        <div className="flex-1" />
        <button type="button" onClick={() => save({ guidesSeen: [...user.guidesSeen, key] })} className="btn-cta h-9 cursor-pointer rounded-full px-4 text-label font-semibold">
          {t('guide.ok')}
        </button>
      </div>
    </div>
  )
}
