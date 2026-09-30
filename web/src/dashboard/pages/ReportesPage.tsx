import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart, ChartLegend } from '@/components/v2/BarChart'
import { CategoryMark } from '@/components/v2/CategoryMark'
import { Money, MoneyText } from '@/components/v2/Money'
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
import { todayISO, weekdayLabel } from '@/lib/date'
import { MONTHS_SHORT, fill, monthAbbr, monthYear, shortDate, upcomingWithin, walletKind } from '@/lib/inicio'
import type { TranslationKey } from '@/lib/i18n/translations'
import type { AccountType, RecurringSeries, Wallet } from '@/types'

const TABS: { id: 'gastos' | 'ingresos' | 'flujo' | 'patrimonio'; labelKey: TranslationKey }[] = [
  { id: 'gastos', labelKey: 'rep.tab.spending' },
  { id: 'ingresos', labelKey: 'rep.tab.income' },
  { id: 'flujo', labelKey: 'rep.tab.cashFlow' },
  { id: 'patrimonio', labelKey: 'rep.tab.netWorth' },
]
const RANGES: ReportRange[] = [3, 6, 12]

// Patrimonio's wallet squares: each wallet type's mockup color at 0x29
// alpha. The mockup's savings color is `var(--accent)29`, which is invalid
// CSS and never paints, so those squares stay empty as drawn.
function walletSquare(type: AccountType): string | undefined {
  const kind = walletKind(type)
  if (kind === 'digital') return '#D95DB229'
  if (kind === 'cash') return '#E8A23D29'
  if (kind === 'savings' || kind === 'debit') return undefined
  return '#9C9CAA29'
}

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
    <div className="flex flex-col gap-[18px] px-4 pb-10 pt-[26px] min-[760px]:px-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline font-bold">{t('rep.title')}</h1>
          <div className="mt-0.5 text-body-sm text-ink-tertiary">{monthYear(report?.month ?? today.slice(0, 7), language)}</div>
        </div>
        {/* Segmented 3M / 6M / 12M (DESIGN-SYSTEM.md §6.5). */}
        <div role="radiogroup" aria-label={t('rep.range')} className="flex h-10 gap-1 rounded-[12px] bg-surface-sunken p-1">
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
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((x) => {
          const on = x.id === tab
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={on}
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
      {tab === 'flujo' && <CashFlowTab report={report} wallets={wallets} series={series} />}
      {tab === 'patrimonio' && <NetWorthTab report={report} wallets={wallets} />}
    </div>
  )
}

function Card({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn('min-w-0 rounded-[16px] border border-border bg-surface p-5', className)} style={style}>
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
    <div className={cn('min-w-0 rounded-[16px] border border-border bg-surface', className)} style={style}>
      <div className={cn('truncate text-overline uppercase', labelClass ?? 'text-ink-secondary')}>{label}</div>
      {children}
    </div>
  )
}

function useRangeSubtitle(report: Report | null) {
  const { t } = useTranslation()
  return fill(t('rep.lastMonths'), report?.range ?? 6)
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

  return (
    <>
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
              />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <CardTitle title={t('rep.whereMoneyWent')} subtitle={fill(t('rep.sameCategories'), monthYear(report?.month ?? todayISO().slice(0, 7), language))} />
            <div role="radiogroup" aria-label={t('rep.whereMoneyWent')} className="flex gap-0.5 rounded-full border border-border bg-v2-surface2 p-[3px]">
              {(['parent', 'sub'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={level === k}
                  onClick={() => setLevel(k)}
                  className={cn('cursor-pointer rounded-full px-[11px] py-[5px] text-caption font-bold', level === k ? 'bg-v2-accent text-white' : 'text-ink-tertiary')}
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
              <div className="text-body-sm text-ink-tertiary">{t('rep.noSpending')}</div>
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
                      <div className="h-full rounded-full" style={{ width: `${Math.round((c.amount / top[0]!.amount) * 100)}%`, background: categoryColor(c.category) }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3.5 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-4">
        <Kpi label={t('rep.dailyAverage')} className="px-[18px] py-4">
          <KpiValue report={report} numeric>
            {report && <Money hidden={hidden}>{format(report.dailyAverage)}</Money>}
          </KpiValue>
        </Kpi>
        <Kpi label={t('rep.peakDay')} className="px-[18px] py-4">
          <KpiValue report={report}>{report && (report.peakWeekday === null ? '—' : weekdayLabel(report.peakWeekday, language))}</KpiValue>
        </Kpi>
        <Kpi label={t('rep.fixedVsVariable')} className="px-[18px] py-4">
          <KpiValue report={report}>{report && (report.fixedShare === null ? '—' : `${report.fixedShare} / ${100 - report.fixedShare}`)}</KpiValue>
        </Kpi>
        <Kpi label={t('rep.runway')} className="px-[18px] py-4">
          <KpiValue report={report} numeric>
            {report && (report.runwayMonths === null ? '—' : report.runwayMonths.toLocaleString(language === 'en' ? 'en-US' : 'es-CO', { maximumFractionDigits: 1 }))}
          </KpiValue>
        </Kpi>
      </div>
    </>
  )
}

function KpiValue({ report, numeric, children }: { report: Report | null; numeric?: boolean; children: ReactNode }) {
  if (!report) return <SkeletonBar className="mt-2.5 h-5 w-3/5" />
  return <div className={cn('mt-1 text-title font-semibold', numeric && 'font-numeric')}>{children}</div>
}

function IncomeTab({ report }: { report: Report | null }) {
  const { t, language } = useTranslation()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const subtitle = useRangeSubtitle(report)
  const best = report?.months.reduce<(typeof report.months)[number] | null>((p, m) => (p === null || m.income > p.income ? m : p), null)
  const incomeSummary = best ? fill(t('rep.summary.income'), monthAbbr(best.month, language), hidden ? t('inicio.amountHidden') : format(best.income)) : ''
  const sources = report?.incomeSources ?? null
  const salary = sources?.find((s) => s.category === 'inc.work.salary')
  const freelance = sources?.find((s) => s.category === 'inc.work.freelance')

  return (
    <div className="grid grid-cols-1 gap-[18px] min-[1100px]:grid-cols-2">
      <Card>
        <CardTitle title={t('rep.incomeSources')} subtitle={subtitle} />
        <div className="mt-5 flex flex-col gap-4">
          {sources === null ? (
            <RowSkeletons count={3} />
          ) : sources.length === 0 ? (
            <div className="text-body-sm text-ink-tertiary">{t('rep.noIncome')}</div>
          ) : (
            sources.map((s) => (
              <div key={`${s.category}|${s.merchant ?? ''}`}>
                <div className="mb-[7px] flex justify-between gap-2.5 text-[13px] font-bold">
                  <span>{s.merchant ? `${categoryName(s.category)} — ${s.merchant}` : categoryName(s.category)}</span>
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
                    // The mockup: salary in the positive green, the rest of
                    // Trabajo in its color at 65%, anything else in its color.
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
        {salary && freelance && report && (
          <div className="mt-[22px] border-t border-divider pt-3.5 text-caption leading-[1.6] text-ink-tertiary">
            <MoneyText
              parts={[{ template: t('rep.freelanceNote'), args: [{ amount: freelance.monthlyMin }, { amount: freelance.monthlyMax }, t(`rep.months.${report.range}` as TranslationKey)] }]}
              hidden={hidden}
              format={format}
            />
          </div>
        )}
      </Card>

      <Card>
        <CardTitle title={t('rep.incomeByMonth')} subtitle={t('rep.incomeByMonthSub')} />
        <div className="mt-5">
          {report === null ? (
            <SkeletonBar className="h-[212px] w-full" />
          ) : (
            <BarChart
              labels={report.months.map((m) => monthAbbr(m.month, language))}
              series={[{ key: 'income', label: t('rep.income'), color: 'var(--color-positive)', values: report.months.map((m) => m.income) }]}
              format={format}
              hidden={hidden}
              height={200}
              highlightLast
              summary={incomeSummary}
              tableCaption={t('rep.incomeByMonth')}
            />
          )}
        </div>
      </Card>
    </div>
  )
}

function CashFlowTab({ report, wallets, series }: { report: Report | null; wallets: Wallet[] | null; series: RecurringSeries[] | null }) {
  const { t, language } = useTranslation()
  const { format, formatIn, currency: principal } = useCurrency()
  const { hidden } = useHideAmounts()
  const today = todayISO()
  // Each wallet in the principal currency, as Inicio's balance.
  const walletTotal = wallets?.reduce((s, w) => s + w.principalBalance, 0) ?? null
  // Inicio's "Próximos 14 días": each active Programado's next occurrence,
  // due-today first, applied to today's wallet total.
  const events = useMemo(() => (series && walletTotal !== null ? upcomingWithin(series, today, walletTotal, 14, principal) : null), [series, walletTotal, today, principal])
  const payday = events?.findIndex((e) => e.series.type === 'income') ?? -1
  const beforePayday = events ? (payday >= 0 ? events.slice(0, payday) : events) : []
  const lowest = beforePayday.reduce<(typeof beforePayday)[number] | null>((low, e) => (low === null || e.running < low.running ? e : low), null)
  // The mockup's Entradas/Salidas/Flujo neto are the current month's.
  const month = report?.months[report.months.length - 1]
  const net = month?.net ?? 0

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid grid-cols-1 gap-3.5 min-[760px]:grid-cols-3">
        <Kpi label={t('rep.inflows')} className="px-5 py-[18px]">
          {report ? (
            <Money hidden={hidden} className="mt-1.5 block text-[24px] font-extrabold tracking-[-.025em] text-positive">
              {format(month?.income ?? 0)}
            </Money>
          ) : (
            <SkeletonBar className="mt-2.5 h-6 w-3/5" />
          )}
        </Kpi>
        <Kpi label={t('rep.outflows')} className="px-5 py-[18px]">
          {report ? (
            <Money hidden={hidden} className="mt-1.5 block text-[24px] font-extrabold tracking-[-.025em] text-negative">
              {format(month?.expenses ?? 0)}
            </Money>
          ) : (
            <SkeletonBar className="mt-2.5 h-6 w-3/5" />
          )}
        </Kpi>
        <Kpi
          label={t('rep.netFlow')}
          labelClass="text-v2-accent2"
          className="px-5 py-[18px]"
          style={{ borderColor: 'var(--v2-hero-line)', background: 'linear-gradient(160deg,color-mix(in srgb, var(--v2-accent) 16%, transparent),var(--v2-surface) 70%)' }}
        >
          {report ? (
            <Money hidden={hidden} className="mt-1.5 block text-[24px] font-extrabold tracking-[-.025em]">
              {`${net < 0 ? '−' : '+'}${format(Math.abs(net))}`}
            </Money>
          ) : (
            <SkeletonBar className="mt-2.5 h-6 w-3/5" />
          )}
        </Kpi>
      </div>

      <Card>
        <CardTitle title={t('rep.upcoming')} subtitle={t('rep.upcomingSub')} />
        <div className="mt-4 flex flex-col">
          {events === null ? (
            <RowSkeletons count={4} />
          ) : events.length === 0 ? (
            <div className="py-3 text-body-sm text-ink-tertiary">{t('rep.upcomingEmpty')}</div>
          ) : (
            events.map((e) => {
              const [, m, d] = e.date.split('-').map(Number)
              return (
                <div key={e.series.id} className="flex items-center gap-4 border-b border-divider py-[13px]">
                  <span className="w-16 flex-none text-caption font-bold tracking-[.08em] text-ink-tertiary">
                    {e.dueToday ? t('rep.today') : `${String(d).padStart(2, '0')} ${MONTHS_SHORT[language][m! - 1]!.toUpperCase()}`}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold" title={e.series.name}>
                    {e.series.name}
                  </span>
                  {/* The amount in the Programado's own currency (with the "≈" line when it
                      isn't the principal), as in Inicio's Próximos 14 días. Below 520px the
                      balance moves under it instead of taking its own column. */}
                  <div className="min-w-[110px] flex-none text-right">
                    <Money hidden={hidden} className={cn('block whitespace-nowrap text-[13px] font-extrabold', e.signed < 0 ? 'text-negative' : 'text-positive')}>
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
                  <Money hidden={hidden} className="w-[120px] flex-none whitespace-nowrap text-right text-[12.5px] text-ink-secondary max-[519px]:hidden">
                    {format(e.running)}
                  </Money>
                </div>
              )
            })
          )}
        </div>
        {lowest && (
          <div className="mt-3.5 text-caption text-ink-tertiary">
            {/* The mockup sets the lowest balance in bold warning color. */}
            {t(payday >= 0 ? 'rep.lowestBeforeSalary' : 'rep.lowest')
              .split(/(\{\d\})/)
              .map((chunk, i) =>
                chunk === '{0}' ? (
                  <Money key={i} hidden={hidden} className="font-bold text-warning">
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
    </div>
  )
}

function NetWorthTab({ report, wallets }: { report: Report | null; wallets: Wallet[] | null }) {
  const { t, language } = useTranslation()
  const { format, formatIn } = useCurrency()
  const { hidden } = useHideAmounts()
  const history = report?.netWorth.history ?? []

  const side = (label: string, data: Report['netWorth']['lent'] | undefined, tone: string, emptyKey: TranslationKey) => (
    <div className="rounded-[14px] border border-border bg-v2-surface2 p-4">
      <div className="text-caption font-bold uppercase tracking-[.1em] text-ink-tertiary">{label}</div>
      {!data ? (
        <SkeletonBar className="mt-2.5 h-5 w-3/5" />
      ) : data.outstanding > 0 ? (
        <>
          <Money hidden={hidden} className="mt-1.5 block text-[20px] font-extrabold" style={{ color: tone }}>
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
          <div className="font-numeric mt-1.5 text-[20px] font-extrabold text-ink-tertiary">—</div>
          <div className="mt-1 text-caption text-ink-tertiary">{t(emptyKey)}</div>
        </>
      )}
    </div>
  )

  return (
    <div className="grid grid-cols-1 gap-[18px] min-[1100px]:grid-cols-2">
      <Card>
        <CardTitle title={t('rep.wallets')} subtitle={t('rep.walletsSub')} />
        <div className="mt-4 flex flex-col">
          {wallets === null ? (
            <RowSkeletons count={3} box={30} />
          ) : (
            wallets.map((w) => (
              <div key={w.id} className="flex items-center gap-3.5 border-b border-divider py-[13px]">
                <span className="h-[30px] w-[30px] flex-none rounded-[10px]" style={{ background: walletSquare(w.accountType) }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold">{w.name}</div>
                  <div className="text-caption text-ink-tertiary">{t(`inicio.walletKind.${walletKind(w.accountType)}` as TranslationKey)}</div>
                </div>
                <Money hidden={hidden} className="text-[14px] font-extrabold">
                  {formatIn(w.currentBalance, w.currency)}
                </Money>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3.5">
          <span className="text-[12.5px] font-bold text-ink-secondary">{t('rep.netWorth')}</span>
          {report ? (
            <Money hidden={hidden} className="text-[22px] font-extrabold tracking-[-.025em]">
              {format(report.netWorth.wallets)}
            </Money>
          ) : (
            <SkeletonBar className="h-6 w-28" />
          )}
        </div>
      </Card>

      <Card>
        <CardTitle title={t('rep.loans')} subtitle={t('rep.loansSub')} />
        <div className="mt-[18px] grid grid-cols-1 gap-3.5 min-[520px]:grid-cols-2">
          {side(t('rep.lent'), report?.netWorth.lent, 'var(--color-positive)', 'rep.noLent')}
          {side(t('rep.borrowed'), report?.netWorth.borrowed, 'var(--color-negative)', 'rep.noBorrowed')}
        </div>
        <div className="mt-6 text-caption font-bold uppercase tracking-[.1em] text-ink-tertiary">{t('rep.lastSixMonths')}</div>
        <div className="mt-3.5">
          {report === null ? (
            <SkeletonBar className="h-[140px] w-full" />
          ) : (
            <BarChart
              labels={history.map((h) => monthAbbr(h.month, language))}
              series={[{ key: 'netWorth', label: t('rep.netWorth'), color: 'var(--chart-primary)', values: history.map((h) => Math.max(0, h.balance)) }]}
              format={format}
              hidden={hidden}
              height={140}
              highlightLast
              summary={fill(t('rep.summary.netWorth'), hidden ? t('inicio.amountHidden') : format(report.netWorth.wallets))}
              tableCaption={t('rep.lastSixMonths')}
            />
          )}
        </div>
      </Card>
    </div>
  )
}
