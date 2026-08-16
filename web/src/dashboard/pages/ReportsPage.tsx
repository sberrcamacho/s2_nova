import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Download, PiggyBank, Wallet } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { ChartCard } from '@/components/ui/ChartCard'
import { Button } from '@/components/ui/Button'
import { NovaAreaChart } from '@/components/charts/NovaAreaChart'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { analyticsService } from '@/services/analyticsService'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'
import type { MonthlySummary } from '@/types'

const RANGES = [
  { value: 3, label: '3M' },
  { value: 6, label: '6M' },
  { value: 12, label: '1A' },
] as const

export default function ReportsPage() {
  const { transactions } = useAppData()
  const { showToast } = useToast()
  const { format } = useCurrency()
  const { t, language } = useTranslation()
  const [rangeMonths, setRangeMonths] = useState<number>(6)
  const [history, setHistory] = useState<MonthlySummary[]>([])
  const [savingsTrend, setSavingsTrend] = useState<{ label: string; balance: number }[]>([])
  const [weeklySpending, setWeeklySpending] = useState<{ label: string; amount: number }[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(rangeMonths, language).then(setHistory)
    analyticsService.getSavingsTrend(rangeMonths, language).then(setSavingsTrend)
    analyticsService.getWeeklySpending(undefined, language).then(setWeeklySpending)
  }, [transactions, rangeMonths, language])

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
    </div>
  )
}
