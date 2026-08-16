import { useEffect, useMemo, useState } from 'react'
import { Download, Receipt, TrendingDown, Wallet } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { ChartCard } from '@/components/ui/ChartCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Sparkles } from 'lucide-react'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { NovaDonutChart } from '@/components/charts/NovaDonutChart'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { useDashboardFilters } from '@/dashboard/DashboardFiltersContext'
import { analyticsService } from '@/services/analyticsService'
import { categoryMap } from '@/data/categories'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { isSameMonth } from '@/lib/date'
import type { CategoryId, MonthlySummary } from '@/types'

export default function ExpensesPage() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, tCategory, language } = useTranslation()
  const { monthKeys } = useDashboardFilters()
  const { showToast } = useToast()
  const [history, setHistory] = useState<MonthlySummary[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(6, language).then(setHistory)
  }, [transactions, language])

  const periodExpenses = useMemo(
    () => transactions.filter((t) => t.type === 'expense' && monthKeys.some((mk) => isSameMonth(t.date, mk))),
    [transactions, monthKeys],
  )

  const total = periodExpenses.reduce((s, t) => s + t.amount, 0)
  const avgPerTxn = periodExpenses.length ? total / periodExpenses.length : 0

  const breakdown = useMemo(() => {
    const totals = new Map<CategoryId, number>()
    for (const t of periodExpenses) totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={() => showToast(t('common.exportSimulated'), 'info')}
        >
          {t('expenses.exportCsv')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label={t('expenses.totalSpent')} value={format(total)} icon={<TrendingDown className="h-4 w-4" />} tone="primary" />
        <KPICard label={t('expenses.avgPerTransaction')} value={format(avgPerTxn)} icon={<Receipt className="h-4 w-4" />} />
        <KPICard label={t('settings.transactions')} value={String(periodExpenses.length)} icon={<Receipt className="h-4 w-4" />} />
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
        <h3 className="mb-4 text-[15px] font-bold text-ink">{t('expenses.topCategories')}</h3>
        {breakdown.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('common.noDataTitle')} description={t('expenses.noDataDescription')} />
        ) : (
          <div className="flex flex-col gap-3.5">
            {breakdown.slice(0, 6).map((e) => (
              <div key={e.category}>
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-ink">{tCategory(e.category)}</span>
                  <span className="font-numeric font-bold text-ink-secondary">
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
        <h3 className="mb-4 text-[15px] font-bold text-ink">{t('expenses.periodExpenses')}</h3>
        <div className="flex flex-col divide-y divide-border">
          {periodExpenses.slice(0, 12).map((txn) => (
            <TransactionRow key={txn.id} transaction={txn} />
          ))}
        </div>
        {periodExpenses.length === 0 && (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('expenses.emptyRegisteredTitle')} description={t('expenses.noDataDescription')} />
        )}
      </Card>
    </div>
  )
}
