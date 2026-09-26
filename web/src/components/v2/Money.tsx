import { Fragment, type CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/state/useTranslation'
import { formatMoney } from '@/lib/currency'

// An amount that blurs (9px, per STAGE-2-INICIO) when amounts are hidden.
// Blurred text is aria-hidden and replaced for screen readers by
// "Monto oculto", so a hidden balance is never read aloud.
// `inline` keeps the surrounding sentence's font (amounts inside copy).
export function Money({ hidden, children, className, style, inline }: { hidden: boolean; children: string; className?: string; style?: CSSProperties; inline?: boolean }) {
  const { t } = useTranslation()
  const base = inline ? undefined : 'font-numeric'
  if (!hidden) {
    return (
      <span className={cn(base, className)} style={style}>
        {children}
      </span>
    )
  }
  return (
    <span className={cn(base, className)} style={style}>
      <span aria-hidden="true" style={{ filter: 'blur(9px)' }}>
        {children}
      </span>
      <span className="sr-only">{t('inicio.amountHidden')}</span>
    </span>
  )
}

// A sentence with amounts in it ("{0} de {1} este mes."): args marked
// { amount } render through Money, so hiding amounts blurs only the figures
// and leaves the rest of the sentence readable.
// An amount arg may carry its own currency (a movement's); otherwise it is
// in the principal currency and goes through `format`.
export type MoneyTemplate = { template: string; args: (string | number | { amount: number; currency?: string })[] }

export function MoneyText({ parts, hidden, format }: { parts: MoneyTemplate[]; hidden: boolean; format: (v: number) => string }) {
  return (
    <>
      {parts.map((part, pi) =>
        part.template.split(/(\{\d+\})/).map((chunk, ci) => {
          const m = /^\{(\d+)\}$/.exec(chunk)
          if (!m) return <Fragment key={`${pi}.${ci}`}>{chunk}</Fragment>
          const arg = part.args[Number(m[1])]
          if (arg === undefined) return null
          if (typeof arg === 'object') {
            return (
              <Money key={`${pi}.${ci}`} hidden={hidden} inline>
                {arg.currency ? formatMoney(arg.amount, arg.currency) : format(arg.amount)}
              </Money>
            )
          }
          return <Fragment key={`${pi}.${ci}`}>{String(arg)}</Fragment>
        }),
      )}
    </>
  )
}
