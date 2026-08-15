import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, Receipt, Sparkles, Wallet } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { ChartCard } from '@/components/ui/ChartCard'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { NovaAreaChart } from '@/components/charts/NovaAreaChart'
import { NovaDonutChart } from '@/components/charts/NovaDonutChart'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { useAppData } from '@/state/AppDataContext'
import { useDashboardFilters } from '@/dashboard/DashboardFiltersContext'
import { analyticsService } from '@/services/analyticsService'
import { categoryMap } from '@/data/categories'
import { formatCOP } from '@/lib/currency'
import { isSameMonth } from '@/lib/date'
import type { MonthlySummary } from '@/types'

export default function IncomePage() {
  const { transactions } = useAppData()
  const { monthKeys } = useDashboardFilters()
  const [history, setHistory] = useState<MonthlySummary[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(6).then(setHistory)
  }, [transactions])

  const periodIncome = useMemo(
    () => transactions.filter((t) => t.type === 'income' && monthKeys.some((mk) => isSameMonth(t.date, mk))),
    [transactions, monthKeys],
  )

  const total = periodIncome.reduce((s, t) => s + t.amount, 0)
  const avgPerTxn = periodIncome.length ? total / periodIncome.length : 0

  const breakdown = useMemo(() => {
    const totals = new Map<string, number>()
    for (const t of periodIncome) totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [periodIncome])

  const topSource = breakdown[0]
  const donutData = breakdown.map((e) => ({
    name: categoryMap[e.category]?.label ?? e.category,
    value: e.amount,
    color: categoryMap[e.category]?.color ?? '#9C9CAA',
  }))

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label="Total de ingresos" value={formatCOP(total)} icon={<ArrowDownLeft className="h-4 w-4" />} tone="primary" />
        <KPICard label="Promedio por ingreso" value={formatCOP(avgPerTxn)} icon={<Receipt className="h-4 w-4" />} />
        <KPICard label="Movimientos" value={String(periodIncome.length)} icon={<Receipt className="h-4 w-4" />} />
        <KPICard label="Fuente principal" value={topSource ? categoryMap[topSource.category]?.label ?? '' : '—'} icon={<Wallet className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard title="Ingresos mensuales" subtitle="Últimos 6 meses" className="xl:col-span-2">
          <NovaAreaChart
            data={history.map((m) => ({ month: m.label, Ingresos: m.income }))}
            xKey="month"
            series={[{ key: 'Ingresos', label: 'Ingresos', color: 'var(--color-positive)' }]}
          />
        </ChartCard>
        <ChartCard title="Fuentes de ingreso" subtitle="Periodo seleccionado">
          {donutData.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Sin ingresos" description="No hay ingresos en este periodo." />
          ) : (
            <div className="flex justify-center">
              <NovaDonutChart data={donutData} height={220} centerLabel="Total" centerValue={formatCOP(total)} />
            </div>
          )}
        </ChartCard>
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 text-[15px] font-bold text-ink">Ingresos del periodo</h3>
        <div className="flex flex-col divide-y divide-border">
          {periodIncome.slice(0, 12).map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </div>
        {periodIncome.length === 0 && (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Sin ingresos registrados" description="No hay ingresos en el periodo seleccionado." />
        )}
      </Card>
    </div>
  )
}
