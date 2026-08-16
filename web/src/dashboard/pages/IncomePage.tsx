import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Receipt, Sparkles, Wallet } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { ChartCard } from '@/components/ui/ChartCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { NovaAreaChart } from '@/components/charts/NovaAreaChart'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { NovaDonutChart } from '@/components/charts/NovaDonutChart'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { useAppData } from '@/state/AppDataContext'
import { useDashboardFilters } from '@/dashboard/DashboardFiltersContext'
import { analyticsService } from '@/services/analyticsService'
import { categoryMap } from '@/data/categories'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { isSameMonth } from '@/lib/date'
import type { CategoryId, MonthlySummary } from '@/types'

export default function IncomePage() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, tCategory, language } = useTranslation()
  const { monthKeys } = useDashboardFilters()
  const [history, setHistory] = useState<MonthlySummary[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(6, language).then(setHistory)
  }, [transactions, language])

  const periodIncome = useMemo(
    () => transactions.filter((t) => t.type === 'income' && monthKeys.some((mk) => isSameMonth(t.date, mk))),
    [transactions, monthKeys],
  )

  const total = periodIncome.reduce((s, t) => s + t.amount, 0)
  const avgPerTxn = periodIncome.length ? total / periodIncome.length : 0

  const breakdown = useMemo(() => {
    const totals = new Map<CategoryId, number>()
    for (const t of periodIncome) totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
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
          {periodIncome.slice(0, 12).map((txn) => (
            <TransactionRow key={txn.id} transaction={txn} />
          ))}
        </div>
        {periodIncome.length === 0 && (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('income.emptyRegisteredTitle')} description={t('income.noDataDescription')} />
        )}
      </Card>
    </div>
  )
}
