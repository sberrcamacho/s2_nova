import { useId, useState } from 'react'
import { Money } from '@/components/v2/Money'
import { cn } from '@/lib/cn'
import { useTranslation } from '@/state/useTranslation'

export interface BarSeries {
  key: string
  label: string
  color: string
  values: number[]
}

// "$4,3 M" / "$850 mil" (es) or "$4.3M" / "$850K" (en): the value axis.
export function compactMoney(value: number, language: 'es' | 'en'): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  const one = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace('.', language === 'en' ? '.' : ',')
  if (abs >= 1_000_000) return `${sign}$${one(Math.round((abs / 1_000_000) * 10) / 10)}${language === 'en' ? 'M' : ' M'}`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}${language === 'en' ? 'K' : ' mil'}`
  return `${sign}$${Math.round(abs)}`
}

// A "nice" axis top (1, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 × 10ⁿ) at or above the
// largest value, so the tallest bar fills most of the plot.
export function niceCeiling(max: number): number {
  if (max <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(max))
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * pow >= max) ?? 10
  return step * pow
}

// Bar chart for monthly figures (DESIGN-SYSTEM.md §2.3): a value axis with
// units and `divider` gridlines, one group per month (series side by side,
// always in the same order as the legend), a tooltip on hover, focus and
// tap, a one-sentence summary for screen readers and a table alternative.
export function BarChart({
  labels,
  series,
  format,
  hidden,
  summary,
  height = 220,
  highlightLast = false,
  tableCaption,
}: {
  labels: string[]
  series: BarSeries[]
  format: (n: number) => string
  hidden: boolean
  summary: string
  height?: number
  highlightLast?: boolean
  tableCaption: string
}) {
  const { t, language } = useTranslation()
  const [active, setActive] = useState<number | null>(null)
  const tableId = useId()
  const top = niceCeiling(Math.max(0, ...series.flatMap((s) => s.values)))
  const ticks = [top, top / 2, 0]
  return (
    <figure className="m-0">
      <p className="sr-only">{summary}</p>
      <div className="flex gap-2">
        {/* Value axis */}
        <div aria-hidden="true" className="relative w-14 flex-none" style={{ height }}>
          {ticks.map((v, i) => (
            <span key={i} className="absolute right-0 -translate-y-1/2 whitespace-nowrap text-caption tabular-nums text-ink-tertiary" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}>
              {hidden ? '•••' : compactMoney(v, language)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            {ticks.map((_, i) => (
              <div key={i} aria-hidden="true" className={cn('absolute inset-x-0 border-t', i === ticks.length - 1 ? 'border-border' : 'border-divider')} style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end gap-2">
              {labels.map((label, i) => {
                const values = series.map((s) => s.values[i] ?? 0)
                const description = `${label}: ${series.map((s, k) => `${s.label} ${hidden ? t('inicio.amountHidden') : format(values[k]!)}`).join(', ')}`
                const last = i === labels.length - 1
                return (
                  <button
                    key={label + i}
                    type="button"
                    aria-label={description}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive((a) => (a === i ? null : a))}
                    onClick={() => setActive((a) => (a === i ? null : i))}
                    className={cn('relative flex h-full min-w-0 flex-1 cursor-pointer items-end justify-center gap-1 rounded-t-[6px]', active === i && 'bg-v2-subtle')}
                  >
                    {series.map((s, k) => (
                      <span
                        key={s.key}
                        aria-hidden="true"
                        className="w-full max-w-[26px] rounded-t-[4px] transition-[height] duration-300 motion-reduce:transition-none"
                        style={{
                          height: `${Math.max(values[k]! > 0 ? 1 : 0, (values[k]! / top) * 100)}%`,
                          background: s.color,
                          opacity: highlightLast && !last && active !== i ? 0.35 : 1,
                        }}
                      />
                    ))}
                    {active === i && (
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-ink px-3 py-2 text-left text-caption text-surface shadow-[var(--shadow-md)]"
                      >
                        <span className="block font-semibold">{label}</span>
                        {series.map((s, k) => (
                          <span key={s.key} className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
                            {s.label}{' '}
                            <Money hidden={hidden} className="font-semibold">
                              {format(values[k]!)}
                            </Money>
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <div aria-hidden="true" className="mt-2 flex gap-2">
            {labels.map((label, i) => (
              <span key={label + i} className="min-w-0 flex-1 truncate text-center text-caption text-ink-tertiary">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <details className="mt-3">
        <summary className="inline-flex min-h-8 cursor-pointer items-center rounded-[8px] px-1 text-label font-semibold text-link hover:bg-v2-subtle" aria-controls={tableId}>
          {t('rep.showTable')}
        </summary>
        <table id={tableId} className="mt-2 w-full border-collapse text-left text-body-sm">
          <caption className="sr-only">{tableCaption}</caption>
          <thead>
            <tr className="text-overline uppercase text-ink-tertiary">
              <th scope="col" className="py-1.5 font-semibold">{t('rep.month')}</th>
              {series.map((s) => (
                <th key={s.key} scope="col" className="py-1.5 text-right font-semibold">{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((label, i) => (
              <tr key={label + i} className="border-t border-divider">
                <th scope="row" className="py-1.5 font-medium">{label}</th>
                {series.map((s) => (
                  <td key={s.key} className="py-1.5 text-right tabular-nums">
                    <Money hidden={hidden}>{format(s.values[i] ?? 0)}</Money>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

// Legend: a swatch plus the series name, in the bars' order.
export function ChartLegend({ series }: { series: { key: string; label: string; color: string; sign?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-label font-medium text-ink-secondary">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
          {s.sign ? `${s.sign} ` : ''}
          {s.label}
        </span>
      ))}
    </div>
  )
}
