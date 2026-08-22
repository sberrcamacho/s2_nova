import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Calendar, Flag, HeartPulse, Landmark, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { ChartCard } from '@/components/ui/ChartCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { useAppData } from '@/state/AppDataContext'
import { useDashboardFilters } from '@/dashboard/DashboardFiltersContext'
import { analyticsService, type PeriodComparison, type PeriodComparisonEntry } from '@/services/analyticsService'
import { recurringService } from '@/services/recurringService'
import { goalService } from '@/services/goalService'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { formatShortDate, isSameMonth } from '@/lib/date'
import { Sparkles, Lightbulb } from 'lucide-react'
import { getInsights, getFinancialHealth, type Insight, type FinancialHealth } from '@/services/insightsService'
import { healthCategoryTranslationKey, healthStatusTranslationKey, type TranslationKey } from '@/lib/i18n/translations'
import type { Goal, MonthlySummary, RecurringSeries } from '@/types'

const CHANGE_LABEL_KEY: Record<PeriodComparisonEntry['key'], TranslationKey> = {
  income: 'nav.income',
  expenses: 'nav.expenses',
  savings: 'overview.savings',
}

// pct > 0 reads as "good" for income/savings but "bad" for expenses — this
// flips the badge tone accordingly instead of always treating "up" as
// positive.
function changeTone(key: PeriodComparisonEntry['key'], pct: number | null): 'positive' | 'negative' | 'neutral' {
  if (pct === null) return 'neutral'
  const goodWhenUp = key === 'income' || key === 'savings'
  return goodWhenUp === pct >= 0 ? 'positive' : 'negative'
}

export default function OverviewPage() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, language } = useTranslation()
  const { monthKeys } = useDashboardFilters()
  const navigate = useNavigate()

  const [history, setHistory] = useState<MonthlySummary[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [health, setHealth] = useState<FinancialHealth | null>(null)
  const [comparison, setComparison] = useState<PeriodComparison | null>(null)
  const [upcoming, setUpcoming] = useState<RecurringSeries[]>([])
  const [goals, setGoals] = useState<Goal[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(6, language).then(setHistory)
    analyticsService.getPeriodComparison(language).then(setComparison)
    getInsights(language, format).then(setInsights)
    getFinancialHealth(language, format).then(setHealth)
    recurringService.getRecurringSeries().then((series) =>
      setUpcoming([...series.filter((s) => s.active)].sort((a, b) => (a.nextOccurrenceDate < b.nextOccurrenceDate ? -1 : 1)).slice(0, 5)),
    )
    goalService.getGoals().then(setGoals)
  }, [transactions, language, format])

  const balance = useMemo(
    () => transactions.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0),
    [transactions],
  )

  const periodTransactions = useMemo(
    () => transactions.filter((tx) => monthKeys.some((mk) => isSameMonth(tx.date, mk))),
    [transactions, monthKeys],
  )

  const income = periodTransactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
  const expenses = periodTransactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0)
  const savings = income - expenses

  const incomeLabel = t('nav.income')
  const expensesLabel = t('nav.expenses')
  const rangeSeries = history.filter((h) => monthKeys.includes(h.month))
  const chartData = (rangeSeries.length >= 2 ? rangeSeries : history).map((m) => ({
    month: m.label,
    [incomeLabel]: m.income,
    [expensesLabel]: m.expenses,
  }))

  const recent = transactions.slice(0, 4)

  return (
    <div className="flex flex-col gap-5">
      {health && (
        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-ink">
            <HeartPulse className="h-4 w-4 text-primary" /> {t('overview.financialHealth')}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {health.categories.map((c) => (
              <div key={c.key} className="flex flex-col gap-1.5 rounded-[var(--radius-md)] bg-bg-secondary p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-ink-secondary">{t(healthCategoryTranslationKey(c.key))}</span>
                  <Badge tone={c.tone}>{t(healthStatusTranslationKey(c.status))}</Badge>
                </div>
                <p className="text-xs leading-snug text-ink-tertiary">{c.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label={t('overview.balance')} value={format(balance)} icon={<Landmark className="h-4 w-4" />} tone="primary" />
        <KPICard label={t('overview.totalIncome')} value={format(income)} icon={<TrendingUp className="h-4 w-4" />} />
        <KPICard label={t('overview.totalExpenses')} value={format(expenses)} icon={<TrendingDown className="h-4 w-4" />} />
        <KPICard label={t('overview.savings')} value={format(savings)} icon={<PiggyBank className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h3 className="text-[15px] font-bold text-ink">{t('overview.whatChanged')}</h3>
          <p className="mt-0.5 text-xs font-medium text-ink-tertiary">{t('overview.vsLastMonth')}</p>
          {comparison && (
            <div className="mt-4 flex flex-col gap-3">
              {comparison.overall.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-semibold text-ink">{t(CHANGE_LABEL_KEY[entry.key])}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-numeric text-sm font-bold text-ink">{format(entry.current)}</span>
                    <Badge tone={changeTone(entry.key, entry.pctChange)}>
                      {entry.pctChange === null ? t('overview.noPreviousData') : `${entry.pctChange >= 0 ? '+' : ''}${entry.pctChange}%`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {insights.length > 0 && (
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
                <Lightbulb className="h-4 w-4 text-primary" /> {t('overview.insightsTitle')}
              </h3>
              <button onClick={() => navigate('/insights')} className="flex items-center gap-0.5 text-xs font-bold text-primary">
                {t('insights.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {insights.slice(0, 3).map((insight) => (
                <div key={insight.id} className="rounded-[var(--radius-md)] bg-bg-secondary p-3.5">
                  <p className="text-[13px] font-bold text-ink">{insight.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-tertiary">{insight.description}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard title={t('overview.incomeVsExpenses')} subtitle={t('overview.monthlyComparison')} className="xl:col-span-2">
          <NovaBarChart
            data={chartData}
            xKey="month"
            series={[
              { key: incomeLabel, label: incomeLabel, color: 'var(--color-positive)' },
              { key: expensesLabel, label: expensesLabel, color: 'var(--color-negative)' },
            ]}
          />
        </ChartCard>

        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-ink">
            <Calendar className="h-4 w-4 text-primary" /> {t('overview.upcomingEvents')}
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-ink-tertiary">{t('overview.noUpcoming')}</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {upcoming.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <CategoryIcon category={item.category} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">{item.name}</p>
                    <p className="text-xs text-ink-tertiary">{formatShortDate(item.nextOccurrenceDate, language)}</p>
                  </div>
                  <p className={`font-numeric text-[13px] font-bold ${item.type === 'expense' ? 'text-negative' : 'text-positive'}`}>
                    {item.type === 'expense' ? '-' : '+'}
                    {format(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-ink">
            <Flag className="h-4 w-4 text-primary" /> {t('overview.goalsProgress')}
          </h3>
          {goals.length === 0 ? (
            <p className="text-sm text-ink-tertiary">{t('overview.noGoals')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {goals.map((goal) => {
                const percentage = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0
                return (
                  <div key={goal.id}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="truncate text-[13px] font-semibold text-ink">{goal.name}</span>
                      <span className="font-numeric text-xs font-bold text-ink-secondary">{percentage}%</span>
                    </div>
                    <ProgressBar value={percentage} tone="primary" />
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink">{t('overview.recentTransactions')}</h3>
            <button onClick={() => navigate('/transactions')} className="flex items-center gap-0.5 text-xs font-bold text-primary">
              {t('overview.viewAllTransactions')} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {recent.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} />
            ))}
          </div>
          {recent.length === 0 && (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('overview.emptyTransactionsTitle')} description={t('overview.emptyTransactionsDescription')} />
          )}
        </Card>
      </div>
    </div>
  )
}
