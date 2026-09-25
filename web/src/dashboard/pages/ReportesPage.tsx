import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Money, MoneyText } from '@/components/v2/Money'
import { RowSkeletons, SkeletonBar, SyncBanner } from '@/components/v2/Rows'
import { accountService } from '@/services/accountService'
import { recurringService } from '@/services/recurringService'
import { summaryService, type Report, type ReportRange } from '@/services/summaryService'
import { useAppData } from '@/state/AppDataContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useTranslation } from '@/state/useTranslation'
import { categoryColor } from '@/lib/categoryGlyphs'
import { cn } from '@/lib/cn'
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

// The tallest bar fills ~74% of the plot, as in the mockup (its 4,42M top
// month on a fixed 6M scale), leaving the same headroom above.
const BAR_HEADROOM = 1.36

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
          <h1 className="text-[24px] font-extrabold tracking-[-.025em]">{t('rep.title')}</h1>
          <div className="mt-[3px] text-[12.5px] text-v2-dim">{monthYear(report?.month ?? today.slice(0, 7), language)}</div>
        </div>
        <div role="radiogroup" aria-label={t('rep.title')} className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={range === r}
              onClick={() => setRange(r)}
              className={cn(
                'cursor-pointer rounded-[9px] border px-[13px] py-[7px] text-[11.5px] font-bold',
                range === r ? 'border-v2-accent bg-v2-accent text-v2-text' : 'border-v2-line bg-v2-surface text-v2-dim',
              )}
            >
              {r}M
            </button>
          ))}
        </div>
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-v2-line">
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
                'mb-[-1px] flex-none cursor-pointer border-b-2 px-3.5 py-2.5 text-[12.5px]',
                on ? 'border-v2-accent3 font-extrabold text-v2-text' : 'border-transparent font-semibold text-v2-dim',
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
    <div className={cn('rounded-[16px] border border-v2-line bg-v2-surface p-5', className)} style={style}>
      {children}
    </div>
  )
}

function CardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="text-[14px] font-extrabold tracking-[-.01em]">{title}</div>
      {subtitle && <div className="mt-0.5 text-[11.5px] text-v2-dim">{subtitle}</div>}
    </div>
  )
}

function Kpi({ label, children, className, labelClass, style }: { label: string; children: ReactNode; className?: string; labelClass?: string; style?: CSSProperties }) {
  return (
    <div className={cn('rounded-[16px] border border-v2-line bg-v2-surface', className)} style={style}>
      <div className={cn('text-[10px] font-bold uppercase tracking-[.1em]', labelClass ?? 'text-v2-dim')}>{label}</div>
      {children}
    </div>
  )
}

function useRangeSubtitle(report: Report | null) {
  const { t } = useTranslation()
  return fill(t('rep.lastMonths'), report?.range ?? 6)
}

function barCeiling(values: number[]): number {
  return Math.max(1, ...values) * BAR_HEADROOM
}

function SpendingTab({ report }: { report: Report | null }) {
  const { t, tCategory, language } = useTranslation()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const subtitle = useRangeSubtitle(report)
  const ceiling = report ? barCeiling(report.months.flatMap((m) => [m.income, m.expenses])) : 1
  const top = report?.categories.slice(0, 5) ?? null

  return (
    <>
      <div className="grid grid-cols-1 gap-[18px] min-[1100px]:grid-cols-[1.45fr_1fr]">
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <CardTitle title={t('rep.incomeVsExpenses')} subtitle={subtitle} />
            <div className="flex gap-3 text-[11px] font-bold text-v2-muted">
              <span className="flex items-center gap-[5px]">
                <span className="h-2 w-2 rounded-[2px] bg-v2-pos" />
                {t('rep.income')}
              </span>
              <span className="flex items-center gap-[5px]">
                <span className="h-2 w-2 rounded-[2px] bg-v2-neg" />
                {t('rep.expenses')}
              </span>
            </div>
          </div>
          <div className="mt-[22px] flex h-[236px] items-end gap-3.5 border-b border-v2-line pb-0.5">
            {report?.months.map((m) => (
              <div key={m.month} className="flex h-full flex-1 items-end justify-center gap-1">
                <div className="w-[46%] max-w-[26px] rounded-t-[4px] bg-v2-pos transition-[height] duration-300" style={{ height: `${(m.income / ceiling) * 100}%` }} />
                <div className="w-[46%] max-w-[26px] rounded-t-[4px] bg-v2-neg transition-[height] duration-300" style={{ height: `${(m.expenses / ceiling) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3.5">
            {report?.months.map((m) => (
              <div key={m.month} className="flex-1 text-center text-[10.5px] font-semibold text-v2-dim">
                {monthAbbr(m.month, language)}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle title={t('rep.whereMoneyWent')} subtitle={t('rep.topCategories')} />
          <div className="mt-[18px] flex flex-col gap-3.5">
            {top === null ? (
              <RowSkeletons count={4} />
            ) : top.length === 0 ? (
              <div className="text-[12.5px] text-v2-dim">{t('rep.noSpending')}</div>
            ) : (
              top.map((c) => (
                <div key={c.category}>
                  <div className="mb-1.5 flex justify-between gap-2.5 text-[12.5px] font-bold">
                    <span>{tCategory(c.category)}</span>
                    <span className={cn('font-numeric', c.rising ? 'text-v2-neg' : 'text-v2-muted')}>
                      <Money hidden={hidden} inline>
                        {format(c.amount)}
                      </Money>
                      {c.rising && ` · +${c.change}%`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-[3px] bg-v2-line">
                    <div className="h-full" style={{ width: `${Math.round((c.amount / top[0]!.amount) * 100)}%`, background: categoryColor(c.category) }} />
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
  return <div className={cn('mt-1.5 text-[22px] font-extrabold tracking-[-.025em]', numeric && 'font-numeric')}>{children}</div>
}

function IncomeTab({ report }: { report: Report | null }) {
  const { t, tCategory, language } = useTranslation()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const subtitle = useRangeSubtitle(report)
  const ceiling = report ? barCeiling(report.months.flatMap((m) => [m.income, m.expenses])) : 1
  const sources = report?.incomeSources ?? null
  const salary = sources?.find((s) => s.category === 'salary')
  const freelance = sources?.find((s) => s.category === 'freelance')

  return (
    <div className="grid grid-cols-1 gap-[18px] min-[1100px]:grid-cols-2">
      <Card>
        <CardTitle title={t('rep.incomeSources')} subtitle={subtitle} />
        <div className="mt-5 flex flex-col gap-4">
          {sources === null ? (
            <RowSkeletons count={3} />
          ) : sources.length === 0 ? (
            <div className="text-[12.5px] text-v2-dim">{t('rep.noIncome')}</div>
          ) : (
            sources.map((s) => (
              <div key={`${s.category}|${s.merchant ?? ''}`}>
                <div className="mb-[7px] flex justify-between gap-2.5 text-[13px] font-bold">
                  <span>{s.merchant ? `${tCategory(s.category)} — ${s.merchant}` : tCategory(s.category)}</span>
                  <span className="font-numeric whitespace-nowrap">
                    <Money hidden={hidden} inline>
                      {format(s.amount)}
                    </Money>{' '}
                    <span className="font-semibold text-v2-dim">{s.percentage}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-[4px] bg-v2-line">
                  <div className="h-full" style={{ width: `${s.percentage}%`, background: s.category === 'salary' ? 'var(--v2-pos)' : categoryColor(s.category) }} />
                </div>
              </div>
            ))
          )}
        </div>
        {salary && freelance && report && (
          <div className="mt-[22px] border-t border-v2-subtle pt-3.5 text-[11.5px] leading-[1.6] text-v2-dim">
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
        <div className="mt-[22px] flex h-[212px] items-end gap-3.5 border-b border-v2-line">
          {report?.months.map((m, i, arr) => (
            <div key={m.month} className="flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] transition-[height] duration-300"
                style={{ height: `${(m.income / ceiling) * 100}%`, background: i === arr.length - 1 ? 'var(--v2-pos)' : 'color-mix(in srgb, var(--v2-pos) 28%, transparent)' }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-3.5">
          {report?.months.map((m) => (
            <div key={m.month} className="flex-1 text-center text-[10.5px] font-semibold text-v2-dim">
              {monthAbbr(m.month, language)}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function CashFlowTab({ report, wallets, series }: { report: Report | null; wallets: Wallet[] | null; series: RecurringSeries[] | null }) {
  const { t, language } = useTranslation()
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const today = todayISO()
  const walletTotal = wallets?.reduce((s, w) => s + w.currentBalance, 0) ?? null
  // Every active Programado's next occurrence, due-today first, applied to
  // today's wallet total — Inicio's "Próximos 14 días" rule over a year.
  const events = useMemo(() => (series && walletTotal !== null ? upcomingWithin(series, today, walletTotal, 366) : null), [series, walletTotal, today])
  const payday = events?.findIndex((e) => e.series.type === 'income') ?? -1
  const beforePayday = events ? (payday >= 0 ? events.slice(0, payday) : events) : []
  const lowest = beforePayday.reduce<(typeof beforePayday)[number] | null>((low, e) => (low === null || e.running < low.running ? e : low), null)
  const net = report?.totals.savings ?? 0

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid grid-cols-1 gap-3.5 min-[760px]:grid-cols-3">
        <Kpi label={t('rep.inflows')} className="px-5 py-[18px]">
          {report ? (
            <Money hidden={hidden} className="mt-1.5 block text-[24px] font-extrabold tracking-[-.025em] text-v2-pos">
              {format(report.totals.income)}
            </Money>
          ) : (
            <SkeletonBar className="mt-2.5 h-6 w-3/5" />
          )}
        </Kpi>
        <Kpi label={t('rep.outflows')} className="px-5 py-[18px]">
          {report ? (
            <Money hidden={hidden} className="mt-1.5 block text-[24px] font-extrabold tracking-[-.025em] text-v2-neg">
              {format(report.totals.expenses)}
            </Money>
          ) : (
            <SkeletonBar className="mt-2.5 h-6 w-3/5" />
          )}
        </Kpi>
        <Kpi
          label={t('rep.netFlow')}
          labelClass="text-v2-accent2"
          className="px-5 py-[18px]"
          style={{ borderColor: 'var(--v2-hero-line)', background: 'linear-gradient(160deg,rgba(108,92,231,.22),var(--v2-surface) 70%)' }}
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
            <div className="py-3 text-[12.5px] text-v2-dim">{t('rep.upcomingEmpty')}</div>
          ) : (
            events.map((e) => {
              const [, m, d] = e.date.split('-').map(Number)
              return (
                <div key={e.series.id} className="flex items-center gap-4 border-b border-v2-subtle py-[13px]">
                  <span className="w-16 flex-none text-[10.5px] font-bold tracking-[.08em] text-v2-dim">
                    {e.dueToday ? t('rep.today') : `${String(d).padStart(2, '0')} ${MONTHS_SHORT[language][m! - 1]!.toUpperCase()}`}
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] font-bold">{e.series.name}</span>
                  <Money hidden={hidden} className={cn('w-[110px] flex-none text-right text-[13px] font-extrabold', e.signed < 0 ? 'text-v2-neg' : 'text-v2-pos')}>
                    {`${e.signed < 0 ? '−' : '+'}${format(Math.abs(e.signed))}`}
                  </Money>
                  <Money hidden={hidden} className="w-[120px] flex-none text-right text-[12.5px] text-v2-muted">
                    {format(e.running)}
                  </Money>
                </div>
              )
            })
          )}
        </div>
        {lowest && (
          <div className="mt-3.5 text-[11.5px] text-v2-dim">
            {/* The mockup sets the lowest balance in bold warning color. */}
            {t(payday >= 0 ? 'rep.lowestBeforeSalary' : 'rep.lowest')
              .split(/(\{\d\})/)
              .map((chunk, i) =>
                chunk === '{0}' ? (
                  <Money key={i} hidden={hidden} className="font-bold text-v2-warn">
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
  const { format } = useCurrency()
  const { hidden } = useHideAmounts()
  const history = report?.netWorth.history ?? []
  const peak = Math.max(1, ...history.map((h) => h.balance))

  const side = (label: string, data: Report['netWorth']['lent'] | undefined, tone: string, emptyKey: TranslationKey) => (
    <div className="rounded-[14px] border border-v2-line bg-v2-surface2 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[.1em] text-v2-dim">{label}</div>
      {!data ? (
        <SkeletonBar className="mt-2.5 h-5 w-3/5" />
      ) : data.outstanding > 0 ? (
        <>
          <Money hidden={hidden} className="mt-1.5 block text-[20px] font-extrabold" style={{ color: tone }}>
            {format(data.outstanding)}
          </Money>
          <div className="mt-1 text-[11px] text-v2-dim">
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
          <div className="font-numeric mt-1.5 text-[20px] font-extrabold text-v2-dim">—</div>
          <div className="mt-1 text-[11px] text-v2-dim">{t(emptyKey)}</div>
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
              <div key={w.id} className="flex items-center gap-3.5 border-b border-v2-subtle py-[13px]">
                <span className="h-[30px] w-[30px] flex-none rounded-[10px]" style={{ background: walletSquare(w.accountType) }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold">{w.name}</div>
                  <div className="text-[11px] text-v2-dim">{t(`inicio.walletKind.${walletKind(w.accountType)}` as TranslationKey)}</div>
                </div>
                <Money hidden={hidden} className="text-[14px] font-extrabold">
                  {format(w.currentBalance)}
                </Money>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 flex items-baseline justify-between border-t border-v2-line pt-3.5">
          <span className="text-[12.5px] font-bold text-v2-muted">{t('rep.netWorth')}</span>
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
          {side(t('rep.lent'), report?.netWorth.lent, 'var(--v2-pos)', 'rep.noLent')}
          {side(t('rep.borrowed'), report?.netWorth.borrowed, 'var(--v2-neg)', 'rep.noBorrowed')}
        </div>
        <div className="mt-6 text-[11px] font-bold uppercase tracking-[.1em] text-v2-dim">{t('rep.lastSixMonths')}</div>
        <div className="mt-3.5 flex h-[120px] items-end gap-2.5">
          {history.map((h, i, arr) => {
            const pct = Math.max(0, (h.balance / peak) * 100)
            // Mockup: the current month in accent3, months at 80%+ of the peak
            // a little stronger than the rest.
            const background = i === arr.length - 1 ? 'var(--v2-accent3)' : pct >= 80 ? 'rgba(165,157,255,.32)' : 'rgba(165,157,255,.24)'
            return <div key={h.month} className="flex-1 rounded-t-[4px]" style={{ height: `${pct}%`, background }} />
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10.5px] text-v2-dim">
          {history.map((h) => (
            <span key={h.month}>{monthAbbr(h.month, language)}</span>
          ))}
        </div>
      </Card>
    </div>
  )
}
