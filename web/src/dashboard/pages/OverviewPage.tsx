import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Landmark, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { ChartCard } from '@/components/ui/ChartCard'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EmptyState } from '@/components/ui/EmptyState'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { NovaAreaChart } from '@/components/charts/NovaAreaChart'
import { NovaDonutChart } from '@/components/charts/NovaDonutChart'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { useAppData } from '@/state/AppDataContext'
import { useDashboardFilters } from '@/dashboard/DashboardFiltersContext'
import { analyticsService } from '@/services/analyticsService'
import { categoryMap } from '@/data/categories'
import { useCurrency } from '@/state/useCurrency'
import { isSameMonth } from '@/lib/date'
import { Sparkles } from 'lucide-react'
import type { MonthlySummary } from '@/types'

export default function OverviewPage() {
  const { transactions, budgets } = useAppData()
  const { format } = useCurrency()
  const { monthKeys } = useDashboardFilters()
  const navigate = useNavigate()

  const [history, setHistory] = useState<MonthlySummary[]>([])
  const [savingsTrend, setSavingsTrend] = useState<{ label: string; balance: number }[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(6).then(setHistory)
    analyticsService.getSavingsTrend(6).then(setSavingsTrend)
  }, [transactions])

  const balance = useMemo(
    () => transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
    [transactions],
  )

  const periodTransactions = useMemo(
    () => transactions.filter((t) => monthKeys.some((mk) => isSameMonth(t.date, mk))),
    [transactions, monthKeys],
  )

  const income = periodTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = periodTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const savings = income - expenses

  const rangeSeries = history.filter((h) => monthKeys.includes(h.month))
  const chartData = (rangeSeries.length >= 2 ? rangeSeries : history).map((m) => ({
    month: m.label,
    Ingresos: m.income,
    Gastos: m.expenses,
  }))

  const breakdown = useMemo(() => {
    const totals = new Map<string, number>()
    for (const t of periodTransactions) {
      if (t.type !== 'expense') continue
      totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
    }
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [periodTransactions])

  const donutData = breakdown.map((e) => ({
    name: categoryMap[e.category]?.label ?? e.category,
    value: e.amount,
    color: categoryMap[e.category]?.color ?? '#9C9CAA',
  }))

  const topBudgets = [...budgets].sort((a, b) => b.percentage - a.percentage).slice(0, 4)
  const recent = transactions.slice(0, 6)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label="Saldo actual" value={format(balance)} icon={<Landmark className="h-4 w-4" />} tone="primary" />
        <KPICard
          label="Ingresos totales"
          value={format(income)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend={{ value: 8.4, label: 'vs. periodo anterior' }}
        />
        <KPICard
          label="Gastos totales"
          value={format(expenses)}
          icon={<TrendingDown className="h-4 w-4" />}
          trend={{ value: -3.1, label: 'vs. periodo anterior' }}
        />
        <KPICard label="Ahorro" value={format(savings)} icon={<PiggyBank className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard title="Ingresos vs. gastos" subtitle="Comparativo mensual" className="xl:col-span-2">
          <NovaBarChart
            data={chartData}
            xKey="month"
            series={[
              { key: 'Ingresos', label: 'Ingresos', color: 'var(--color-positive)' },
              { key: 'Gastos', label: 'Gastos', color: 'var(--color-negative)' },
            ]}
          />
        </ChartCard>

        <ChartCard title="Gastos por categoría" subtitle="Periodo seleccionado">
          {donutData.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Sin gastos" description="No hay gastos en este periodo." />
          ) : (
            <div className="flex justify-center">
              <NovaDonutChart data={donutData} height={220} centerLabel="Total" centerValue={format(expenses)} />
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard title="Tendencia de ahorro" subtitle="Saldo acumulado — últimos 6 meses" className="xl:col-span-2">
          <NovaAreaChart
            data={savingsTrend}
            xKey="label"
            series={[{ key: 'balance', label: 'Ahorro acumulado', color: 'var(--color-primary)' }]}
          />
        </ChartCard>

        <ChartCard
          title="Progreso de presupuestos"
          subtitle="Categorías con mayor uso"
          action={
            <button onClick={() => navigate('/budgets')} className="flex items-center gap-0.5 text-xs font-bold text-primary">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          <div className="flex flex-col gap-4">
            {topBudgets.map((b) => (
              <div key={b.id}>
                <div className="mb-1.5 flex items-center gap-2">
                  <CategoryIcon category={b.category} size="sm" />
                  <span className="flex-1 truncate text-[13px] font-semibold text-ink">{categoryMap[b.category]?.label}</span>
                  <span className="font-numeric text-xs font-bold text-ink-secondary">{b.percentage}%</span>
                </div>
                <ProgressBar
                  value={b.percentage}
                  tone={b.status === 'over_budget' ? 'negative' : b.status === 'near_limit' ? 'warning' : 'positive'}
                />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-ink">Transacciones recientes</h3>
          <button onClick={() => navigate('/transactions')} className="flex items-center gap-0.5 text-xs font-bold text-primary">
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {recent.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </div>
        {recent.length === 0 && (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Aún no hay transacciones" description="Agrega movimientos desde la app móvil para verlos aquí." />
        )}
      </Card>
    </div>
  )
}
