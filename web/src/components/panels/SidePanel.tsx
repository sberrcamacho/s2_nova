import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { useTranslation } from '@/state/useTranslation'

interface SidePanelProps {
  title: string
  onClose: () => void
  footer: ReactNode
  children: ReactNode
}

// The Web v2 write-form shell (STAGE-2-INICIO §5): a 420px panel docked to
// the right edge (full width below 520px) over a dimmed backdrop. Every
// Web create/edit form reuses it.
export function SidePanel({ title, onClose, footer, children }: SidePanelProps) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    panelRef.current?.querySelector<HTMLElement>('input, button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-[rgba(6,6,12,.5)]" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed bottom-0 right-0 top-0 z-[41] flex [line-height:normal] w-[420px] max-w-full flex-col border-l border-v2-line2 bg-v2-surface text-v2-text shadow-[-24px_0_60px_rgba(0,0,0,.4)] max-[519px]:w-full"
      >
        <div className="flex items-center gap-3 border-b border-v2-line px-[22px] py-[18px]">
          <div className="flex-1 text-[16px] font-extrabold tracking-[-.015em]">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[9px] text-v2-dim hover:bg-v2-subtle hover:text-v2-text"
          >
            <StrokeIcon paths={ICON_PATHS.close} size={14} />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-max content-start gap-[18px] overflow-y-auto overflow-x-hidden px-[22px] py-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-v2-line px-[22px] py-4">{footer}</div>
      </div>
    </>,
    document.body,
  )
}

export const fieldLabelClass = 'text-[11px] font-bold tracking-[.06em] text-v2-muted'

export function chipClass(on: boolean): string {
  return on
    ? 'cursor-pointer rounded-[10px] border border-v2-accent bg-v2-accent px-[13px] py-2 text-[12px] font-bold text-white'
    : 'cursor-pointer rounded-[10px] border border-v2-line2 bg-v2-surface2 px-[13px] py-2 text-[12px] font-bold text-v2-muted'
}

export const secondaryButtonClass = 'cursor-pointer rounded-[10px] border border-v2-line2 px-4 py-2.5 text-[12.5px] font-bold text-v2-muted'
export const primaryButtonClass = 'cursor-pointer rounded-[10px] bg-v2-accent px-4 py-2.5 text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60'
export const errorBoxClass = 'rounded-[10px] bg-[rgba(255,98,98,.1)] px-3 py-2.5 text-[12px] font-bold text-v2-neg'
