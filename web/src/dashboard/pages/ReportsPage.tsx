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
import { formatCOP } from '@/lib/currency'
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
  const [rangeMonths, setRangeMonths] = useState<number>(6)
  const [history, setHistory] = useState<MonthlySummary[]>([])
  const [savingsTrend, setSavingsTrend] = useState<{ label: string; balance: number }[]>([])
  const [weeklySpending, setWeeklySpending] = useState<{ label: string; amount: number }[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(rangeMonths).then(setHistory)
    analyticsService.getSavingsTrend(rangeMonths).then(setSavingsTrend)
    analyticsService.getWeeklySpending().then(setWeeklySpending)
  }, [transactions, rangeMonths])

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
          onClick={() => showToast('Exportación simulada — no hay archivo real en este entorno de demostración.', 'info')}
        >
          Exportar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label="Ingresos totales" value={formatCOP(totalIncome)} icon={<ArrowDownLeft className="h-4 w-4" />} />
        <KPICard label="Gastos totales" value={formatCOP(totalExpenses)} icon={<ArrowUpRight className="h-4 w-4" />} />
        <KPICard label="Ahorro neto" value={formatCOP(netSavings)} icon={<PiggyBank className="h-4 w-4" />} tone="primary" />
        <KPICard label="Ahorro mensual promedio" value={formatCOP(avgMonthlySave)} icon={<Wallet className="h-4 w-4" />} />
      </div>

      <ChartCard title="Tendencia de ahorro neto" subtitle={`Últimos ${rangeMonths} meses`}>
        <NovaAreaChart
          data={savingsTrend}
          xKey="label"
          series={[{ key: 'balance', label: 'Ahorro acumulado', color: 'var(--color-primary)' }]}
        />
      </ChartCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Patrón de gasto semanal" subtitle="Mes actual">
          <NovaBarChart
            data={weeklySpending.map((w) => ({ week: w.label, Gastos: w.amount }))}
            xKey="week"
            series={[{ key: 'Gastos', label: 'Gastos', color: 'var(--color-negative)' }]}
          />
        </ChartCard>
        <ChartCard title="Comparativo mensual" subtitle={`Ingresos vs. gastos — últimos ${rangeMonths} meses`}>
          <NovaBarChart
            data={history.map((m) => ({ month: m.label, Ingresos: m.income, Gastos: m.expenses }))}
            xKey="month"
            series={[
              { key: 'Ingresos', label: 'Ingresos', color: 'var(--color-positive)' },
              { key: 'Gastos', label: 'Gastos', color: 'var(--color-negative)' },
            ]}
          />
        </ChartCard>
      </div>
    </div>
  )
}
