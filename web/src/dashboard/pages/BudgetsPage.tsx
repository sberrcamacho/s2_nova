import { PiggyBank, TrendingDown, Wallet } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Badge } from '@/components/ui/Badge'
import { useAppData } from '@/state/AppDataContext'
import { type BudgetProgress } from '@/services/budgetService'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import type { TranslationKey } from '@/lib/i18n/translations'

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

// Read-only: creating/editing budgets is Android's job (micro-management),
// Web only shows progress for analysis — see root AGENTS.md.
export default function BudgetsPage() {
  const { budgets } = useAppData()
  const { format } = useCurrency()
  const { t, tCategory } = useTranslation()

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const overCount = budgets.filter((b) => b.status === 'over_budget').length
  const pct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard label={t('budgets.totalBudget')} value={format(totalLimit)} icon={<Wallet className="h-4 w-4" />} tone="primary" />
        <KPICard label={t('budgets.spentThisMonth')} value={format(totalSpent)} icon={<TrendingDown className="h-4 w-4" />} trend={{ value: pct, label: t('budgets.ofBudget') }} />
        <KPICard label={t('budgets.overCategories')} value={String(overCount)} icon={<PiggyBank className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...budgets]
          .sort((a, b) => b.percentage - a.percentage)
          .map((b) => (
            <Card key={b.id} className="p-5">
              <div className="mb-3 flex items-center gap-3">
                <CategoryIcon category={b.category} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-ink">{b.name ?? tCategory(b.category)}</p>
                  <p className="text-xs text-ink-tertiary">{b.name ? tCategory(b.category) : t('budgets.monthlyLimit')}</p>
                </div>
                <Badge tone={STATUS_TONE[b.status]}>{t(STATUS_KEY[b.status])}</Badge>
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
    </div>
  )
}
