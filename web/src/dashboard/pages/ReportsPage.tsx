import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { ChartCard } from '@/components/ui/ChartCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { useAppData } from '@/state/AppDataContext'
import { useToast } from '@/state/ToastContext'
import { analyticsService } from '@/services/analyticsService'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { currentMonthKey, isSameMonth, monthNameLabel, weekdayLabel } from '@/lib/date'
import type { TranslationKey } from '@/lib/i18n/translations'
import type { BudgetProgress } from '@/services/budgetService'
import type { MonthlySummary } from '@/types'

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

function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y!, m! - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// pct > 0 reads as "good" for income/savings/savings-rate but "bad" for
// expenses — mirrors OverviewPage's changeTone. Transaction count carries
// no inherent good/bad direction, so it never gets a judgment tone.
function metricTone(key: 'income' | 'expenses' | 'savings' | 'savingsRate' | 'transactions', delta: number | null): 'positive' | 'negative' | 'neutral' {
  if (delta === null || key === 'transactions') return 'neutral'
  const goodWhenUp = key !== 'expenses'
  return goodWhenUp === delta >= 0 ? 'positive' : 'negative'
}

export default function ReportsPage() {
  const { transactions, budgets } = useAppData()
  const { showToast } = useToast()
  const { format } = useCurrency()
  const { t, tCategory, language } = useTranslation()
  const [current, setCurrent] = useState<MonthlySummary | null>(null)
  const [previous, setPrevious] = useState<MonthlySummary | null>(null)

  const monthKey = currentMonthKey()
  const prevMonthKey = previousMonthKey(monthKey)

  useEffect(() => {
    analyticsService.getMonthlySummary(monthKey, language).then(setCurrent)
    analyticsService.getMonthlySummary(prevMonthKey, language).then(setPrevious)
  }, [transactions, monthKey, prevMonthKey, language])

  const currentTxnCount = useMemo(() => transactions.filter((tx) => isSameMonth(tx.date, monthKey)).length, [transactions, monthKey])
  const prevTxnCount = useMemo(() => transactions.filter((tx) => isSameMonth(tx.date, prevMonthKey)).length, [transactions, prevMonthKey])

  const weekdayPattern = useMemo(() => {
    const monthExpenses = transactions.filter((tx) => tx.type === 'expense' && isSameMonth(tx.date, monthKey))
    const totals = new Array(7).fill(0) as number[]
    for (const tx of monthExpenses) totals[new Date(`${tx.date}T00:00:00`).getDay()]! += tx.amount
    const expensesLabel = t('nav.expenses')
    return totals.map((amount, i) => ({ day: weekdayLabel(i, language).slice(0, 3), amount, [expensesLabel]: amount }))
  }, [transactions, monthKey, language, t])
  const peakDayIndex = weekdayPattern.reduce((best, d, i) => (d.amount > weekdayPattern[best]!.amount ? i : best), 0)

  const pctChange = (curr: number, prev: number): number | null => (prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null)
  const savingsRate = (m: MonthlySummary | null) => (m && m.income > 0 ? Math.round((m.savings / m.income) * 100) : 0)

  type Row = { key: 'income' | 'expenses' | 'savings' | 'savingsRate' | 'transactions'; label: string; curr: number; prev: number; isCurrency: boolean; isPct: boolean }
  const rows: Row[] = current && previous
    ? [
        { key: 'income', label: t('nav.income'), curr: current.income, prev: previous.income, isCurrency: true, isPct: false },
        { key: 'expenses', label: t('nav.expenses'), curr: current.expenses, prev: previous.expenses, isCurrency: true, isPct: false },
        { key: 'savings', label: t('overview.savings'), curr: current.savings, prev: previous.savings, isCurrency: true, isPct: false },
        { key: 'savingsRate', label: t('reports.savingsRate'), curr: savingsRate(current), prev: savingsRate(previous), isCurrency: false, isPct: true },
        { key: 'transactions', label: t('nav.transactions'), curr: currentTxnCount, prev: prevTxnCount, isCurrency: false, isPct: false },
      ]
    : []

  const expensesLabel = t('nav.expenses')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-ink-tertiary">
          {language === 'en'
            ? `${monthNameLabel(monthKey, language)} ${monthKey.slice(0, 4)} review · ${t('reports.comparedWith')} ${monthNameLabel(prevMonthKey, language)}`
            : `${t('reports.reviewOf')} ${monthNameLabel(monthKey, language)} ${monthKey.slice(0, 4)} · ${t('reports.comparedWith')} ${monthNameLabel(prevMonthKey, language)}`}
        </p>
        <Button size="sm" variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={() => showToast(t('common.exportSimulated'), 'info')}>
          {t('reports.export')}
        </Button>
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 text-[15px] font-bold text-ink">{t('reports.periodTotals')}</h3>
        <div className="overflow-x-auto">
          <div className="min-w-[480px]">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-2 border-b border-border pb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-tertiary">
              <span>{t('reports.colMetric')}</span>
              <span className="text-right">{monthNameLabel(monthKey, language)}</span>
              <span className="text-right">{monthNameLabel(prevMonthKey, language)}</span>
              <span className="text-right">{t('reports.colChange')}</span>
            </div>
            <div className="flex flex-col divide-y divide-[#16161f]">
              {rows.map((row) => {
                const delta = row.isPct ? row.curr - row.prev : pctChange(row.curr, row.prev)
                const tone = metricTone(row.key, delta)
                const format1 = (v: number) => (row.isCurrency ? format(v) : row.isPct ? `${v}%` : String(v))
                return (
                  <div key={row.key} className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] items-center gap-2 py-3 text-[13px]">
                    <span className="font-semibold text-ink">{row.label}</span>
                    <span className="font-numeric text-right font-extrabold text-ink">{format1(row.curr)}</span>
                    <span className="font-numeric text-right text-ink-tertiary">{format1(row.prev)}</span>
                    <span className="flex justify-end">
                      <Badge tone={tone}>
                        {delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta}${row.isPct ? 'pp' : '%'}`}
                      </Badge>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title={t('reports.weeklySpendingPattern')} subtitle={t('reports.currentMonth')}>
          <NovaBarChart
            data={weekdayPattern}
            xKey="day"
            height={220}
            series={[{ key: expensesLabel, label: expensesLabel, color: 'var(--color-primary-secondary)' }]}
            colorForIndex={(i) => (i === peakDayIndex ? 'var(--color-primary-secondary)' : 'rgba(165,157,255,.28)')}
          />
        </ChartCard>

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
      </div>
    </div>
  )
}
