import { useEffect, useMemo, useState } from 'react'
import { Landmark, Wallet } from 'lucide-react'
import { ChartCard } from '@/components/ui/ChartCard'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Tabs } from '@/components/ui/Tabs'
import { Sparkles } from 'lucide-react'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { useAppData } from '@/state/AppDataContext'
import { useDashboardFilters } from '@/dashboard/DashboardFiltersContext'
import { analyticsService } from '@/services/analyticsService'
import { accountService } from '@/services/accountService'
import { recurringService } from '@/services/recurringService'
import { categoryMap } from '@/data/categories'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { currentMonthKey, isSameMonth, monthYearLabel, weekdayLabel } from '@/lib/date'
import { walletTypeTranslationKey } from '@/lib/i18n/translations'
import { cn } from '@/lib/cn'
import type { CategoryId, MonthlySummary, RecurringSeries, Wallet as WalletType } from '@/types'

const INTERVALS_PER_MONTH: Record<RecurringSeries['interval'], number> = {
  weekly: 52 / 12,
  monthly: 1,
  yearly: 1 / 12,
}

const FIXED_CATEGORIES: CategoryId[] = ['bills', 'subscriptions']

type AnalyticsTab = 'spending' | 'income' | 'cashFlow' | 'netWorth'
type AnalyticsRange = 3 | 6 | 12

// The single consolidated Analytics surface — absorbs the old
// AnalyticsPage/ExpensesPage/IncomePage/NetWorthPage/RecurringPage(totals)
// into one page with tabs, per the IA consolidation: Analytics is one nav
// item, not five.
export default function AnalyticsPage() {
  const { t, language } = useTranslation()
  const { currency } = useCurrency()
  const [tab, setTab] = useState<AnalyticsTab>('spending')
  const [range, setRange] = useState<AnalyticsRange>(6)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-ink-tertiary">
          {monthYearLabel(currentMonthKey(), language)} · {currency}
        </p>
        <div className="flex overflow-hidden rounded-[9px] border border-border">
          {([3, 6, 12] as AnalyticsRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3.5 py-[7px] text-[11.5px] font-extrabold transition-colors',
                range === r ? 'bg-primary text-on-primary' : 'bg-surface text-ink-tertiary hover:text-ink',
              )}
            >
              {r}M
            </button>
          ))}
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={(v) => setTab(v as AnalyticsTab)}
        options={[
          { value: 'spending', label: t('analytics.tab.spending') },
          { value: 'income', label: t('analytics.tab.income') },
          { value: 'cashFlow', label: t('analytics.tab.cashFlow') },
          { value: 'netWorth', label: t('analytics.tab.netWorth') },
        ]}
        className="self-start"
      />

      {tab === 'spending' && <SpendingTab range={range} />}
      {tab === 'income' && <IncomeTab range={range} />}
      {tab === 'cashFlow' && <CashFlowTab />}
      {tab === 'netWorth' && <NetWorthTab />}
    </div>
  )
}

function rangeSubtitle(range: AnalyticsRange, t: (k: import('@/lib/i18n/translations').TranslationKey) => string) {
  return `${t('analytics.rangeSubtitlePrefix')} ${range} ${t('analytics.rangeSubtitleSuffix')}`
}

function SpendingTab({ range }: { range: AnalyticsRange }) {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, tCategory, language } = useTranslation()
  const { monthKeys } = useDashboardFilters()
  const [history, setHistory] = useState<MonthlySummary[]>([])
  const [wallets, setWallets] = useState<WalletType[]>([])
  const [recurring, setRecurring] = useState<RecurringSeries[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(range, language).then(setHistory)
  }, [transactions, range, language])

  useEffect(() => {
    accountService.getWallets().then(setWallets)
    recurringService.getRecurringSeries().then(setRecurring)
  }, [])

  const periodExpenses = useMemo(
    () => transactions.filter((tx) => tx.type === 'expense' && monthKeys.some((mk) => isSameMonth(tx.date, mk))),
    [transactions, monthKeys],
  )
  const total = periodExpenses.reduce((s, tx) => s + tx.amount, 0)

  const breakdown = useMemo(() => {
    const totals = new Map<CategoryId, number>()
    for (const tx of periodExpenses) totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount)
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [periodExpenses, total])

  const expensesLabel = t('nav.expenses')

  const peakDay = useMemo(() => {
    const monthKey = currentMonthKey()
    const monthExpenses = transactions.filter((tx) => tx.type === 'expense' && isSameMonth(tx.date, monthKey))
    const byDay = new Array(7).fill(0) as number[]
    for (const tx of monthExpenses) byDay[new Date(`${tx.date}T00:00:00`).getDay()]! += tx.amount
    const peakIndex = byDay.indexOf(Math.max(...byDay))
    return peakIndex >= 0 && byDay[peakIndex]! > 0 ? weekdayLabel(peakIndex, language) : '—'
  }, [transactions, language])

  const burnRate = history.length ? history[history.length - 1]!.expenses / 30 : 0

  const fixedCategorySet = useMemo(() => {
    const set = new Set<CategoryId>(FIXED_CATEGORIES)
    for (const s of recurring) if (s.active && s.type === 'expense') set.add(s.category)
    return set
  }, [recurring])
  const fixedAmount = periodExpenses.filter((tx) => fixedCategorySet.has(tx.category)).reduce((s, tx) => s + tx.amount, 0)
  const fixedPct = total > 0 ? Math.round((fixedAmount / total) * 100) : 0
  const variablePct = total > 0 ? 100 - fixedPct : 0

  const walletsTotal = wallets.reduce((s, w) => s + w.currentBalance, 0)
  const avgMonthlyExpense = history.length ? history.reduce((s, m) => s + m.expenses, 0) / history.length : 0
  const runway = avgMonthlyExpense > 0 ? walletsTotal / avgMonthlyExpense : 0

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_1fr]">
        <ChartCard title={t('expenses.monthlyExpenses')} subtitle={rangeSubtitle(range, t)}>
          <NovaBarChart
            data={history.map((m) => ({ month: m.label, [expensesLabel]: m.expenses }))}
            xKey="month"
            series={[{ key: expensesLabel, label: expensesLabel, color: 'var(--color-negative)' }]}
          />
        </ChartCard>

        <Card className="p-5 sm:p-6">
          <h3 className="text-[15px] font-bold text-ink">{t('categories.breakdown')}</h3>
          {breakdown.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('common.noDataTitle')} description={t('expenses.noDataDescription')} />
          ) : (
            <div className="mt-4 flex flex-col gap-3.5">
              {breakdown.map((e) => (
                <div key={e.category}>
                  <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                    <span className="font-semibold text-ink">{tCategory(e.category)}</span>
                    <span className="font-numeric font-bold text-ink-secondary">
                      {format(e.amount)} · {e.percentage}%
                    </span>
                  </div>
                  <ProgressBar value={e.percentage} color={categoryMap[e.category]?.color} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={`${t('analytics.burnRate')}${t('analytics.perDaySuffix')}`.toUpperCase()} value={format(burnRate)} />
        <StatTile label={t('analytics.peakSpendingDay').toUpperCase()} value={peakDay} />
        <StatTile label={t('analytics.fixedVsVariable').toUpperCase()} value={`${fixedPct} / ${variablePct}`} />
        <StatTile label={t('analytics.monthsOfRunway').toUpperCase()} value={runway.toFixed(1)} />
      </div>
    </div>
  )
}

function IncomeTab({ range }: { range: AnalyticsRange }) {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, tCategory, language } = useTranslation()
  const { monthKeys } = useDashboardFilters()
  const [history, setHistory] = useState<MonthlySummary[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(range, language).then(setHistory)
  }, [transactions, range, language])

  const periodIncome = useMemo(
    () => transactions.filter((tx) => tx.type === 'income' && monthKeys.some((mk) => isSameMonth(tx.date, mk))),
    [transactions, monthKeys],
  )
  const total = periodIncome.reduce((s, tx) => s + tx.amount, 0)

  const breakdown = useMemo(() => {
    const totals = new Map<CategoryId, number>()
    for (const tx of periodIncome) totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount)
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }, [periodIncome, total])

  const incomeLabel = t('nav.income')
  const hasFreelance = breakdown.some((e) => e.category === 'freelance')

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <h3 className="text-[15px] font-bold text-ink">{t('income.incomeSources')}</h3>
        {breakdown.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('common.noDataTitle')} description={t('income.noDataDescription')} />
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-3.5">
              {breakdown.map((e) => (
                <div key={e.category}>
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-ink">{tCategory(e.category)}</span>
                    <span className="font-numeric font-bold text-ink-secondary">
                      {format(e.amount)} · {e.percentage}%
                    </span>
                  </div>
                  <ProgressBar value={e.percentage} color={categoryMap[e.category]?.color} />
                </div>
              ))}
            </div>
            {hasFreelance && (
              <p className="mt-4 border-t border-[#16161f] pt-4 text-xs text-ink-tertiary">{t('analytics.freelanceNote')}</p>
            )}
          </>
        )}
      </Card>

      <ChartCard title={t('income.monthlyIncome')} subtitle={rangeSubtitle(range, t)}>
        <NovaBarChart
          data={history.map((m) => ({ month: m.label, [incomeLabel]: m.income }))}
          xKey="month"
          series={[{ key: incomeLabel, label: incomeLabel, color: 'var(--color-positive)' }]}
          colorForIndex={(i) => (i === history.length - 1 ? 'var(--color-positive)' : 'rgba(50,201,138,.28)')}
        />
      </ChartCard>
    </div>
  )
}

function CashFlowTab() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, language } = useTranslation()
  const [series, setSeries] = useState<RecurringSeries[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    recurringService
      .getRecurringSeries()
      .then(setSeries)
      .finally(() => setIsLoading(false))
  }, [])

  const active = series.filter((s) => s.active)
  const monthlyRecurringExpenses = active.filter((s) => s.type === 'expense').reduce((sum, s) => sum + s.amount * INTERVALS_PER_MONTH[s.interval], 0)
  const monthlyRecurringIncome = active.filter((s) => s.type === 'income').reduce((sum, s) => sum + s.amount * INTERVALS_PER_MONTH[s.interval], 0)
  const netCashFlow = monthlyRecurringIncome - monthlyRecurringExpenses

  const currentBalance = useMemo(
    () => transactions.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0), 0),
    [transactions],
  )

  const upcoming = useMemo(() => [...active].sort((a, b) => (a.nextOccurrenceDate < b.nextOccurrenceDate ? -1 : 1)), [active])
  const projected = useMemo(() => {
    let running = currentBalance
    return upcoming.map((item) => {
      running += item.type === 'income' ? item.amount : -item.amount
      return running
    })
  }, [upcoming, currentBalance])

  const nextPaydayIndex = upcoming.findIndex((s) => s.type === 'income')
  const horizon = nextPaydayIndex >= 0 ? projected.slice(0, nextPaydayIndex + 1) : projected
  const lowestProjected = horizon.length ? Math.min(...horizon) : currentBalance

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label={t('recurring.monthlyIncome').toUpperCase()} value={format(monthlyRecurringIncome)} tone="positive" />
        <StatTile label={t('recurring.monthlyExpenses').toUpperCase()} value={format(monthlyRecurringExpenses)} tone="negative" />
        <StatTile label={t('analytics.cashFlow.netThisMonth').toUpperCase()} value={format(netCashFlow)} tone="primary" />
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="text-[15px] font-bold text-ink">{t('analytics.cashFlow.upcomingImpact')}</h3>
        <p className="mt-0.5 text-xs font-medium text-ink-tertiary">{t('analytics.cashFlow.upcomingImpactSubtitle')}</p>

        {!isLoading && upcoming.length === 0 && <p className="mt-4 text-sm text-ink-tertiary">{t('recurring.empty')}</p>}

        <div className="mt-4 flex flex-col divide-y divide-border">
          {upcoming.map((item, i) => (
            <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <CategoryIcon category={item.category} size="sm" />
              <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-ink-tertiary">
                {new Date(`${item.nextOccurrenceDate}T00:00:00`).toLocaleDateString(language === 'en' ? 'en-US' : 'es-CO', { day: 'numeric', month: 'short' })}
              </span>
              <p className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{item.name}</p>
              <p className={cn('font-numeric w-[110px] shrink-0 text-right text-sm font-bold', item.type === 'expense' ? 'text-negative' : 'text-positive')}>
                {item.type === 'expense' ? '-' : '+'}
                {format(item.amount)}
              </p>
              <p className="font-numeric w-[120px] shrink-0 text-right text-sm font-semibold text-ink-secondary">{format(projected[i]!)}</p>
            </div>
          ))}
        </div>

        {upcoming.length > 0 && (
          <p className="mt-4 border-t border-[#16161f] pt-3 text-xs font-semibold text-warning">
            {t('analytics.cashFlow.lowestProjected')} {format(lowestProjected)}
          </p>
        )}
      </Card>
    </div>
  )
}

function NetWorthTab() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t } = useTranslation()
  const [wallets, setWallets] = useState<WalletType[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    accountService
      .getWallets()
      .then(setWallets)
      .finally(() => setIsLoading(false))
  }, [])

  const walletsTotal = wallets.reduce((sum, w) => sum + w.currentBalance, 0)
  const outstandingLent = transactions.filter((tx) => tx.loanKind === 'lent' && !tx.loanSettled).reduce((sum, tx) => sum + tx.amount, 0)
  const outstandingBorrowed = transactions.filter((tx) => tx.loanKind === 'borrowed' && !tx.loanSettled).reduce((sum, tx) => sum + tx.amount, 0)
  const netWorth = walletsTotal + outstandingLent - outstandingBorrowed

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          <Wallet className="h-4 w-4 text-primary" /> {t('netWorth.wallets')}
        </h3>
        {!isLoading && wallets.length === 0 && <p className="mt-4 text-sm text-ink-tertiary">{t('wallets.emptyTitle')}</p>}
        <div className="mt-3 flex flex-col divide-y divide-border">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="h-[30px] w-[30px] shrink-0 rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 16%, transparent)' }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-ink">{wallet.name}</p>
                <p className="text-[11px] text-ink-tertiary">{t(walletTypeTranslationKey(wallet.type))}</p>
              </div>
              <p className="font-numeric text-sm font-extrabold text-ink">{format(wallet.currentBalance)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-4">
          <span className="text-[13px] font-bold text-ink">{t('netWorth.total')}</span>
          <span className="font-numeric text-[22px] font-extrabold text-ink">{format(netWorth)}</span>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          <Landmark className="h-4 w-4 text-primary" /> {t('netWorth.lentAndBorrowed')}
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-[12px] bg-surface-elevated p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-tertiary">{t('netWorth.lentOut')}</p>
            <p className="font-numeric mt-1.5 text-lg font-extrabold text-positive">{format(outstandingLent)}</p>
          </div>
          <div className="rounded-[12px] bg-surface-elevated p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-tertiary">{t('netWorth.borrowedTile')}</p>
            {outstandingBorrowed > 0 ? (
              <p className="font-numeric mt-1.5 text-lg font-extrabold text-negative">{format(outstandingBorrowed)}</p>
            ) : (
              <p className="mt-1.5 text-[13px] font-semibold text-ink-tertiary">{t('health.debt.none')}</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

const TONE_VALUE_CLASS = { primary: 'text-ink', positive: 'text-positive', negative: 'text-negative' }

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'primary' | 'positive' | 'negative' }) {
  if (tone) {
    return (
      <Card className={cn('p-5', tone === 'primary' ? 'border-[#35305c] bg-gradient-to-br from-accent-soft/60 to-surface' : undefined)}>
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-tertiary">{label}</p>
        <p className={cn('font-numeric mt-2 text-2xl font-extrabold', TONE_VALUE_CLASS[tone])}>{value}</p>
      </Card>
    )
  }
  return (
    <div className="rounded-[var(--radius-md)] border border-border p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-tertiary">{label}</p>
      <p className="font-numeric mt-1.5 text-[22px] font-extrabold text-ink">{value}</p>
    </div>
  )
}
