import { useAutoTour } from '@/components/tour/TourProvider'
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart, ChartLegend, EmptyChart } from '@/components/v2/BarChart'
import { CategoryMark } from '@/components/v2/CategoryMark'
import { Money } from '@/components/v2/Money'
import { RowSkeletons, SkeletonBar, SyncBanner } from '@/components/v2/Rows'
import { accountService } from '@/services/accountService'
import { recurringService } from '@/services/recurringService'
import { summaryService, type Report, type ReportRange } from '@/services/summaryService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useTranslation } from '@/state/useTranslation'
import { categoryLabel, categoryName } from '@/lib/backendCategories'
import { categoryColor } from '@/lib/categoryGlyphs'
import { cn } from '@/lib/cn'
import { formatApprox, referenceRate } from '@/lib/currency'
import { todayISO } from '@/lib/date'
import { MONTHS_LONG, MONTHS_SHORT, fill, monthAbbr, monthYear, projectUntil, shortDate } from '@/lib/inicio'
import type { TranslationKey } from '@/lib/i18n/translations'
import type { RecurringSeries, Wallet } from '@/types'

const TABS: { id: 'gastos' | 'ingresos' | 'flujo' | 'patrimonio'; labelKey: TranslationKey }[] = [
  { id: 'gastos', labelKey: 'rep.tab.spending' },
  { id: 'ingresos', labelKey: 'rep.tab.income' },
  { id: 'flujo', labelKey: 'rep.tab.cashFlow' },
  { id: 'patrimonio', labelKey: 'rep.tab.netWorth' },
]
const RANGES: ReportRange[] = [3, 6, 12]

// Reportes (Web v2 mockup `isAnalytics`): Gastos · Ingresos · Flujo de caja ·
// Patrimonio over its own 3M/6M/12M range. Every figure comes from
// GET /summary/report, the same one Android's Reportes uses; only the
// upcoming-Programados projection is built here, with Inicio's rule.
export default function ReportesPage() {
  const { t, language } = useTranslation()
  const { version } = useAppData()
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((x) => x.id === params.get('tab'))?.id ?? 'gastos'
  const [range, setRange] = useState<ReportRange>(6)
  const [report, setReport] = useState<Report | null>(null)
  const [wallets, setWallets] = useState<Wallet[] | null>(null)
  const [series, setSeries] = useState<RecurringSeries[] | null>(null)
  const [failed, setFailed] = useState(false)
  const today = todayISO()
  useAutoTour('tour.reportes', report !== null)

  const load = useCallback(async () => {
    const [r, w, s] = await Promise.allSettled([summaryService.getReport(range, today), accountService.getWallets(), recurringService.getRecurringSeries()])
    if (r.status === 'fulfilled') setReport(r.value)
    if (w.status === 'fulfilled') setWallets(w.value)
    if (s.status === 'fulfilled') setSeries(s.value)
    setFailed([r, w, s].some((x) => x.status === 'rejected'))
  }, [range, today])

  useEffect(() => {
    void load()
  }, [load, version])

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 pb-12 pt-6 min-[760px]:px-8 min-[760px]:pt-8">
      <div className="flex flex-wrap min-h-10 items-end justify-between gap-4">
        <h1 className="text-display-sm font-medium tracking-[-.025em]">{t('rep.title')}</h1>
        {/* The range only applies to Gastos and Ingresos; Flujo de caja looks
            ahead and Patrimonio is today's, so they don't show it. */}
        {(tab === 'gastos' || tab === 'ingresos') && (
        <div role="radiogroup" aria-label={t('rep.range')} data-tour="rep.range" className="flex h-10 gap-1 rounded-[12px] bg-surface-sunken p-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={range === r}
              onClick={() => setRange(r)}
              className={cn(
                'min-w-12 cursor-pointer rounded-[9px] px-3 text-label tabular-nums',
                range === r ? 'border border-border bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]' : 'font-medium text-ink-secondary hover:text-ink',
              )}
            >
              {r}M
            </button>
          ))}
        </div>
        )}
      </div>

      {/* Scrolls on a narrow screen: the right edge fades while a tab is out of view. */}
      <div role="tablist" data-tour="rep.tabs" className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border [mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)] min-[640px]:[mask-image:none]">
        {TABS.map((x) => {
          const on = x.id === tab
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={on}
              ref={on ? (el) => el?.scrollIntoView?.({ block: 'nearest', inline: 'center' }) : undefined}
              onClick={() => setParams({ tab: x.id }, { replace: true })}
              className={cn(
                'mb-[-1px] min-h-11 flex-none cursor-pointer whitespace-nowrap border-b-2 px-3.5 text-label',
                on ? 'border-primary-border font-semibold text-ink' : 'border-transparent font-medium text-ink-secondary hover:text-ink',
              )}
            >
              {t(x.labelKey)}
            </button>
          )
        })}
      </div>

      {failed && <SyncBanner onRetry={() => void load()} />}
      {tab === 'gastos' && <SpendingTab report={report} />}
      {tab === 'ingresos' && <IncomeTab report={report} />}
      {tab === 'flujo' && <CashFlowTab wallets={wallets} series={series} />}
      {tab === 'patrimonio' && <NetWorthTab report={report} />}
    </div>
  )
}

function Card({ children, className, style, tour }: { children: ReactNode; className?: string; style?: CSSProperties; tour?: string }) {
  return (
    <div data-tour={tour} className={cn('min-w-0 nova-card p-5', className)} style={style}>
      {children}
    </div>
  )
}

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-title font-semibold">{title}</h2>
      {subtitle && <div className="mt-0.5 text-body-sm text-ink-tertiary">{subtitle}</div>}
    </div>
  )
}

function Kpi({ label, children, className, labelClass, style }: { label: string; children: ReactNode; className?: string; labelClass?: string; style?: CSSProperties }) {
  return (
    <div className={cn('min-w-0 nova-card', className)} style={style}>
      <div className={cn('truncate text-overline uppercase', labelClass ?? 'text-ink-secondary')}>{label}</div>
      {children}
    </div>
  )
}

function useRangeSubtitle(report: Report | null) {
  const { t } = useTranslation()
  return fill(t('rep.lastMonths'), report?.range ?? 6)
}

// "octubre" from "2026-10".
function monthName(monthKey: string, language: 'es' | 'en'): string {
  return MONTHS_LONG[language][Number(monthKey.slice(5, 7)) - 1]!
}

function SpendingTab({ report }: { report: Report | null }) {
  const { t, language } = useTranslation()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const subtitle = useRangeSubtitle(report)
  // Income and expenses in a fixed order, with their sign in the legend so
  // the pair isn't told apart by color alone.
  const flowSeries = [
    { key: 'income', label: t('rep.income'), color: 'var(--color-positive)', sign: '+' },
    { key: 'expense', label: t('rep.expenses'), color: 'var(--color-negative)', sign: '−' },
  ]
  const peak = report?.months.reduce<(typeof report.months)[number] | null>((p, m) => (p === null || m.expenses > p.expenses ? m : p), null)
  const flowSummary = report
    ? fill(t('rep.summary.flow'), subtitle, hidden ? t('inicio.amountHidden') : format(report.totals.income), hidden ? t('inicio.amountHidden') : format(report.totals.expenses), peak ? monthAbbr(peak.month, language) : '—')
    : ''
  // "Categorías" (parents, with the month-over-month trend) or
  // "Subcategorías" (leaves; parent-only rows under the parent's name).
  const [level, setLevel] = useState<'parent' | 'sub'>('parent')
  const top =
    report === null
      ? null
      : level === 'parent'
        ? report.categories.slice(0, 6).map((c) => ({ ...c, label: categoryName(c.category) }))
        : report.subcategories.slice(0, 6).map((c) => ({ ...c, label: categoryLabel(c.category), rising: false, change: null }))
  const month = report?.month ?? todayISO().slice(0, 7)

  return (
    <>
      <WhatChanged report={report} />

      <div className="grid grid-cols-1 gap-[18px] min-[1100px]:grid-cols-[1.45fr_1fr]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <CardTitle title={t('rep.incomeVsExpenses')} subtitle={subtitle} />
            <ChartLegend series={flowSeries} />
          </div>
          <div className="mt-5">
            {report === null ? (
              <SkeletonBar className="h-[236px] w-full" />
            ) : (
              <BarChart
                labels={report.months.map((m) => monthAbbr(m.month, language))}
                series={flowSeries.map((x) => ({ ...x, values: report.months.map((m) => (x.key === 'income' ? m.income : m.expenses)) }))}
                format={format}
                hidden={hidden}
                summary={flowSummary}
                tableCaption={t('rep.incomeVsExpenses')}
                empty={{ title: t('rep.empty.flowTitle'), description: t('rep.empty.flowBody') }}
              />
            )}
          </div>
        </Card>

        <Card tour="rep.breakdown">
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            {/* The current month, not the range: the title says which. */}
            <CardTitle title={fill(t('rep.whereMoneyWentIn'), monthName(month, language))} subtitle={t('rep.thisMonthSub')} />
            <div role="radiogroup" aria-label={t('rep.whereMoneyWent')} className="flex gap-0.5 rounded-[12px] border border-border bg-v2-surface2 p-[3px]">
              {(['parent', 'sub'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={level === k}
                  onClick={() => setLevel(k)}
                  className={cn('cursor-pointer rounded-[9px] px-[11px] py-[5px] text-caption font-semibold', level === k ? 'text-white [background:var(--cta-bg)]' : 'text-ink-tertiary')}
                >
                  {t(k === 'parent' ? 'rep.level.parent' : 'rep.level.sub')}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-[18px] flex flex-col gap-3.5">
            {top === null ? (
              <RowSkeletons count={4} />
            ) : top.length === 0 ? (
              <EmptyChart title={t('rep.empty.categoryTitle')} description={t('rep.empty.categoryBody')} />
            ) : (
              top.map((c) => (
                <div key={c.category} className="flex items-center gap-2.5">
                  <CategoryMark category={c.category} box={32} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex justify-between gap-2.5 text-label font-semibold">
                      <span className="min-w-0 truncate" title={c.label}>{c.label}</span>
                      <span className={cn('font-numeric flex-none whitespace-nowrap', c.rising ? 'text-negative' : 'text-ink-secondary')}>
                        <Money hidden={hidden} inline>
                          {format(c.amount)}
                        </Money>
                        {c.rising && ` · ↑ ${c.change}%`}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                      <div className="nova-fill h-full rounded-full" style={{ width: `${Math.round((c.amount / top[0]!.amount) * 100)}%`, background: categoryColor(c.category) }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-[18px] min-[900px]:grid-cols-2">
        <FixedVsVariable report={report} />
        <Runway report={report} />
      </div>
    </>
  )
}

// "¿Qué cambió?": this month so far against the same days of last month, in
// words, with the categories that moved the most.
function WhatChanged({ report }: { report: Report | null }) {
  const { t, language } = useTranslation()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const today = todayISO()
  const current = (report?.month ?? today.slice(0, 7))
  const [y, m] = current.split('-').map(Number)
  const previousKey = `${m === 1 ? y! - 1 : y}-${String(m === 1 ? 12 : m! - 1).padStart(2, '0')}`
  const money = (v: number) => (hidden ? t('inicio.amountHidden') : format(v))
  const changes = report?.changes
  const diff = changes ? changes.current - changes.previous : 0
  const sentence = !changes
    ? ''
    : changes.current === 0 && changes.previous === 0
      ? t('rep.changes.empty')
      : diff > 0
        ? fill(t('rep.changes.more'), money(diff), monthName(previousKey, language))
        : diff < 0
          ? fill(t('rep.changes.less'), money(-diff), monthName(previousKey, language))
          : fill(t('rep.changes.same'), monthName(previousKey, language))

  return (
    <Card>
      <CardTitle title={t('rep.changes.title')} subtitle={fill(t('rep.changes.sub'), String(Number(today.slice(8, 10))), monthName(current, language), monthName(previousKey, language))} />
      {report === null ? (
        <SkeletonBar className="mt-4 h-5 w-2/3" />
      ) : (
        <>
          <p className="mt-3 text-body font-medium text-ink">{sentence}</p>
          {changes && changes.categories.length > 0 && (
            <ul className="mt-4 grid grid-cols-1 gap-2.5 min-[760px]:grid-cols-3">
              {changes.categories.map((c) => {
                const up = c.delta > 0
                return (
                  <li key={c.category} className="flex min-w-0 items-center gap-2.5 rounded-[12px] bg-surface-sunken px-3 py-2.5">
                    <CategoryMark category={c.category} box={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-label font-semibold" title={categoryName(c.category)}>{categoryName(c.category)}</span>
                        {/* Spending going up reads as negative; the arrow and sign say it too. */}
                        <Money hidden={hidden} className={cn('flex-none whitespace-nowrap text-label font-semibold', up ? 'text-negative' : 'text-positive')}>
                          {`${up ? '↑ +' : '↓ −'}${format(Math.abs(c.delta))}`}
                        </Money>
                      </div>
                      <Money hidden={hidden} className="block whitespace-nowrap text-caption text-ink-tertiary">
                        {`${format(c.previous)} → ${format(c.current)}`}
                      </Money>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}

// Fixed vs variable spending over the range, in amounts and shares with a
// split bar; fixed is what recurs (rent, utilities, debt, Programados).
function FixedVsVariable({ report }: { report: Report | null }) {
  const { t } = useTranslation()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const subtitle = useRangeSubtitle(report)
  const total = report?.totals.expenses ?? 0
  const fixed = report?.fixedAmount ?? 0
  const variable = Math.max(0, total - fixed)
  const fixedPct = total > 0 ? Math.round((fixed / total) * 100) : 0
  const side = (label: string, amount: number, pct: number) => (
    <div className="min-w-0">
      <div className="text-overline uppercase text-ink-secondary">{label}</div>
      <Money hidden={hidden} className="mt-1 block whitespace-nowrap text-title-sm font-semibold min-[520px]:text-title">
        {format(amount)}
      </Money>
      <div className="font-numeric text-caption text-ink-tertiary">{pct} %</div>
    </div>
  )
  return (
    <Card>
      <CardTitle title={t('rep.fixedVsVariable')} subtitle={subtitle} />
      {report === null ? (
        <SkeletonBar className="mt-4 h-12 w-full" />
      ) : total === 0 ? (
        <div className="mt-4 text-body-sm text-ink-tertiary">{t('rep.empty.flowBody')}</div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {side(t('rep.fixed'), fixed, fixedPct)}
            {side(t('rep.variable'), variable, 100 - fixedPct)}
          </div>
          <div aria-hidden="true" className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full bg-[var(--chart-primary)]" style={{ width: `${fixedPct}%` }} />
          </div>
          <div className="mt-3 text-caption leading-[1.5] text-ink-tertiary">{t('rep.fixedHint')}</div>
        </>
      )}
    </Card>
  )
}

// Months of runway: how long today's balance lasts at the range's average
// monthly spending.
function Runway({ report }: { report: Report | null }) {
  const { t, language } = useTranslation()
  return (
    <Card>
      <CardTitle title={t('rep.runway')} />
      {report === null ? (
        <SkeletonBar className="mt-4 h-8 w-3/5" />
      ) : report.runwayMonths === null ? (
        <div className="mt-4 text-body-sm text-ink-tertiary">{t('rep.empty.flowBody')}</div>
      ) : (
        <>
          <div className="mt-4 text-title font-semibold">
            {fill(t('rep.runwayValue'), report.runwayMonths.toLocaleString(language === 'en' ? 'en-US' : 'es-CO', { maximumFractionDigits: 1 }))}
          </div>
          <div className="mt-3 text-caption leading-[1.5] text-ink-tertiary">{fill(t('rep.runwayHint'), report.range)}</div>
        </>
      )}
    </Card>
  )
}

function IncomeTab({ report }: { report: Report | null }) {
  const { t, language } = useTranslation()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const subtitle = useRangeSubtitle(report)
  const sources = report?.incomeSources ?? null
  // Newest first: each month's income and its change against the month before.
  const changes = report ? report.months.map((m, i) => ({ ...m, prev: i > 0 ? report.months[i - 1]!.income : null })).reverse() : null

  return (
    <div className="grid grid-cols-1 gap-[18px] min-[1100px]:grid-cols-2">
      <Card>
        <CardTitle title={t('rep.incomeSources')} subtitle={subtitle} />
        <div className="mt-5 flex flex-col gap-4">
          {sources === null ? (
            <RowSkeletons count={3} />
          ) : sources.length === 0 ? (
            <EmptyChart title={t('rep.empty.incomeTitle')} description={t('rep.empty.sourcesBody')} />
          ) : (
            sources.map((s) => (
              <div key={`${s.category}|${s.merchant ?? ''}`}>
                <div className="mb-[7px] flex justify-between gap-2.5 text-label font-semibold">
                  <span className="min-w-0 truncate">{s.merchant ? `${categoryName(s.category)} — ${s.merchant}` : categoryName(s.category)}</span>
                  <span className="font-numeric whitespace-nowrap">
                    <Money hidden={hidden} inline>
                      {format(s.amount)}
                    </Money>{' '}
                    <span className="font-semibold text-ink-tertiary">{s.percentage}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-[4px] bg-v2-line">
                  <div
                    className="h-full"
                    style={{
                      width: `${s.percentage}%`,
                      background: s.category === 'inc.work.salary' ? 'var(--color-positive)' : categoryColor(s.category),
                      opacity: s.category !== 'inc.work.salary' && s.category.startsWith('inc.work') ? 0.65 : 1,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <CardTitle title={t('rep.incomeChange')} subtitle={t('rep.incomeChangeSub')} />
        <div className="mt-3 flex flex-col">
          {changes === null ? (
            <RowSkeletons count={4} />
          ) : (
            changes.map((m) => {
              const pct = m.prev ? Math.round(((m.income - m.prev) / m.prev) * 100) : null
              return (
                <div key={m.month} className="flex min-h-12 items-center gap-3 border-b border-divider py-2 last:border-b-0">
                  {/* The amount takes width first; the month truncates. */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-label font-semibold capitalize" title={monthYear(m.month, language)}>{monthYear(m.month, language)}</div>
                    {/* The current month is still open, so its change isn't final. */}
                    {m.month === report?.month && <div className="text-caption text-ink-tertiary">{t('rep.inProgress')}</div>}
                  </div>
                  <Money hidden={hidden} className="flex-none whitespace-nowrap text-right text-label">
                    {format(m.income)}
                  </Money>
                  <span className={cn('font-numeric min-w-16 flex-none whitespace-nowrap text-right text-label font-semibold', pct === null || pct === 0 ? 'text-ink-tertiary' : pct > 0 ? 'text-positive' : 'text-negative')}>
                    {pct === null ? '—' : pct === 0 ? '0 %' : `${pct > 0 ? '↑ +' : '↓ −'}${Math.abs(pct)} %`}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}

function CashFlowTab({ wallets, series }: { wallets: Wallet[] | null; series: RecurringSeries[] | null }) {
  const { t, language } = useTranslation()
  const { format, formatIn, currency: principal } = useCurrency()
  const { hidden } = useHideAmounts()
  const today = todayISO()
  // Each wallet in the principal currency, as Inicio's balance.
  const walletTotal = wallets?.reduce((s, w) => s + w.principalBalance, 0) ?? null
  // Through the end of next month: this month and the next one, each with
  // the balance it would close with.
  const thisMonth = today.slice(0, 7)
  const [ty, tm] = thisMonth.split('-').map(Number)
  const nextMonth = `${tm === 12 ? ty! + 1 : ty}-${String(tm === 12 ? 1 : tm! + 1).padStart(2, '0')}`
  const horizon = `${nextMonth}-${String(new Date(Date.UTC(Number(nextMonth.slice(0, 4)), Number(nextMonth.slice(5, 7)), 0)).getUTCDate()).padStart(2, '0')}`
  const events = useMemo(() => (series && walletTotal !== null ? projectUntil(series, today, walletTotal, horizon, principal) : null), [series, walletTotal, today, horizon, principal])
  const payday = events?.findIndex((e) => e.series.type === 'income') ?? -1
  const beforePayday = events ? (payday >= 0 ? events.slice(0, payday) : events) : []
  const lowest = beforePayday.reduce<(typeof beforePayday)[number] | null>((low, e) => (low === null || e.running < low.running ? e : low), null)
  const closeOf = (month: string) => {
    const last = events?.filter((e) => e.date.slice(0, 7) <= month).at(-1)
    return last ? last.running : (walletTotal ?? 0)
  }

  const row = (e: NonNullable<typeof events>[number]) => {
    const [, m, d] = e.date.split('-').map(Number)
    return (
      <div key={`${e.series.id}|${e.date}`} className="flex items-center gap-4 border-b border-divider py-[13px]">
        <span className="w-16 flex-none text-caption font-semibold tracking-[.08em] text-ink-tertiary">
          {e.dueToday ? t('rep.today') : `${String(d).padStart(2, '0')} ${MONTHS_SHORT[language][m! - 1]!.toUpperCase()}`}
        </span>
        <span className="min-w-0 flex-1 truncate text-label font-semibold" title={e.series.name}>
          {e.series.name}
        </span>
        <div className="min-w-[110px] flex-none text-right">
          <Money hidden={hidden} className={cn('block whitespace-nowrap text-label font-semibold', e.signed < 0 ? 'text-negative' : 'text-positive')}>
            {`${e.signed < 0 ? '−' : '+'}${formatIn(Math.abs(e.signed), e.series.currency)}`}
          </Money>
          {e.series.currency !== principal && (
            <Money hidden={hidden} className="block whitespace-nowrap text-caption text-ink-tertiary">
              {`≈ ${formatApprox(Math.abs(e.signed) * referenceRate(e.series.currency, principal), principal)}`}
            </Money>
          )}
          <Money hidden={hidden} className="block whitespace-nowrap text-caption text-ink-tertiary min-[520px]:hidden">
            {fill(t('inicio.upcoming.balance'), format(e.running))}
          </Money>
        </div>
        <Money hidden={hidden} className="w-[120px] flex-none whitespace-nowrap text-right text-caption text-ink-secondary max-[519px]:hidden">
          {format(e.running)}
        </Money>
      </div>
    )
  }
  const close = (month: string) => (
    <div key={`close-${month}`} className="flex items-baseline justify-between gap-3 border-b border-border bg-surface-sunken px-3 py-2.5">
      <span className="text-label font-semibold text-ink-secondary">{fill(t('rep.closeOf'), monthName(month, language))}</span>
      <Money hidden={hidden} className="whitespace-nowrap text-title-sm font-semibold">
        {format(closeOf(month))}
      </Money>
    </div>
  )

  return (
    <Card>
      <CardTitle title={fill(t('rep.projection'), monthName(nextMonth, language))} subtitle={t('rep.upcomingSub')} />
      <div className="mt-4 flex flex-col">
        {events === null ? (
          <RowSkeletons count={4} />
        ) : events.length === 0 ? (
          <div className="py-3 text-body-sm text-ink-tertiary">{t('rep.upcomingEmpty')}</div>
        ) : (
          [thisMonth, nextMonth].flatMap((month) => [...events.filter((e) => e.date.slice(0, 7) === month).map(row), close(month)])
        )}
      </div>
      {lowest && (
        <div className="mt-3.5 text-caption text-ink-tertiary">
          {/* The mockup sets the lowest balance in bold warning color. */}
          {t(payday >= 0 ? 'rep.lowestBeforeSalary' : 'rep.lowest')
            .split(/(\{\d\})/)
            .map((chunk, i) =>
              chunk === '{0}' ? (
                <Money key={i} hidden={hidden} className="font-semibold text-warning">
                  {format(lowest.running)}
                </Money>
              ) : chunk === '{1}' ? (
                shortDate(lowest.date, language)
              ) : (
                chunk
              ),
            )}
        </div>
      )}
    </Card>
  )
}

function NetWorthTab({ report }: { report: Report | null }) {
  const { t, language } = useTranslation()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const history = report?.netWorth.history ?? []

  const side = (label: string, data: Report['netWorth']['lent'] | undefined, tone: string, emptyKey: TranslationKey) => (
    <div className="nova-card-sunken p-4">
      <div className="text-overline font-semibold uppercase text-ink-tertiary">{label}</div>
      {!data ? (
        <SkeletonBar className="mt-2.5 h-5 w-3/5" />
      ) : data.outstanding > 0 ? (
        <>
          <Money hidden={hidden} className="mt-1.5 block text-title font-semibold tabular-nums" style={{ color: tone }}>
            {format(data.outstanding)}
          </Money>
          <div className="mt-1 text-caption text-ink-tertiary">
            {[
              data.people === 1 ? t('rep.people.one') : fill(t('rep.people.many'), data.people),
              data.settled > 0 ? (data.settled === 1 ? t('rep.settled.one') : fill(t('rep.settled.many'), data.settled)) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </>
      ) : (
        <>
          <div className="mt-1.5 text-title font-semibold tabular-nums text-ink-tertiary">—</div>
          <div className="mt-1 text-caption text-ink-tertiary">{t(emptyKey)}</div>
        </>
      )}
    </div>
  )

  // Wallets + what others owe − what is owed = net worth, one line each with
  // its sign, so the total adds up on screen.
  const line = (label: string, value: number, sign: '' | '+' | '−', strong = false) => (
    <div className={cn('flex items-baseline justify-between gap-3 py-2.5', strong ? 'border-t border-border pt-3.5' : 'border-b border-divider')}>
      <span className={cn('min-w-0 truncate', strong ? 'text-label font-semibold text-ink' : 'text-body-sm text-ink-secondary')}>{label}</span>
      <Money hidden={hidden} className={cn('flex-none whitespace-nowrap tabular-nums', strong ? 'text-title font-semibold' : 'text-label font-semibold')}>
        {`${value > 0 ? sign : ''}${format(value)}`}
      </Money>
    </div>
  )

  return (
    <div className="grid grid-cols-1 gap-[18px] min-[1100px]:grid-cols-2 min-[1100px]:items-start">
      <Card>
        <CardTitle title={t('rep.netWorth')} subtitle={t('rep.nw.sub')} />
        <div className="mt-3 flex flex-col">
          {report === null ? (
            <RowSkeletons count={3} />
          ) : (
            <>
              {line(t('rep.nw.wallets'), report.netWorth.wallets, '')}
              {line(t('rep.nw.lent'), report.netWorth.lent.outstanding, '+')}
              {line(t('rep.nw.borrowed'), report.netWorth.borrowed.outstanding, '−')}
              {line(t('rep.netWorth'), report.netWorth.total, '', true)}
            </>
          )}
        </div>
        <div className="mt-6 text-overline font-semibold uppercase text-ink-tertiary">{t('rep.lastSixMonths')}</div>
        <div className="mt-3.5">
          {report === null ? (
            <SkeletonBar className="h-[140px] w-full" />
          ) : (
            <BarChart
              labels={history.map((h) => monthAbbr(h.month, language))}
              series={[{ key: 'netWorth', label: t('rep.netWorth'), color: 'var(--chart-primary)', values: history.map((h) => Math.max(0, h.netWorth)) }]}
              format={format}
              hidden={hidden}
              height={140}
              highlightLast
              summary={fill(t('rep.summary.netWorth'), hidden ? t('inicio.amountHidden') : format(report.netWorth.total))}
              tableCaption={t('rep.lastSixMonths')}
              empty={{ title: t('rep.empty.netWorthTitle'), description: t('rep.empty.netWorthBody') }}
            />
          )}
        </div>
      </Card>

      <Card>
        <CardTitle title={t('rep.loans')} subtitle={t('rep.loansSub')} />
        <div className="mt-[18px] grid grid-cols-1 gap-3.5 min-[520px]:grid-cols-2">
          {side(t('rep.lent'), report?.netWorth.lent, 'var(--color-positive)', 'rep.noLent')}
          {side(t('rep.borrowed'), report?.netWorth.borrowed, 'var(--color-negative)', 'rep.noBorrowed')}
        </div>
      </Card>
    </div>
  )
}
