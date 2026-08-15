import { useEffect, useState } from 'react'
import { ChartCard } from '@/components/ui/ChartCard'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { NovaLineChart } from '@/components/charts/NovaLineChart'
import { NovaAreaChart } from '@/components/charts/NovaAreaChart'
import { NovaDonutChart } from '@/components/charts/NovaDonutChart'
import { useAppData } from '@/state/AppDataContext'
import { analyticsService } from '@/services/analyticsService'
import { budgetService, type BudgetProgress } from '@/services/budgetService'
import { categoryMap } from '@/data/categories'
import { formatCOP } from '@/lib/currency'
import type { CategoryBreakdownEntry, MonthlySummary } from '@/types'

export default function AnalyticsPage() {
  const { transactions } = useAppData()
  const [history, setHistory] = useState<MonthlySummary[]>([])
  const [breakdown, setBreakdown] = useState<CategoryBreakdownEntry[]>([])
  const [savingsTrend, setSavingsTrend] = useState<{ label: string; balance: number }[]>([])
  const [budgetPerf, setBudgetPerf] = useState<BudgetProgress[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(6).then(setHistory)
    analyticsService.getCategoryBreakdown().then(setBreakdown)
    analyticsService.getSavingsTrend(6).then(setSavingsTrend)
    budgetService.getBudgets().then(setBudgetPerf)
  }, [transactions])

  const donutData = breakdown.map((e) => ({
    name: categoryMap[e.category]?.label ?? e.category,
    value: e.amount,
    color: categoryMap[e.category]?.color ?? '#9C9CAA',
  }))

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Comparativo mensual" subtitle="Ingresos vs. gastos — últimos 6 meses">
          <NovaBarChart
            data={history.map((m) => ({ month: m.label, Ingresos: m.income, Gastos: m.expenses }))}
            xKey="month"
            series={[
              { key: 'Ingresos', label: 'Ingresos', color: 'var(--color-positive)' },
              { key: 'Gastos', label: 'Gastos', color: 'var(--color-negative)' },
            ]}
          />
        </ChartCard>
        <ChartCard title="Tendencia de gastos" subtitle="Evolución mensual">
          <NovaLineChart
            data={history.map((m) => ({ month: m.label, Gastos: m.expenses }))}
            xKey="month"
            series={[{ key: 'Gastos', label: 'Gastos', color: 'var(--color-primary)' }]}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Tendencia de ahorro" subtitle="Saldo acumulado">
          <NovaAreaChart
            data={savingsTrend}
            xKey="label"
            series={[{ key: 'balance', label: 'Ahorro acumulado', color: 'var(--color-primary)' }]}
          />
        </ChartCard>
        <ChartCard title="Análisis por categoría" subtitle="Participación del gasto total del mes">
          <div className="flex items-center gap-6">
            <NovaDonutChart data={donutData} height={200} />
            <div className="flex flex-1 flex-col gap-2.5">
              {breakdown.slice(0, 6).map((entry) => (
                <div key={entry.category} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: categoryMap[entry.category]?.color }} />
                  <span className="flex-1 truncate font-semibold text-ink-secondary">{categoryMap[entry.category]?.label}</span>
                  <span className="font-numeric font-bold text-ink">{entry.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Desempeño de presupuestos" subtitle="Gastado vs. límite por categoría — mes actual">
        <div className="flex flex-col gap-4">
          {[...budgetPerf]
            .sort((a, b) => b.percentage - a.percentage)
            .map((b) => (
              <div key={b.id} className="flex items-center gap-4">
                <CategoryIcon category={b.category} size="sm" />
                <div className="w-32 shrink-0 truncate text-[13px] font-semibold text-ink">{categoryMap[b.category]?.label}</div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, b.percentage)}%`,
                      background: b.status === 'over_budget' ? 'var(--color-negative)' : b.status === 'near_limit' ? 'var(--color-warning)' : 'var(--color-positive)',
                    }}
                  />
                </div>
                <div className="w-40 shrink-0 text-right text-xs font-semibold text-ink-tertiary">
                  {formatCOP(b.spent)} / {formatCOP(b.limit)}
                </div>
              </div>
            ))}
        </div>
      </ChartCard>
    </div>
  )
}
