import { useEffect, useMemo, useState } from 'react'
import { Calendar, Flame, TrendingDown, TrendingUp } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { ChartCard } from '@/components/ui/ChartCard'
import { Card } from '@/components/ui/Card'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { NovaLineChart } from '@/components/charts/NovaLineChart'
import { NovaAreaChart } from '@/components/charts/NovaAreaChart'
import { NovaDonutChart } from '@/components/charts/NovaDonutChart'
import { useAppData } from '@/state/AppDataContext'
import { analyticsService } from '@/services/analyticsService'
import { categoryMap } from '@/data/categories'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { currentMonthKey, isSameMonth, weekdayLabel } from '@/lib/date'
import type { CategoryBreakdownEntry, MonthlySummary } from '@/types'

export default function AnalyticsPage() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, tCategory, language } = useTranslation()
  const [history, setHistory] = useState<MonthlySummary[]>([])
  const [breakdown, setBreakdown] = useState<CategoryBreakdownEntry[]>([])
  const [savingsTrend, setSavingsTrend] = useState<{ label: string; balance: number }[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(6, language).then(setHistory)
    analyticsService.getCategoryBreakdown().then(setBreakdown)
    analyticsService.getSavingsTrend(6, language).then(setSavingsTrend)
  }, [transactions, language])

  const incomeLabel = t('nav.income')
  const expensesLabel = t('nav.expenses')
  const donutData = breakdown.map((e) => ({
    name: tCategory(e.category),
    value: e.amount,
    color: categoryMap[e.category]?.color ?? '#9C9CAA',
  }))

  const burnRate = history.length ? history[history.length - 1]!.expenses / 30 : 0
  const bestMonth = history.length ? [...history].sort((a, b) => b.savings - a.savings)[0] : undefined
  const worstMonth = history.length ? [...history].sort((a, b) => a.savings - b.savings)[0] : undefined
  const forecast = history.length ? history.slice(-3).reduce((s, m) => s + m.expenses, 0) / Math.min(3, history.length) : 0

  const insights = useMemo(() => {
    const monthKey = currentMonthKey()
    const monthExpenses = transactions.filter((t) => t.type === 'expense' && isSameMonth(t.date, monthKey))
    const byDay = new Array(7).fill(0) as number[]
    const countByDay = new Array(7).fill(0) as number[]
    for (const t of monthExpenses) {
      const day = new Date(`${t.date}T00:00:00`).getDay()
      byDay[day]! += t.amount
      countByDay[day]! += 1
    }
    const weekendTotal = byDay[0]! + byDay[6]!
    const weekdayTotal = byDay.slice(1, 6).reduce((s, v) => s + v, 0)
    const weekendAvg = weekendTotal / 2
    const weekdayAvg = weekdayTotal / 5
    const peakIndex = byDay.indexOf(Math.max(...byDay))
    return { weekdayAvg, weekendAvg, peakDay: peakIndex >= 0 ? weekdayLabel(peakIndex, language) : '—' }
  }, [transactions, language])

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label={t('analytics.burnRate')} value={`${format(burnRate)}${t('analytics.perDaySuffix')}`} icon={<Flame className="h-4 w-4" />} tone="primary" />
        <KPICard label={t('analytics.bestMonth')} value={bestMonth?.label ?? '—'} icon={<TrendingUp className="h-4 w-4" />} />
        <KPICard label={t('analytics.worstMonth')} value={worstMonth?.label ?? '—'} icon={<TrendingDown className="h-4 w-4" />} />
        <KPICard label={t('analytics.forecastNextMonth')} value={format(forecast)} icon={<Calendar className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title={t('overview.monthlyComparison')} subtitle={t('analytics.incomeVsExpensesLast6')}>
          <NovaBarChart
            data={history.map((m) => ({ month: m.label, [incomeLabel]: m.income, [expensesLabel]: m.expenses }))}
            xKey="month"
            series={[
              { key: incomeLabel, label: incomeLabel, color: 'var(--color-positive)' },
              { key: expensesLabel, label: expensesLabel, color: 'var(--color-negative)' },
            ]}
          />
        </ChartCard>
        <ChartCard title={t('analytics.expenseTrend')} subtitle={t('analytics.monthlyEvolution')}>
          <NovaLineChart
            data={history.map((m) => ({ month: m.label, [expensesLabel]: m.expenses }))}
            xKey="month"
            series={[{ key: expensesLabel, label: expensesLabel, color: 'var(--color-primary)' }]}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title={t('overview.savingsTrend')} subtitle={t('analytics.accumulatedBalance')}>
          <NovaAreaChart
            data={savingsTrend}
            xKey="label"
            series={[{ key: 'balance', label: t('common.cumulativeSavings'), color: 'var(--color-primary)' }]}
          />
        </ChartCard>
        <ChartCard title={t('analytics.categoryAnalysis')} subtitle={t('analytics.monthlyExpenseShare')}>
          <div className="flex items-center gap-6">
            <NovaDonutChart data={donutData} height={200} />
            <div className="flex flex-1 flex-col gap-2.5">
              {breakdown.slice(0, 6).map((entry) => (
                <div key={entry.category} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: categoryMap[entry.category]?.color }} />
                  <span className="flex-1 truncate font-semibold text-ink-secondary">{tCategory(entry.category)}</span>
                  <span className="font-numeric font-bold text-ink">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 text-[15px] font-bold text-ink">{t('analytics.spendingHabits')}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InsightTile label={t('analytics.weekdayAvg')} value={format(insights.weekdayAvg)} />
          <InsightTile label={t('analytics.weekendAvg')} value={format(insights.weekendAvg)} />
          <InsightTile label={t('analytics.peakSpendingDay')} value={insights.peakDay} />
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
