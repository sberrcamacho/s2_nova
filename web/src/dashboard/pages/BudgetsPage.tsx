import { useEffect, useState } from 'react'
import { PiggyBank, TrendingDown, Wallet } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Badge } from '@/components/ui/Badge'
import { NovaBarChart } from '@/components/charts/NovaBarChart'
import { useAppData } from '@/state/AppDataContext'
import { analyticsService } from '@/services/analyticsService'
import { type BudgetProgress } from '@/services/budgetService'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { currentMonthKey, monthNameLabel } from '@/lib/date'
import { cn } from '@/lib/cn'
import type { MonthlySummary } from '@/types'

const STATUS_TONE: Record<BudgetProgress['status'], 'positive' | 'warning' | 'negative'> = {
  on_track: 'positive',
  near_limit: 'warning',
  over_budget: 'negative',
}

// Read-only: creating/editing budgets is Android's job (micro-management),
// Web only shows progress for analysis — see root AGENTS.md.
export default function BudgetsPage() {
  const { budgets } = useAppData()
  const { format } = useCurrency()
  const { t, tCategory, language } = useTranslation()
  const [history, setHistory] = useState<Record<string, MonthlySummary[]>>({})

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const overCount = budgets.filter((b) => b.status === 'over_budget').length
  const pct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0

  const monthKey = currentMonthKey()
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - now.getDate()

  useEffect(() => {
    Promise.all(budgets.map((b) => analyticsService.getCategoryHistory(b.category, 6, language).then((h) => [b.id, h] as const))).then(
      (entries) => setHistory(Object.fromEntries(entries)),
    )
  }, [budgets, language])

  return (
    <div className="flex flex-col gap-5">
      <p className="-mt-1 text-xs font-medium text-ink-tertiary">
        {t('budgets.readOnlyNote')} {daysLeft} {t('budgets.daysLeftSuffix')} {monthNameLabel(monthKey, language)}.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard label={t('budgets.totalBudget')} value={format(totalLimit)} icon={<Wallet className="h-4 w-4" />} tone="primary" />
        <KPICard label={t('budgets.spentThisMonth')} value={format(totalSpent)} icon={<TrendingDown className="h-4 w-4" />} trend={{ value: pct, label: t('budgets.ofBudget') }} />
        <KPICard label={t('budgets.overCategories')} value={String(overCount)} icon={<PiggyBank className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...budgets]
          .sort((a, b) => b.percentage - a.percentage)
          .map((b) => (
            <Card key={b.id} className={cn('p-5', b.status === 'over_budget' && 'border-negative/35')}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CategoryIcon category={b.category} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold text-ink">{b.name ?? tCategory(b.category)}</p>
                    <p className="text-xs text-ink-tertiary">{b.name ? tCategory(b.category) : t('budgets.monthlyLimit')}</p>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[b.status]}>{b.percentage}%</Badge>
              </div>
              <p className="font-numeric text-lg font-extrabold text-ink">
                {format(b.spent)} <span className="text-sm font-semibold text-ink-tertiary">/ {format(b.limit)}</span>
              </p>
              <ProgressBar value={b.percentage} tone={STATUS_TONE[b.status]} trackClassName="mt-3" />
              <p className="mt-2 text-xs font-semibold text-ink-tertiary">
                {b.remaining >= 0 ? `${format(b.remaining)} ${t('budgets.remaining')}` : `${format(Math.abs(b.remaining))} ${t('budgets.overLimit')}`}
              </p>
            </Card>
          ))}
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 text-[15px] font-bold text-ink">{t('budgets.utilization')}</h3>
        <div className="flex flex-col gap-4">
          {[...budgets]
            .sort((a, b) => b.percentage - a.percentage)
            .map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <CategoryIcon category={b.category} size="sm" />
                <span className="w-32 shrink-0 truncate text-[13px] font-semibold text-ink">{tCategory(b.category)}</span>
                <div className="flex-1">
                  <ProgressBar value={b.percentage} tone={STATUS_TONE[b.status]} />
                </div>
                <span className="w-12 shrink-0 text-right font-numeric text-xs font-bold text-ink-secondary">{b.percentage}%</span>
              </div>
            ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="text-[15px] font-bold text-ink">{t('budgets.historicalPerformance')}</h3>
        <p className="mt-0.5 text-xs font-medium text-ink-tertiary">{t('budgets.historicalNote')}</p>
        <div className="mt-5 flex flex-col gap-6">
          {[...budgets]
            .sort((a, b) => b.percentage - a.percentage)
            .map((b) => {
              const spentLabel = t('budgets.spent')
              const limitLabel = t('budgets.limitProxy')
              const h = history[b.id] ?? []
              return (
                <div key={b.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <CategoryIcon category={b.category} size="sm" />
                    <span className="text-[13px] font-bold text-ink">{b.name ?? tCategory(b.category)}</span>
                  </div>
                  <NovaBarChart
                    data={h.map((m) => ({ month: m.label, [spentLabel]: m.expenses, [limitLabel]: b.limit }))}
                    xKey="month"
                    height={180}
                    series={[
                      { key: spentLabel, label: spentLabel, color: 'var(--color-negative)' },
                      { key: limitLabel, label: limitLabel, color: 'var(--color-text-tertiary)' },
                    ]}
                  />
                </div>
              )
            })}
        </div>
      </Card>
    </div>
  )
}
