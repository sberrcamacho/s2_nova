import { tr, type TranslationKey } from '@/lib/i18n/translations'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoryMark, Glyph, GlyphMark } from '@/components/v2/CategoryMark'
import { ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { Money, MoneyText } from '@/components/v2/Money'
import { RowButton, RowSkeletons, SkeletonBar, SyncBanner } from '@/components/v2/Rows'
import { EventDialog } from '@/dashboard/components/EventDialog'
import { accountService } from '@/services/accountService'
import { alertService, type AppAlert } from '@/services/alertService'
import { goalService } from '@/services/goalService'
import { recurringService } from '@/services/recurringService'
import { summaryService, type MonthTotals } from '@/services/summaryService'
import { useAppData } from '@/state/AppDataContext'
import { useAuth } from '@/state/AuthContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useTranslation } from '@/state/useTranslation'
import { alertCopy } from '@/lib/alertCopy'
import { budgetScope, planText, shortDayMonth } from '@/lib/planCopy'
import { shortWallet } from '@/lib/movimientos'
import { useToast } from '@/state/ToastContext'
import { goalMark, categoryColor } from '@/lib/categoryGlyphs'
import { TRANSFER, categoryLabel } from '@/lib/backendCategories'
import { todayISO } from '@/lib/date'
import {
  MONTHS_LONG,
  MONTHS_SHORT,
  budgetTone,
  daysLeftInMonth,
  fill,
  loadDismissed,
  monthAbbr,
  percentText,
  pruneDismissed,
  saveDismissed,
  shortDate,
  sortByRisk,
  upcomingWithin,
  type Tone,
} from '@/lib/inicio'
import type { Goal, RecurringSeries, Transaction, Wallet } from '@/types'
import { cn } from '@/lib/cn'
import { formatApprox, formatMoney, referenceRate } from '@/lib/currency'
import { useCountUp } from '@/lib/useCountUp'

const TONE_VAR: Record<Tone, string> = { neg: 'var(--color-negative)', warn: 'var(--color-warning)', pos: 'var(--color-positive)' }
const TONE_ICON: Record<Tone, string> = { neg: ICON_PATHS.alertCircle, warn: ICON_PATHS.warn, pos: ICON_PATHS.check }

interface InicioData {
  wallets: Wallet[] | null
  months: MonthTotals[] | null
  alerts: AppAlert[] | null
  goals: Goal[] | null
  series: RecurringSeries[] | null
}

const EMPTY: InicioData = { wallets: null, months: null, alerts: null, goals: null, series: null }

// Each block keeps its last loaded data when a refresh fails (the sync
// banner says so).
function useInicioData(version: number) {
  const [data, setData] = useState<InicioData>(EMPTY)
  const [syncFailed, setSyncFailed] = useState(false)

  const refresh = useCallback(async () => {
    const today = todayISO()
    const results = await Promise.allSettled([
      accountService.getWallets(),
      summaryService.getMonths(6, today),
      alertService.getAlerts(today),
      goalService.getGoals(),
      recurringService.getRecurringSeries(),
    ])
    const keys = ['wallets', 'months', 'alerts', 'goals', 'series'] as const
    setData((prev) => {
      const next = { ...prev } as Record<(typeof keys)[number], unknown>
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next[keys[i]] = r.value
      })
      return next as unknown as InicioData
    })
    setSyncFailed(results.some((r) => r.status === 'rejected'))
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, version])

  return { data, syncFailed, refresh }
}

// Inicio as a bento summary (DESIGN-SYSTEM.md §5.2 / §5.3), laid out on the
// page's own width: 12 columns from 1024 px (hero 8 + stats 4; Alertas,
// Presupuestos and Metas 4 each; Movimientos recientes 8 + Próximos 14 días
// 4), 2 columns from 640 px and a single column below.
export default function InicioPage() {
  const { t, language } = useTranslation()
  const { format, formatIn, currency: principal } = useCurrency()
  const { hidden, toggle } = useHideAmounts()
  const { showToast } = useToast()
  const { user } = useAuth()
  const { budgets, transactions, isLoading: appLoading, version, refresh: refreshAppData } = useAppData()
  const { data, syncFailed, refresh } = useInicioData(version)
  const navigate = useNavigate()
  const today = todayISO()
  const [openSeriesId, setOpenSeriesId] = useState<string | null>(null)
  const [allAlerts, setAllAlerts] = useState(false)

  const userId = user?.id ?? 'anon'
  const [dismissed, setDismissed] = useState<string[]>(() => loadDismissed(userId))
  useEffect(() => setDismissed(loadDismissed(userId)), [userId])
  useEffect(() => {
    if (!data.alerts) return
    const pruned = pruneDismissed(dismissed, data.alerts.map((a) => a.id))
    if (pruned.length !== dismissed.length) {
      setDismissed(pruned)
      saveDismissed(userId, pruned)
    }
  }, [data.alerts, dismissed, userId])
  const setAndSaveDismissed = (ids: string[]) => {
    setDismissed(ids)
    saveDismissed(userId, ids)
  }

  const walletTotal = data.wallets?.reduce((s, w) => s + w.principalBalance, 0) ?? null
  const shownTotal = useCountUp(walletTotal)
  const walletName = (id: string) => shortWallet(data.wallets?.find((w) => w.id === id)?.name ?? '')
  const thisMonth = data.months?.[data.months.length - 1]
  const lastMonth = data.months?.[data.months.length - 2]
  // Goal contributions and upcoming Programados first; "meta casi cumplida"
  // is left to the Metas tile.
  const FIRST = ['goal_plan_due', 'goal_plan_auto', 'tx_planned']
  const visibleAlerts = (data.alerts ?? [])
    .filter((a) => !dismissed.includes(a.id) && a.kind !== 'goal_near')
    .sort((a, b) => Number(FIRST.includes(b.kind)) - Number(FIRST.includes(a.kind)))
  const shownAlerts = allAlerts ? visibleAlerts : visibleAlerts.slice(0, 2)
  const upcoming = useMemo(
    () => (data.series && walletTotal !== null ? upcomingWithin(data.series, today, walletTotal, 14, principal) : null),
    [data.series, walletTotal, today, principal],
  )
  const recent = useMemo(
    () =>
      transactions
        .filter((x) => (x.status ?? 'completed') !== 'planned')
        .slice()
        .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
        .slice(0, 5),
    [transactions],
  )
  const openSeries = openSeriesId ? data.series?.find((s) => s.id === openSeriesId) : undefined

  const retry = () => {
    void refresh()
    void refreshAppData()
  }

  const openAlert = (alert: AppAlert) => {
    switch (alert.kind) {
      case 'series_due':
        return setOpenSeriesId(alert.seriesId)
      case 'loan_open':
        return navigate(`/planes?tab=prestamos&side=${alert.loanKind}`)
      case 'budget_at_risk':
        return navigate('/planes?tab=presupuestos')
      case 'goal_near':
      case 'goal_plan_due':
      case 'goal_plan_auto':
        return navigate('/planes?tab=metas')
      case 'tx_planned':
        return navigate(`/movimientos?tx=${alert.transactionId}`)
    }
  }

  const resolvePlan = async (alert: Extract<AppAlert, { kind: 'goal_plan_due' }>, confirm: boolean) => {
    try {
      if (confirm) await goalService.confirmPlan(alert.goalId)
      else await goalService.skipPlan(alert.goalId)
      showToast(confirm ? fill(t('inicio.plan.done'), format(alert.amount)) : t('inicio.plan.skipped'))
      void refresh()
      void refreshAppData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('api.generic'), 'error')
    }
  }

  const topBudgets = homeBudgets(budgets)

  return (
    <div className="@container flex flex-col gap-4 px-4 pb-10 pt-6 min-[760px]:px-7">
      {syncFailed && <SyncBanner onRetry={retry} />}

      <div className="grid grid-cols-1 gap-3 @min-[640px]:grid-cols-2 @min-[640px]:gap-4 @min-[1024px]:grid-cols-12">
        {/* Balance hero, 8 */}
        <section
          aria-label={t('inicio.balance')}
          className="relative col-span-full overflow-hidden rounded-[16px] border border-[var(--hero-line)] px-6 py-5 text-white shadow-[var(--shadow-md)] @min-[1024px]:col-span-8"
          style={{ background: 'var(--hero-bg)' }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute right-[-40px] top-[-70px] h-[220px] w-[220px] rounded-full bg-[var(--hero-glow)] blur-[52px]" />
          <div className="relative flex h-full flex-col [container-type:inline-size]">
            <div className="flex items-center justify-between gap-3">
              <div className="truncate text-overline uppercase text-[var(--hero-overline)]">{t('inicio.balance')}</div>
              <button
                type="button"
                onClick={toggle}
                title={hidden ? t('inicio.showAmounts') : t('inicio.hideAmounts')}
                aria-label={t('inicio.hideAmounts')}
                aria-pressed={hidden}
                className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-[var(--hero-tile)] text-white hover:bg-white/[.2]"
              >
                <StrokeIcon paths={hidden ? ICON_PATHS.eyeOff : ICON_PATHS.eye} size={18} />
              </button>
            </div>
            {walletTotal === null ? (
              <SkeletonBar className="mt-3 h-[44px] w-[60%]" dark />
            ) : (
              <Money hidden={hidden} className="mt-1 block whitespace-nowrap text-[clamp(28px,11cqi,40px)] font-bold leading-[1.1] tracking-[-.01em]">
                {format(shownTotal ?? walletTotal)}
              </Money>
            )}
            {data.wallets && data.wallets.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/billeteras')}
                className="mt-3 inline-flex h-8 cursor-pointer self-start items-center gap-1 whitespace-nowrap rounded-full bg-[var(--hero-tile)] pl-3 pr-2 text-label font-semibold text-[var(--hero-label)] hover:bg-white/[.2]"
              >
                {data.wallets.length === 1 ? t('inicio.walletsOne') : fill(t('inicio.walletsMany'), data.wallets.length)}
                <StrokeIcon paths={ICON_PATHS.chevronRight} size={16} />
              </button>
            )}
            {data.wallets && data.wallets.length === 0 && (
              <button type="button" onClick={() => navigate('/billeteras')} className="mt-3 cursor-pointer self-start text-label font-semibold text-[var(--hero-label)] underline">
                {t('inicio.wallets.empty')}
              </button>
            )}
            <MonthBars months={data.months} language={language} />
          </div>
        </section>

        {/* Ingresos / Gastos / Ahorro, 4 (stacked on wide pages) */}
        <div className="col-span-full grid grid-cols-2 gap-3 @min-[640px]:grid-cols-3 @min-[640px]:gap-4 @min-[1024px]:col-span-4 @min-[1024px]:grid-cols-1">
          <StatTile label={t('inicio.stat.income')} a11yLabel={t('inicio.monthIncome')} value={thisMonth?.income ?? null} previous={lastMonth?.income} previousMonth={lastMonth?.month} kind="income" hidden={hidden} />
          <StatTile label={t('inicio.stat.expenses')} a11yLabel={t('inicio.monthExpenses')} value={thisMonth?.expenses ?? null} previous={lastMonth?.expenses} previousMonth={lastMonth?.month} kind="expense" hidden={hidden} />
          <StatTile
            label={t('inicio.stat.savings')}
            a11yLabel={t('inicio.stat.monthSavings')}
            value={thisMonth ? thisMonth.income - thisMonth.expenses : null}
            previous={lastMonth ? lastMonth.income - lastMonth.expenses : undefined}
            previousMonth={lastMonth?.month}
            kind="net"
            hidden={hidden}
            className="col-span-2 @min-[640px]:col-span-1"
          />
        </div>

        {/* Alertas, 4 */}
        <Card className="col-span-full @min-[1024px]:col-span-4">
          <CardHead
            title={t('inicio.alerts.title')}
            subtitle={data.alerts === null ? undefined : visibleAlerts.length === 0 ? undefined : visibleAlerts.length === 1 ? t('inicio.alerts.oneOpen') : fill(t('inicio.alerts.manyOpen'), visibleAlerts.length)}
          />
          <div className="mt-3 flex flex-col gap-2.5">
            {data.alerts === null ? (
              <RowSkeletons count={2} box={40} />
            ) : visibleAlerts.length === 0 ? (
              <div className="py-2 text-body-sm text-ink-tertiary">
                {t('inicio.alerts.none')}{' '}
                {dismissed.length > 0 && (
                  <button type="button" onClick={() => setAndSaveDismissed([])} className="min-h-6 cursor-pointer font-semibold text-link">
                    {t('inicio.alerts.restore')}
                  </button>
                )}
              </div>
            ) : (
              <>
                {shownAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    today={today}
                    hidden={hidden}
                    wallets={data.wallets ?? []}
                    onOpen={() => openAlert(alert)}
                    onConfirm={alert.kind === 'goal_plan_due' ? () => void resolvePlan(alert, true) : undefined}
                    onSkip={alert.kind === 'goal_plan_due' ? () => void resolvePlan(alert, false) : undefined}
                    onDismiss={() => setAndSaveDismissed([...dismissed, alert.id])}
                  />
                ))}
                {visibleAlerts.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setAllAlerts((v) => !v)}
                    aria-expanded={allAlerts}
                    className="min-h-8 cursor-pointer self-start rounded-[8px] px-2 text-label font-semibold text-link hover:bg-v2-subtle"
                  >
                    {allAlerts ? t('inicio.alerts.showLess') : fill(t('inicio.alerts.showAll'), visibleAlerts.length)}
                  </button>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Presupuestos, 4 */}
        <Card className="@min-[1024px]:col-span-4">
          <CardHead title={t('inicio.budgets.title')} subtitle={budgetsSubtitle(today, language, t)} link={t('inicio.seeInPlanes')} onLink={() => navigate('/planes?tab=presupuestos')} />
          <div className="mt-2 flex flex-col">
            {appLoading && topBudgets.length === 0 ? (
              <RowSkeletons count={3} />
            ) : topBudgets.length === 0 ? (
              <div className="py-3 text-body-sm text-ink-tertiary">{t('inicio.budgets.empty')}</div>
            ) : (
              topBudgets.map((b, i, arr) => {
                const tone = budgetTone(b.percentage)
                const color = TONE_VAR[tone]
                const state = b.percentage > 100 ? t('inicio.budgets.stateOver') : tone === 'pos' ? t('inicio.budgets.stateOk') : t('inicio.budgets.stateNear')
                const name = budgetScope(b, walletName)
                return (
                  <RowButton key={b.id} last={i === arr.length - 1} gap={12} onClick={() => navigate('/planes?tab=presupuestos')}>
                    <CategoryMark category={b.category!} box={40} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-left">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-title-sm font-semibold" title={name}>{name}</span>
                        <span className="flex flex-none items-center gap-1 text-label font-semibold tabular-nums" style={{ color }}>
                          {percentText(b.percentage, language)}
                          <StrokeIcon paths={TONE_ICON[tone]} size={16} />
                          <span className="sr-only">{state}</span>
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={name}
                        aria-valuenow={b.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuetext={`${percentText(b.percentage, language)}, ${state}`}
                        className="h-2 overflow-hidden rounded-full bg-surface-sunken"
                      >
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, b.percentage)}%`, background: color }} />
                      </div>
                      <Money hidden={hidden} className="block truncate whitespace-nowrap text-body-sm text-ink-tertiary">
                        {fill(t('inicio.budgets.of'), format(b.spent), format(b.limit))}
                      </Money>
                    </div>
                  </RowButton>
                )
              })
            )}
          </div>
        </Card>

        {/* Metas, 4 */}
        <Card className="@min-[1024px]:col-span-4">
          <CardHead title={t('inicio.goals.title')} subtitle={t('inicio.goals.subtitle')} link={t('inicio.seeInPlanes')} onLink={() => navigate('/planes?tab=metas')} />
          <div className="mt-2 flex flex-col">
            {data.goals === null ? (
              <RowSkeletons count={2} />
            ) : data.goals.length === 0 ? (
              <div className="py-3 text-body-sm text-ink-tertiary">{t('inicio.goals.empty')}</div>
            ) : (
              data.goals.slice(0, 3).map((g, i, arr) => {
                const mark = goalMark(g.icon)
                const pct = Math.min(100, g.percentage)
                return (
                  <RowButton key={g.id} last={i === arr.length - 1} gap={12} onClick={() => navigate('/planes?tab=metas')}>
                    <div
                      aria-hidden="true"
                      className="flex h-12 w-12 flex-none items-center justify-center rounded-full"
                      style={{ background: `conic-gradient(${categoryColor('exp.other')} ${pct}%, var(--color-surface-sunken) 0)` }}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                        <Glyph paths={mark.glyph} size={18} color={mark.color} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-title-sm font-semibold" title={g.name}>{g.name}</span>
                        <span className="flex-none text-label font-semibold tabular-nums text-ink-secondary">{percentText(g.percentage, language)}</span>
                      </div>
                      <Money hidden={hidden} className="block truncate text-body-sm text-ink-secondary">
                        {fill(t('inicio.goals.progress'), format(g.currentAmount), format(g.targetAmount))}
                      </Money>
                      <div className="truncate text-caption text-ink-tertiary">
                        {g.plan ? planText(g.plan, walletName(g.plan.accountId), format) : g.targetDate ? fill(t('goal.targetOn'), shortDayMonth(g.targetDate)) : t('goal.noTarget')}
                      </div>
                    </div>
                  </RowButton>
                )
              })
            )}
          </div>
        </Card>

        {/* Movimientos recientes, 8 */}
        <Card className="col-span-full @min-[1024px]:col-span-8">
          <CardHead title={t('inicio.recent.title')} link={t('inicio.seeInMovimientos')} onLink={() => navigate('/movimientos')} />
          {appLoading && recent.length === 0 ? (
            <div className="mt-2">
              <RowSkeletons count={5} box={40} />
            </div>
          ) : recent.length === 0 ? (
            <div className="py-3 text-body-sm text-ink-tertiary">{t('inicio.recent.empty')}</div>
          ) : (
            <RecentTable
              rows={recent}
              wallets={data.wallets ?? []}
              principal={principal}
              hidden={hidden}
              today={today}
              onOpen={(id) => navigate(`/movimientos?tx=${id}`)}
            />
          )}
        </Card>

        {/* Próximos 14 días, 4 */}
        <Card className="col-span-full @min-[1024px]:col-span-4">
          <CardHead title={t('inicio.upcoming.title')} subtitle={t('inicio.upcoming.subtitle')} link={t('inicio.seeInMovimientos')} onLink={() => navigate('/movimientos')} />
          <div className="mt-2 flex flex-col">
            {upcoming === null ? (
              <RowSkeletons count={3} />
            ) : upcoming.length === 0 ? (
              <div className="py-3 text-body-sm text-ink-tertiary">{t('inicio.upcoming.empty')}</div>
            ) : (
              upcoming.map((ev, i, arr) => {
                const [, m, d] = ev.date.split('-').map(Number)
                const wallet = data.wallets?.find((w) => w.id === ev.series.accountId)
                return (
                  <RowButton key={ev.series.id} last={i === arr.length - 1} gap={12} onClick={() => setOpenSeriesId(ev.series.id)}>
                    <div className="w-10 flex-none text-center">
                      <div className={cn('text-overline uppercase', ev.dueToday ? 'text-warning' : 'text-ink-tertiary')}>
                        {ev.dueToday ? t('inicio.upcoming.today') : MONTHS_SHORT[language][m - 1]}
                      </div>
                      <div className="text-title-sm font-semibold tabular-nums">{String(d).padStart(2, '0')}</div>
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate text-title-sm font-semibold" title={ev.series.name}>{ev.series.name}</div>
                      <div className="truncate text-body-sm text-ink-tertiary">
                        {ev.dueToday ? t('inicio.upcoming.dueToday') : `${categoryLabel(ev.series.category)} · ${shortWallet(wallet?.name ?? '')}`}
                      </div>
                    </div>
                    <div className="flex-none text-right">
                      <Money hidden={hidden} className={cn('block whitespace-nowrap text-amount font-semibold', ev.signed < 0 ? 'text-negative' : 'text-positive')}>
                        {`${ev.signed < 0 ? '−' : '+'}${formatIn(Math.abs(ev.signed), ev.series.currency)}`}
                      </Money>
                      {ev.series.currency !== principal && (
                        <Money hidden={hidden} className="block whitespace-nowrap text-caption text-ink-tertiary">
                          {`≈ ${formatApprox(Math.abs(ev.signed) * referenceRate(ev.series.currency, principal), principal)}`}
                        </Money>
                      )}
                      <Money hidden={hidden} className="block whitespace-nowrap text-caption text-ink-tertiary">
                        {fill(t('inicio.upcoming.balance'), format(ev.running))}
                      </Money>
                    </div>
                  </RowButton>
                )
              })
            )}
          </div>
        </Card>
      </div>

      {openSeries && (
        <EventDialog
          series={openSeries}
          walletName={data.wallets?.find((w) => w.id === openSeries.accountId)?.name ?? ''}
          today={today}
          hidden={hidden}
          onClose={() => setOpenSeriesId(null)}
          onChanged={() => {
            setOpenSeriesId(null)
            void refresh()
            void refreshAppData()
          }}
        />
      )}
    </div>
  )
}

function budgetsSubtitle(today: string, language: 'es' | 'en', t: (k: TranslationKey) => string): string {
  const left = daysLeftInMonth(today)
  const month = MONTHS_LONG[language][Number(today.slice(5, 7)) - 1]
  if (left === 0) return fill(t('inicio.budgets.subtitleLast'), month)
  if (left === 1) return fill(t('inicio.budgets.subtitleOne'), month)
  return fill(t('inicio.budgets.subtitle'), left, month)
}

// ── Pieces ──────────────────────────────────────────────────────────────

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('min-w-0 rounded-[16px] border border-border bg-surface p-5 text-ink', className)}>{children}</section>
}

// Card title row: `title` + an optional trailing link. On a narrow card the
// link drops under the title instead of cutting it.
function CardHead({ title, subtitle, link, onLink }: { title: string; subtitle?: string; link?: string; onLink?: () => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
      <div className="min-w-0 flex-[1_1_11rem]">
        <h2 className="truncate text-title font-semibold" title={title}>{title}</h2>
        {subtitle && <div className="mt-0.5 line-clamp-2 text-body-sm text-ink-tertiary">{subtitle}</div>}
      </div>
      {link && (
        // Padded to a 32px-tall pointer target without moving the text.
        <button type="button" onClick={onLink} className="-mx-2 mt-0.5 min-h-8 flex-none cursor-pointer whitespace-nowrap rounded-[8px] px-2 text-label font-semibold text-link hover:bg-v2-subtle">
          {link}
        </button>
      )}
    </div>
  )
}

// StatTile (DESIGN-SYSTEM.md §6.7): overline label, the month's figure with
// its sign in `title`, and the change against last month with an arrow.
// Whether the change is good or bad decides its color, not its sign.
function StatTile({
  label,
  a11yLabel,
  value,
  previous,
  previousMonth,
  kind,
  hidden,
  className,
}: {
  label: string
  a11yLabel: string
  value: number | null
  previous?: number
  previousMonth?: string
  kind: 'income' | 'expense' | 'net'
  hidden: boolean
  className?: string
}) {
  const { t, language } = useTranslation()
  const { format } = useCurrency()
  const positive = kind === 'income' || (kind === 'net' && (value ?? 0) >= 0)
  const figure = value === null ? null : `${positive ? '+' : '−'}${format(Math.abs(value))}`
  const change = value !== null && previous !== undefined && previous !== 0 ? Math.round(((value - previous) / Math.abs(previous)) * 100) : null
  const favorable = change !== null && (kind === 'expense' ? change < 0 : change > 0)
  const prevIndex = previousMonth ? Number(previousMonth.split('-')[1]) - 1 : -1
  const changeText =
    change !== null && prevIndex >= 0
      ? `${change > 0 ? '↑ ' : change < 0 ? '↓ ' : ''}${percentText(Math.abs(change), language)} ${fill(t('inicio.stat.vs'), MONTHS_SHORT[language][prevIndex])}`
      : t('inicio.stat.thisMonth')
  const description = [
    a11yLabel,
    hidden ? t('inicio.amountHidden') : figure ?? '',
    change !== null && change !== 0 && prevIndex >= 0 ? fill(t(change > 0 ? 'inicio.stat.more' : 'inicio.stat.less'), Math.abs(change), MONTHS_LONG[language][prevIndex]) : '',
    change !== null && change !== 0 ? t(favorable ? 'inicio.stat.favorable' : 'inicio.stat.unfavorable') : '',
  ]
    .filter(Boolean)
    .join(', ')
  return (
    <div className={cn('min-w-0 rounded-[16px] border border-border bg-surface px-4 py-3.5 [container-type:inline-size]', className)}>
      <span className="sr-only">{description}</span>
      <div aria-hidden="true">
        <div className="truncate text-overline uppercase text-ink-secondary">{label}</div>
        {figure === null ? (
          <SkeletonBar className="mt-1.5 h-5 w-[70%]" />
        ) : (
          <Money
            hidden={hidden}
            className={cn('mt-1 block whitespace-nowrap text-[clamp(14px,11cqi,20px)] font-semibold leading-[1.3]', positive ? 'text-positive' : 'text-negative')}
          >
            {figure}
          </Money>
        )}
        <div
          className={cn(
            'mt-1 truncate text-caption tabular-nums',
            change === null || change === 0 ? 'text-ink-tertiary' : favorable ? 'text-positive' : 'text-negative',
          )}
        >
          {changeText}
        </div>
      </div>
    </div>
  )
}

// Six months of net savings (income − expenses), oldest first; the current
// month is the solid bar.
function MonthBars({ months, language }: { months: MonthTotals[] | null; language: 'es' | 'en' }) {
  if (!months) return <SkeletonBar className="mt-auto h-14 w-full pt-5" dark />
  const max = Math.max(1, ...months.map((m) => Math.abs(m.net)))
  return (
    <div aria-hidden="true" className="mt-auto pt-5">
      <div className="flex h-14 items-end gap-[5px]">
        {months.map((m, i) => {
          const last = i === months.length - 1
          return (
            <div
              key={m.month}
              className="flex-1 rounded-[3px]"
              style={{
                height: `${Math.max(4, Math.round((Math.abs(m.net) / max) * 83))}%`,
                background: last ? 'var(--hero-bar)' : 'var(--hero-bar-soft)',
              }}
            />
          )
        })}
      </div>
      <div className="mt-2 flex gap-[5px] text-caption text-[var(--hero-label)]">
        {months.map((m) => (
          <span key={m.month} className="flex-1 text-center">
            {monthAbbr(m.month, language)}
          </span>
        ))}
      </div>
    </div>
  )
}

// The alert's semantic tone, shown as the card's leading bar: overdue and
// over-budget are `negative`, pending payments `warning`, goal news
// `positive` (same rule as Android's alertTone).
function alertTone(alert: AppAlert): string {
  switch (alert.kind) {
    case 'series_due':
    case 'loan_open':
      return alert.overdue ? TONE_VAR.neg : TONE_VAR.warn
    case 'budget_at_risk':
      return alert.percentage > 100 ? TONE_VAR.neg : TONE_VAR.warn
    case 'goal_near':
    case 'goal_plan_auto':
      return TONE_VAR.pos
    default:
      return TONE_VAR.warn
  }
}

// Alert card (DESIGN-SYSTEM.md §6.10): a 4 px leading bar in the semantic
// tone, the icon tile, a one-line title, a two-line body and an explicit
// action, plus a dismiss button.
function AlertCard({
  alert,
  today,
  hidden,
  wallets,
  onOpen,
  onConfirm,
  onSkip,
  onDismiss,
}: {
  alert: AppAlert
  today: string
  hidden: boolean
  wallets: Wallet[]
  onOpen: () => void
  onConfirm?: () => void
  onSkip?: () => void
  onDismiss: () => void
}) {
  const { t, tCategory, language } = useTranslation()
  const { format } = useCurrency()
  const copy = alertCopy(alert, today, language, t, tCategory, wallets)
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    fn()
  }
  return (
    <div
      onClick={onOpen}
      className="relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-[12px] border border-border bg-surface py-3 pl-4 pr-1.5 hover:border-border-strong"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: alertTone(alert) }} />
      <GlyphMark paths={copy.glyph} color={copy.color} box={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-title-sm font-semibold" title={copy.title}>{copy.title}</div>
        <div className="mt-0.5 line-clamp-2 text-body-sm text-ink-tertiary">
          <MoneyText parts={copy.body} hidden={hidden} format={format} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {onConfirm && onSkip ? (
            <>
              <button type="button" onClick={stop(onConfirm)} className={TONAL}>
                {tr('inicio.plan.confirm')}
              </button>
              <button type="button" onClick={stop(onSkip)} className="h-8 cursor-pointer whitespace-nowrap rounded-[10px] px-2 text-label font-semibold text-link hover:bg-v2-subtle">
                {tr('event.skip')}
              </button>
            </>
          ) : (
            <button type="button" onClick={stop(onOpen)} className={TONAL}>
              {t('inicio.alerts.review')}
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        title={t('inicio.alerts.dismiss')}
        aria-label={t('inicio.alerts.dismiss')}
        onClick={stop(onDismiss)}
        className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-[8px] text-ink-tertiary hover:bg-v2-subtle hover:text-ink"
      >
        <StrokeIcon paths={ICON_PATHS.close} size={16} />
      </button>
    </div>
  )
}

// Tonal button (DESIGN-SYSTEM.md §6.3): primary-soft fill, 40 px on Web.
const TONAL = 'h-10 cursor-pointer whitespace-nowrap rounded-[12px] bg-accent-soft px-4 text-label font-semibold text-on-primary-soft hover:brightness-95'

// Movimientos recientes as a table: the movement (icon, title, meta), its
// wallet and date on wide tiles, and the right-aligned amount. The title is
// a button, so each row is reachable by keyboard; the whole row is
// clickable with the pointer.
function RecentTable({
  rows,
  wallets,
  principal,
  hidden,
  today,
  onOpen,
}: {
  rows: Transaction[]
  wallets: Wallet[]
  principal: string
  hidden: boolean
  today: string
  onOpen: (id: string) => void
}) {
  const { t, language } = useTranslation()
  const dateLabel = (iso: string) => (iso === today ? tr('event.today') : shortDate(iso, language))
  return (
    <table className="mt-2 w-full table-fixed border-collapse text-left">
      <thead>
        <tr className="text-overline uppercase text-ink-tertiary">
          <th scope="col" className="w-full pb-2 font-semibold">{t('inicio.recent.colTx')}</th>
          <th scope="col" className="hidden w-[140px] pb-2 pl-4 font-semibold @min-[560px]:table-cell">{t('inicio.recent.colWallet')}</th>
          <th scope="col" className="hidden w-[88px] pb-2 pl-4 font-semibold @min-[560px]:table-cell">{t('inicio.recent.colDate')}</th>
          <th scope="col" className="w-[132px] pb-2 pl-4 text-right font-semibold">{t('inicio.recent.colAmount')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((x) => {
          const transfer = x.type === 'transfer'
          const label = categoryLabel(transfer ? TRANSFER : x.category)
          const wallet = shortWallet(wallets.find((w) => w.id === x.accountId)?.name ?? '')
          const sign = transfer ? '' : x.type === 'income' ? '+' : '−'
          const meta = [label, x.merchant || x.counterpartyName].filter(Boolean).join(' · ')
          return (
            <tr key={x.id} onClick={() => onOpen(x.id)} className="cursor-pointer border-t border-divider hover:bg-v2-subtle">
              <td className="py-2.5 pr-2">
                <div className="flex min-w-0 items-center gap-3">
                  <CategoryMark category={transfer ? TRANSFER : x.category} box={40} />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpen(x.id)
                      }}
                      className="block max-w-full cursor-pointer truncate text-left text-title-sm font-semibold"
                      title={x.description || label}
                    >
                      {x.description || label}
                    </button>
                    <div className="truncate text-body-sm text-ink-tertiary">
                      {meta}
                      <span className="@min-[560px]:hidden">{` · ${dateLabel(x.date)} · ${wallet}`}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td className="hidden max-w-[160px] truncate py-2.5 pl-4 text-body-sm text-ink-secondary @min-[560px]:table-cell">{wallet}</td>
              <td className="hidden whitespace-nowrap py-2.5 pl-4 text-body-sm tabular-nums text-ink-secondary @min-[560px]:table-cell">{dateLabel(x.date)}</td>
              <td className="whitespace-nowrap py-2.5 pl-4 text-right">
                <Money hidden={hidden} className={cn('block text-amount font-semibold', transfer ? 'text-ink' : x.type === 'income' ? 'text-positive' : 'text-negative')}>
                  {`${sign}${formatMoney(x.amount, x.currency)}`}
                </Money>
                {x.currency !== principal && (
                  <Money hidden={hidden} className="block text-caption text-ink-tertiary">
                    {`≈ ${formatApprox(x.amount * referenceRate(x.currency, principal), principal)}`}
                  </Money>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// Inicio shows the three riskiest monthly category budgets.
function homeBudgets(budgets: ReturnType<typeof useAppData>['budgets']) {
  return sortByRisk(budgets.filter((b) => b.kind === 'category' && b.period === 'monthly')).slice(0, 3)
}
