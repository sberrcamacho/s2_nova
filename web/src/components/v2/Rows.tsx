import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/state/useTranslation'

// A tappable list row per the mockup's rowBase(): 11px/8px padding pulled
// out by -8px so the hover background (--subtle) bleeds past the text.
export function RowButton({ children, onClick, last, gap = 14 }: { children: ReactNode; onClick: () => void; last: boolean; gap?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('mx-[-8px] flex cursor-pointer items-center rounded-[10px] px-2 py-[11px] text-v2-text hover:bg-v2-subtle', !last && 'border-b border-v2-subtle')}
      style={{ gap }}
    >
      {children}
    </button>
  )
}

export function SkeletonBar({ className, dark }: { className?: string; dark?: boolean }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-[6px]', dark ? 'bg-white/10' : 'bg-v2-line', className)} />
}

export function RowSkeletons({ count, box = 34 }: { count: number; box?: number }) {
  return (
    <div className="flex flex-col" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5 py-[11px]">
          <div aria-hidden="true" className="flex-none animate-pulse rounded-full bg-v2-line" style={{ width: box, height: box }} />
          <div className="flex flex-1 flex-col gap-1.5">
            <SkeletonBar className="h-3 w-[60%]" />
            <SkeletonBar className="h-2.5 w-[40%]" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Shown above a page's content when a refresh fails; the last loaded data
// stays on screen (STAGE-2 error state).
export function SyncBanner({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="status" className="flex items-center justify-between gap-3 rounded-[12px] bg-[color-mix(in_oklab,var(--v2-neg)_10%,transparent)] px-3.5 py-2.5 text-[12px] font-bold text-v2-neg">
      <span>{t('inicio.syncError')}</span>
      <button type="button" onClick={onRetry} className="cursor-pointer font-extrabold text-v2-accent2">
        {t('inicio.retry')}
      </button>
    </div>
  )
}
