import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Download, Flag, PiggyBank, Wallet } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { ChartCard } from '@/components/ui/ChartCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { NovaAreaChart } from '@/components/charts/NovaAreaChart'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { analyticsService } from '@/services/analyticsService'
import { goalService } from '@/services/goalService'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'
import type { TranslationKey } from '@/lib/i18n/translations'
import type { BudgetProgress } from '@/services/budgetService'
import type { CategoryBreakdownEntry, Goal, MonthlySummary } from '@/types'

const STATUS_TONE: Record<BudgetProgress['status'], 'positive' | 'warning' | 'negative'> = {
  on_track: 'positive',
  near_limit: 'warning',
  over_budget: 'negative',
}
const STATUS_KEY: Record<BudgetProgress['status'], TranslationKey> = {
  on_track: 'budgetStatus.on_track',
  near_limit: 'budgetStatus.near_limit',
  over_budget: 'budgetStatus.over_budget',
}

const RANGES = [
  { value: 3, label: '3M' },
  { value: 6, label: '6M' },
  { value: 12, label: '1A' },
] as const

export default function ReportsPage() {
  const { transactions, budgets } = useAppData()
  const { showToast } = useToast()
  const { format } = useCurrency()
  const { t, tCategory, language } = useTranslation()
  const [rangeMonths, setRangeMonths] = useState<number>(6)
  const [history, setHistory] = useState<MonthlySummary[]>([])
  const [savingsTrend, setSavingsTrend] = useState<{ label: string; balance: number }[]>([])
  const [weeklySpending, setWeeklySpending] = useState<{ label: string; amount: number }[]>([])
  const [topCategories, setTopCategories] = useState<CategoryBreakdownEntry[]>([])
  const [goals, setGoals] = useState<Goal[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(rangeMonths, language).then(setHistory)
    analyticsService.getSavingsTrend(rangeMonths, language).then(setSavingsTrend)
    analyticsService.getWeeklySpending(undefined, language).then(setWeeklySpending)
    analyticsService.getCategoryBreakdown().then((entries) => setTopCategories(entries.slice(0, 5)))
  }, [transactions, rangeMonths, language])

  useEffect(() => {
    goalService.getGoals().then(setGoals)
  }, [])

  const incomeLabel = t('nav.income')
  const expensesLabel = t('nav.expenses')
  const lastRangeSubtitle = `${t('common.last')} ${rangeMonths} ${t('common.months')}`

  const totalIncome = history.reduce((s, m) => s + m.income, 0)
  const totalExpenses = history.reduce((s, m) => s + m.expenses, 0)
  const netSavings = totalIncome - totalExpenses
  const avgMonthlySave = history.length ? netSavings / history.length : 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex overflow-hidden rounded-full border border-border">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRangeMonths(r.value)}
              className={cn(
                'px-4 py-1.5 text-xs font-bold transition-colors',
                rangeMonths === r.value ? 'bg-primary text-on-primary' : 'text-ink-secondary hover:text-ink',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={() => showToast(t('common.exportSimulated'), 'info')}
        >
          {t('reports.export')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label={t('overview.totalIncome')} value={format(totalIncome)} icon={<ArrowDownLeft className="h-4 w-4" />} />
        <KPICard label={t('overview.totalExpenses')} value={format(totalExpenses)} icon={<ArrowUpRight className="h-4 w-4" />} />
        <KPICard label={t('reports.netSavings')} value={format(netSavings)} icon={<PiggyBank className="h-4 w-4" />} tone="primary" />
        <KPICard label={t('reports.avgMonthlySavings')} value={format(avgMonthlySave)} icon={<Wallet className="h-4 w-4" />} />
      </div>

      <ChartCard title={t('reports.netSavingsTrend')} subtitle={lastRangeSubtitle}>
        <NovaAreaChart
          data={savingsTrend}
          xKey="label"
          series={[{ key: 'balance', label: t('common.cumulativeSavings'), color: 'var(--color-primary)' }]}
        />
      </ChartCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title={t('reports.weeklySpendingPattern')} subtitle={t('reports.currentMonth')}>
          <NovaBarChart
            data={weeklySpending.map((w) => ({ week: w.label, [expensesLabel]: w.amount }))}
            xKey="week"
            series={[{ key: expensesLabel, label: expensesLabel, color: 'var(--color-negative)' }]}
          />
        </ChartCard>
        <ChartCard title={t('overview.monthlyComparison')} subtitle={`${incomeLabel} vs. ${expensesLabel} — ${lastRangeSubtitle}`}>
          <NovaBarChart
            data={history.map((m) => ({ month: m.label, [incomeLabel]: m.income, [expensesLabel]: m.expenses }))}
            xKey="month"
            series={[
              { key: incomeLabel, label: incomeLabel, color: 'var(--color-positive)' },
              { key: expensesLabel, label: expensesLabel, color: 'var(--color-negative)' },
            ]}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 text-[15px] font-bold text-ink">{t('reports.topCategories')}</h3>
          <div className="flex flex-col gap-3.5">
            {topCategories.map((entry) => (
              <div key={entry.category}>
                <div className="mb-1.5 flex items-center gap-2.5">
                  <CategoryIcon category={entry.category} size="sm" />
                  <span className="flex-1 truncate text-[13px] font-semibold text-ink">{tCategory(entry.category)}</span>
                  <span className="font-numeric text-xs font-bold text-ink-secondary">
                    {format(entry.amount)} · {entry.percentage}%
                  </span>
                </div>
                <ProgressBar value={entry.percentage} tone="negative" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 text-[15px] font-bold text-ink">{t('reports.budgetPerformance')}</h3>
          <div className="flex flex-col gap-3.5">
            {budgets.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <CategoryIcon category={b.category} size="sm" />
                <span className="w-24 shrink-0 truncate text-[13px] font-semibold text-ink">{b.name ?? tCategory(b.category)}</span>
                <div className="flex-1">
                  <ProgressBar value={b.percentage} tone={STATUS_TONE[b.status]} />
                </div>
                <Badge tone={STATUS_TONE[b.status]}>{t(STATUS_KEY[b.status])}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-ink">
            <Flag className="h-4 w-4 text-primary" /> {t('reports.goalsProgress')}
          </h3>
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
        </Card>
      </div>
    </div>
  )
}
