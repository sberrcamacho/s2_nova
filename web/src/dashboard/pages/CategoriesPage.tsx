import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { ChartCard } from '@/components/ui/ChartCard'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { NovaDonutChart } from '@/components/charts/NovaDonutChart'
import { useAppData } from '@/state/AppDataContext'
import { useDashboardFilters } from '@/dashboard/DashboardFiltersContext'
import { categoryMap } from '@/data/categories'
import { useCurrency } from '@/state/useCurrency'
import { isSameMonth } from '@/lib/date'
import type { CategoryId } from '@/types'

export default function CategoriesPage() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { monthKeys } = useDashboardFilters()

  const periodExpenses = useMemo(
    () => transactions.filter((t) => t.type === 'expense' && monthKeys.some((mk) => isSameMonth(t.date, mk))),
    [transactions, monthKeys],
  )

  const total = periodExpenses.reduce((s, t) => s + t.amount, 0)

  const breakdown = useMemo(() => {
    const totals = new Map<CategoryId, number>()
    for (const t of periodExpenses) totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)
  }, [periodExpenses, total])

  const donutData = breakdown.map((e) => ({
    name: categoryMap[e.category]?.label ?? e.category,
    value: e.amount,
    color: categoryMap[e.category]?.color ?? '#9C9CAA',
  }))

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Distribución por categoría" subtitle="Periodo seleccionado">
          {donutData.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Sin gastos" description="No hay gastos en este periodo." />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <NovaDonutChart data={donutData} height={220} centerLabel="Total" centerValue={format(total)} />
              <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2">
                {breakdown.map((e) => (
                  <div key={e.category} className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryMap[e.category]?.color }} />
                    <span className="truncate">{categoryMap[e.category]?.label}</span>
                    <span className="ml-auto text-ink-tertiary">{format(e.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <Card className="p-5 sm:p-6">
          <h3 className="mb-4 text-[15px] font-bold text-ink">Desglose por categoría</h3>
          {breakdown.length === 0 ? (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Sin datos" description="No hay gastos en el periodo seleccionado." />
          ) : (
            <div className="flex flex-col gap-4">
              {breakdown.map((e, i) => (
                <div key={e.category}>
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <span className="w-4 shrink-0 text-xs font-bold text-ink-tertiary">#{i + 1}</span>
                    <CategoryIcon category={e.category} size="sm" />
                    <span className="flex-1 truncate text-[13px] font-semibold text-ink">{categoryMap[e.category]?.label}</span>
                    <span className="font-numeric text-xs font-bold text-ink-secondary">{e.percentage}%</span>
                    <span className="font-numeric text-xs font-bold text-ink">{format(e.amount)}</span>
                  </div>
                  <div className="ml-[52px]">
                    <ProgressBar value={e.percentage} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
