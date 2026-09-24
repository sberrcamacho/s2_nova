import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/state/useTranslation'

// An amount that blurs (9px, per STAGE-2-INICIO) when amounts are hidden.
// Blurred text is aria-hidden and replaced for screen readers by
// "Monto oculto", so a hidden balance is never read aloud.
export function Money({ hidden, children, className, style }: { hidden: boolean; children: string; className?: string; style?: CSSProperties }) {
  const { t } = useTranslation()
  if (!hidden) {
    return (
      <span className={cn('font-numeric', className)} style={style}>
        {children}
      </span>
    )
  }
  return (
    <span className={cn('font-numeric', className)} style={style}>
      <span aria-hidden="true" style={{ filter: 'blur(9px)' }}>
        {children}
      </span>
      <span className="sr-only">{t('inicio.amountHidden')}</span>
    </span>
  )
}
