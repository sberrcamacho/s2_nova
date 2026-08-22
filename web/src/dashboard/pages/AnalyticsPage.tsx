import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Flame,
  Landmark,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { ChartCard } from '@/components/ui/ChartCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Tabs } from '@/components/ui/Tabs'
import { Sparkles } from 'lucide-react'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { NovaAreaChart } from '@/components/charts/NovaAreaChart'
import { NovaDonutChart } from '@/components/charts/NovaDonutChart'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { useAppData } from '@/state/AppDataContext'
import { useDashboardFilters } from '@/dashboard/DashboardFiltersContext'
import { analyticsService } from '@/services/analyticsService'
import { accountService } from '@/services/accountService'
import { recurringService } from '@/services/recurringService'
import { categoryMap } from '@/data/categories'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { currentMonthKey, formatShortDate, isSameMonth, weekdayLabel } from '@/lib/date'
import { recurringIntervalTranslationKey, walletTypeTranslationKey } from '@/lib/i18n/translations'
import type { CategoryId, MonthlySummary, RecurringSeries, Wallet as WalletType } from '@/types'

const INTERVALS_PER_MONTH: Record<RecurringSeries['interval'], number> = {
  weekly: 52 / 12,
  monthly: 1,
  yearly: 1 / 12,
}

type AnalyticsTab = 'spending' | 'income' | 'cashFlow' | 'netWorth'

// The single consolidated Analytics surface — absorbs the old
// AnalyticsPage/ExpensesPage/IncomePage/NetWorthPage/RecurringPage(totals)
// into one page with tabs, per the IA consolidation: Analytics is one nav
// item, not five.
export default function AnalyticsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<AnalyticsTab>('spending')

  return (
    <div className="flex flex-col gap-5">
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

      {tab === 'spending' && <SpendingTab />}
      {tab === 'income' && <IncomeTab />}
      {tab === 'cashFlow' && <CashFlowTab />}
      {tab === 'netWorth' && <NetWorthTab />}
    </div>
  )
}

function SpendingTab() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, tCategory, language } = useTranslation()
  const { monthKeys } = useDashboardFilters()
  const [history, setHistory] = useState<MonthlySummary[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(6, language).then(setHistory)
  }, [transactions, language])

  const periodExpenses = useMemo(
    () => transactions.filter((tx) => tx.type === 'expense' && monthKeys.some((mk) => isSameMonth(tx.date, mk))),
    [transactions, monthKeys],
  )

  const total = periodExpenses.reduce((s, tx) => s + tx.amount, 0)
  const avgPerTxn = periodExpenses.length ? total / periodExpenses.length : 0

  const breakdown = useMemo(() => {
    const totals = new Map<CategoryId, number>()
    for (const tx of periodExpenses) totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount)
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }, [periodExpenses, total])

  const topCategory = breakdown[0]
  const expensesLabel = t('nav.expenses')
  const donutData = breakdown.map((e) => ({
    name: tCategory(e.category),
    value: e.amount,
    color: categoryMap[e.category]?.color ?? '#9C9CAA',
  }))

  const insights = useMemo(() => {
    const monthKey = currentMonthKey()
    const monthExpenses = transactions.filter((tx) => tx.type === 'expense' && isSameMonth(tx.date, monthKey))
    const byDay = new Array(7).fill(0) as number[]
    for (const tx of monthExpenses) {
      const day = new Date(`${tx.date}T00:00:00`).getDay()
      byDay[day]! += tx.amount
    }
    const weekendAvg = (byDay[0]! + byDay[6]!) / 2
    const weekdayAvg = byDay.slice(1, 6).reduce((s, v) => s + v, 0) / 5
    const peakIndex = byDay.indexOf(Math.max(...byDay))
    return { weekdayAvg, weekendAvg, peakDay: peakIndex >= 0 ? weekdayLabel(peakIndex, language) : '—' }
  }, [transactions, language])

  const burnRate = history.length ? history[history.length - 1]!.expenses / 30 : 0

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label={t('expenses.totalSpent')} value={format(total)} icon={<TrendingDown className="h-4 w-4" />} tone="primary" />
        <KPICard label={t('expenses.avgPerTransaction')} value={format(avgPerTxn)} icon={<Receipt className="h-4 w-4" />} />
        <KPICard label={t('analytics.burnRate')} value={`${format(burnRate)}${t('analytics.perDaySuffix')}`} icon={<Flame className="h-4 w-4" />} />
        <KPICard label={t('expenses.topCategory')} value={topCategory ? tCategory(topCategory.category) : '—'} icon={<Wallet className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard title={t('expenses.monthlyExpenses')} subtitle={t('common.last6Months')} className="xl:col-span-2">
          <NovaBarChart
            data={history.map((m) => ({ month: m.label, [expensesLabel]: m.expenses }))}
            xKey="month"
            series={[{ key: expensesLabel, label: expensesLabel, color: 'var(--color-negative)' }]}
          />
        </ChartCard>
        <ChartCard title={t('expenses.distributionByCategory')} subtitle={t('common.periodSelected')}>
          {donutData.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('common.noExpensesTitle')} description={t('common.noExpensesDescription')} />
          ) : (
            <div className="flex justify-center">
              <NovaDonutChart data={donutData} height={220} centerLabel="Total" centerValue={format(total)} />
            </div>
          )}
        </ChartCard>
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 text-[15px] font-bold text-ink">{t('categories.breakdown')}</h3>
        {breakdown.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('common.noDataTitle')} description={t('expenses.noDataDescription')} />
        ) : (
          <div className="flex flex-col gap-3.5">
            {breakdown.map((e) => (
              <div key={e.category}>
                <div className="mb-1.5 flex items-center gap-2.5">
                  <CategoryIcon category={e.category} size="sm" />
                  <span className="flex-1 truncate text-[13px] font-semibold text-ink">{tCategory(e.category)}</span>
                  <span className="font-numeric text-xs font-bold text-ink-secondary">
                    {format(e.amount)} · {e.percentage}%
                  </span>
                </div>
                <ProgressBar value={e.percentage} tone="negative" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 text-[15px] font-bold text-ink">{t('analytics.spendingHabits')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InsightTile label={t('analytics.weekdayAvg')} value={format(insights.weekdayAvg)} />
          <InsightTile label={t('analytics.weekendAvg')} value={format(insights.weekendAvg)} />
          <InsightTile label={t('analytics.peakSpendingDay')} value={insights.peakDay} />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 text-[15px] font-bold text-ink">{t('expenses.periodExpenses')}</h3>
        <div className="flex flex-col divide-y divide-border">
          {periodExpenses.slice(0, 12).map((tx) => (
            <TransactionRow key={tx.id} transaction={tx} />
          ))}
        </div>
        {periodExpenses.length === 0 && (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('expenses.emptyRegisteredTitle')} description={t('expenses.noDataDescription')} />
        )}
      </Card>
    </div>
  )
}

function IncomeTab() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, tCategory, language } = useTranslation()
  const { monthKeys } = useDashboardFilters()
  const [history, setHistory] = useState<MonthlySummary[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(6, language).then(setHistory)
  }, [transactions, language])

  const periodIncome = useMemo(
    () => transactions.filter((tx) => tx.type === 'income' && monthKeys.some((mk) => isSameMonth(tx.date, mk))),
    [transactions, monthKeys],
  )

  const total = periodIncome.reduce((s, tx) => s + tx.amount, 0)
  const avgPerTxn = periodIncome.length ? total / periodIncome.length : 0

  const breakdown = useMemo(() => {
    const totals = new Map<CategoryId, number>()
    for (const tx of periodIncome) totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.amount)
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }, [periodIncome, total])

  const topSource = breakdown[0]
  const incomeLabel = t('nav.income')
  const savingsLabel = t('overview.savings')
  const donutData = breakdown.map((e) => ({
    name: tCategory(e.category),
    value: e.amount,
    color: categoryMap[e.category]?.color ?? '#9C9CAA',
  }))

  const trendPct = useMemo(() => {
    if (history.length < 2) return null
    const prev = history[history.length - 2]!.income
    const curr = history[history.length - 1]!.income
    if (prev <= 0) return null
    return Math.round(((curr - prev) / prev) * 100)
  }, [history])

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label={t('income.totalIncome')} value={format(total)} icon={<ArrowDownLeft className="h-4 w-4" />} tone="primary" />
        <KPICard label={t('income.avgPerIncome')} value={format(avgPerTxn)} icon={<Receipt className="h-4 w-4" />} />
        <KPICard label={t('nav.transactions')} value={String(periodIncome.length)} icon={<Receipt className="h-4 w-4" />} />
        <KPICard label={t('income.topSource')} value={topSource ? tCategory(topSource.category) : '—'} icon={<Wallet className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard
          title={t('income.monthlyIncome')}
          subtitle={t('common.last6Months')}
          className="xl:col-span-2"
          action={
            trendPct !== null && (
              <Badge tone={trendPct >= 0 ? 'positive' : 'negative'} icon={<ArrowUpRight className="h-3 w-3" />}>
                {trendPct >= 0 ? t('income.growing') : t('income.declining')}
              </Badge>
            )
          }
        >
          <NovaAreaChart
            data={history.map((m) => ({ month: m.label, [incomeLabel]: m.income }))}
            xKey="month"
            series={[{ key: incomeLabel, label: incomeLabel, color: 'var(--color-positive)' }]}
          />
        </ChartCard>
        <ChartCard title={t('income.incomeSources')} subtitle={t('common.periodSelected')}>
          {donutData.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('income.noIncomeTitle')} description={t('income.noIncomeDescription')} />
          ) : (
            <div className="flex justify-center">
              <NovaDonutChart data={donutData} height={220} centerLabel="Total" centerValue={format(total)} />
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title={t('income.incomeVsSavings')} subtitle={t('overview.monthlyComparison')}>
          <NovaBarChart
            data={history.map((m) => ({ month: m.label, [incomeLabel]: m.income, [savingsLabel]: m.savings }))}
            xKey="month"
            series={[
              { key: incomeLabel, label: incomeLabel, color: 'var(--color-positive)' },
              { key: savingsLabel, label: savingsLabel, color: 'var(--color-primary)' },
            ]}
          />
        </ChartCard>

        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 text-[15px] font-bold text-ink">{t('income.incomeSources')}</h3>
          {breakdown.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('common.noDataTitle')} description={t('income.noDataDescription')} />
          ) : (
            <div className="flex flex-col gap-3.5">
              {breakdown.map((e) => (
                <div key={e.category}>
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-ink">{tCategory(e.category)}</span>
                    <span className="font-numeric font-bold text-ink-secondary">{e.percentage}%</span>
                  </div>
                  <ProgressBar value={e.percentage} tone="positive" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 text-[15px] font-bold text-ink">{t('income.periodIncome')}</h3>
        <div className="flex flex-col divide-y divide-border">
          {periodIncome.slice(0, 12).map((tx) => (
            <TransactionRow key={tx.id} transaction={tx} />
          ))}
        </div>
        {periodIncome.length === 0 && (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('income.emptyRegisteredTitle')} description={t('income.noDataDescription')} />
        )}
      </Card>
    </div>
  )
}

function CashFlowTab() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, tCategory, language } = useTranslation()
  const [history, setHistory] = useState<MonthlySummary[]>([])
  const [savingsTrend, setSavingsTrend] = useState<{ label: string; balance: number }[]>([])
  const [series, setSeries] = useState<RecurringSeries[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    analyticsService.getMonthlyHistory(6, language).then(setHistory)
    analyticsService.getSavingsTrend(6, language).then(setSavingsTrend)
  }, [transactions, language])

  useEffect(() => {
    setIsLoading(true)
    recurringService
      .getRecurringSeries()
      .then(setSeries)
      .finally(() => setIsLoading(false))
  }, [])

  const currentMonth = history[history.length - 1]
  const incomeLabel = t('nav.income')
  const expensesLabel = t('nav.expenses')

  const active = series.filter((s) => s.active)
  const monthlyRecurringExpenses = active.filter((s) => s.type === 'expense').reduce((sum, s) => sum + s.amount * INTERVALS_PER_MONTH[s.interval], 0)
  const monthlyRecurringIncome = active.filter((s) => s.type === 'income').reduce((sum, s) => sum + s.amount * INTERVALS_PER_MONTH[s.interval], 0)
  const subscriptionsTotal = active
    .filter((s) => s.type === 'expense' && s.category === 'subscriptions')
    .reduce((sum, s) => sum + s.amount * INTERVALS_PER_MONTH[s.interval], 0)

  const upcoming = useMemo(() => [...active].sort((a, b) => (a.nextOccurrenceDate < b.nextOccurrenceDate ? -1 : 1)), [active])

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          label={t('analytics.cashFlow.netThisMonth')}
          value={format(currentMonth?.savings ?? 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="primary"
        />
        <KPICard label={t('recurring.monthlyIncome')} value={format(monthlyRecurringIncome)} icon={<ArrowDownLeft className="h-4 w-4" />} />
        <KPICard label={t('recurring.monthlyExpenses')} value={format(monthlyRecurringExpenses)} icon={<ArrowUpRight className="h-4 w-4" />} />
        <KPICard label={t('recurring.subscriptions')} value={format(subscriptionsTotal)} icon={<CreditCard className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title={t('overview.incomeVsExpenses')} subtitle={t('overview.monthlyComparison')}>
          <NovaBarChart
            data={history.map((m) => ({ month: m.label, [incomeLabel]: m.income, [expensesLabel]: m.expenses }))}
            xKey="month"
            series={[
              { key: incomeLabel, label: incomeLabel, color: 'var(--color-positive)' },
              { key: expensesLabel, label: expensesLabel, color: 'var(--color-negative)' },
            ]}
          />
        </ChartCard>
        <ChartCard title={t('analytics.cashFlow.trend')} subtitle={t('analytics.cashFlow.trendSubtitle')}>
          <NovaAreaChart
            data={savingsTrend}
            xKey="label"
            series={[{ key: 'balance', label: t('common.cumulativeSavings'), color: 'var(--color-primary)' }]}
          />
        </ChartCard>
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="text-[15px] font-bold text-ink">{t('analytics.cashFlow.upcomingImpact')}</h3>
        <p className="mt-0.5 text-xs font-medium text-ink-tertiary">{t('analytics.cashFlow.upcomingImpactSubtitle')}</p>

        {!isLoading && upcoming.length === 0 && <p className="mt-4 text-sm text-ink-tertiary">{t('recurring.empty')}</p>}

        <div className="mt-4 flex flex-col divide-y divide-border">
          {upcoming.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <CategoryIcon category={item.category} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">{item.name}</p>
                <p className="text-xs text-ink-tertiary">
                  {tCategory(item.category)} · {t(recurringIntervalTranslationKey(item.interval))}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-numeric text-sm font-bold ${item.type === 'expense' ? 'text-negative' : 'text-positive'}`}>
                  {item.type === 'expense' ? '-' : '+'}
                  {format(item.amount)}
                </p>
                {item.isDue ? (
                  <Badge tone="warning">{t('recurring.dueToday')}</Badge>
                ) : (
                  <p className="text-xs text-ink-tertiary">{formatShortDate(item.nextOccurrenceDate, language)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
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
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard label={t('netWorth.total')} value={format(netWorth)} icon={<Landmark className="h-4 w-4" />} tone="primary" />
        <KPICard label={t('netWorth.lent')} value={format(outstandingLent)} icon={<ArrowUpRight className="h-4 w-4" />} />
        <KPICard label={t('netWorth.borrowed')} value={format(outstandingBorrowed)} icon={<ArrowDownLeft className="h-4 w-4" />} />
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-ink">
          <Wallet className="h-4 w-4 text-primary" /> {t('netWorth.wallets')}
        </h3>
        {!isLoading && wallets.length === 0 && <p className="text-sm text-ink-tertiary">{t('wallets.emptyTitle')}</p>}
        <div className="flex flex-col divide-y divide-border">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-[13.5px] font-semibold text-ink">{wallet.name}</p>
                <p className="text-xs text-ink-tertiary">{t(walletTypeTranslationKey(wallet.type))}</p>
              </div>
              <p className="font-numeric text-sm font-bold text-ink">{format(wallet.currentBalance)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function InsightTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-tertiary">{label}</p>
      <p className="mt-1.5 font-numeric text-lg font-extrabold text-ink">{value}</p>
    </div>
  )
}
