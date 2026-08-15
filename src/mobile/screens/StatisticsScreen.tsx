import { useEffect, useState } from 'react'
import { MobileHeader } from '@/mobile/components/MobileHeader'
import { Card } from '@/components/ui/Card'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { NovaAreaChart } from '@/components/charts/NovaAreaChart'
import { NovaDonutChart } from '@/components/charts/NovaDonutChart'
import { useAppData } from '@/state/AppDataContext'
import { analyticsService } from '@/services/analyticsService'
import { categoryMap } from '@/data/categories'
import { formatCOP, formatCOPCompact } from '@/lib/currency'
import type { CategoryBreakdownEntry, MonthlySummary } from '@/types'

export default function StatisticsScreen() {
  const { transactions } = useAppData()
  const [history, setHistory] = useState<MonthlySummary[]>([])
  const [breakdown, setBreakdown] = useState<CategoryBreakdownEntry[]>([])
  const [savingsTrend, setSavingsTrend] = useState<{ label: string; balance: number }[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(6).then(setHistory)
    analyticsService.getCategoryBreakdown().then(setBreakdown)
    analyticsService.getSavingsTrend(6).then(setSavingsTrend)
  }, [transactions])

  const totalExpenses = breakdown.reduce((s, e) => s + e.amount, 0)
  const donutData = breakdown.map((e) => ({
    name: categoryMap[e.category]?.label ?? e.category,
    value: e.amount,
    color: categoryMap[e.category]?.color ?? '#9C9CAA',
  }))

  return (
    <div className="flex h-full flex-col">
      <MobileHeader title="Estadísticas" />
      <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-8">
        <Card className="p-5">
          <h2 className="mb-1 text-[15px] font-bold text-ink">Ingresos vs. gastos</h2>
          <p className="mb-4 text-xs text-ink-tertiary">Últimos 6 meses</p>
          <NovaBarChart
            data={history.map((m) => ({ month: m.label, Ingresos: m.income, Gastos: m.expenses }))}
            xKey="month"
            height={200}
            series={[
              { key: 'Ingresos', label: 'Ingresos', color: 'var(--color-positive)' },
              { key: 'Gastos', label: 'Gastos', color: 'var(--color-negative)' },
            ]}
          />
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-[15px] font-bold text-ink">Tendencia de ahorro</h2>
          <p className="mb-4 text-xs text-ink-tertiary">Saldo acumulado</p>
          <NovaAreaChart
            data={savingsTrend}
            xKey="label"
            height={190}
            series={[{ key: 'balance', label: 'Ahorro', color: 'var(--color-primary)' }]}
          />
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-bold text-ink">Gastos por categoría</h2>
          <div className="flex items-center gap-5">
            <NovaDonutChart data={donutData} height={150} centerLabel="Total" centerValue={formatCOPCompact(totalExpenses)} />
            <div className="flex flex-1 flex-col gap-2.5">
              {breakdown.slice(0, 6).map((entry) => (
                <div key={entry.category} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: categoryMap[entry.category]?.color }} />
                  <span className="flex-1 truncate font-semibold text-ink-secondary">{categoryMap[entry.category]?.label}</span>
                  <span className="font-numeric font-bold text-ink">{formatCOP(entry.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
