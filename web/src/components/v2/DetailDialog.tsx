import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { errorBoxClass } from '@/components/panels/SidePanel'
import { useTranslation } from '@/state/useTranslation'

interface DetailDialogProps {
  title: string
  sub: string
  chip: ReactNode
  amount: ReactNode
  rows: [string, string][]
  error?: string
  actions: ReactNode
  onClose: () => void
}

// The Web v2 mockup's shared modal (a movement or a Programado): chip,
// title and sub, the amount, label/value rows and right-aligned actions.
// Closes on the backdrop, the ✕ and Esc. 466px = the mockup's 420px
// content-box width plus its 22px padding and 1px border.
export function DetailDialog({ title, sub, chip, amount, rows, error, actions, onClose }: DetailDialogProps) {
  const { t } = useTranslation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(6,6,12,.62)] p-6 [line-height:normal] backdrop-blur-[4px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex w-[466px] max-w-full flex-col gap-4 rounded-[18px] border border-v2-line2 bg-v2-surface p-[22px] text-v2-text shadow-[0_24px_60px_rgba(0,0,0,.45)]"
      >
        <div className="flex items-center gap-3">
          {chip}
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-extrabold tracking-[-.01em]">{title}</div>
            <div className="mt-0.5 text-[11.5px] text-v2-dim">{sub}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[9px] text-v2-dim hover:bg-v2-subtle hover:text-v2-text"
          >
            <StrokeIcon paths={ICON_PATHS.close} size={14} />
          </button>
        </div>
        {amount}
        <div className="flex flex-col">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 border-b border-v2-subtle py-2.5 text-[12.5px]">
              <span className="text-v2-dim">{label}</span>
              <span className="text-right font-bold">{value}</span>
            </div>
          ))}
        </div>
        {error && <div className={errorBoxClass}>{error}</div>}
        <div className="flex justify-end gap-2">{actions}</div>
      </div>
    </div>,
    document.body,
  )
}
