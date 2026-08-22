import { useEffect, useMemo, useState } from 'react'
import { Flag } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { NovaLineChart } from '@/components/charts/NovaLineChart'
import { useAppData } from '@/state/AppDataContext'
import { goalService } from '@/services/goalService'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { monthLabel } from '@/lib/date'
import type { Goal } from '@/types'

// Read-only: creating/editing goals is Android's job (micro-management),
// Web only shows progress for analysis — see root AGENTS.md.
export default function GoalsPage() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, language } = useTranslation()
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    goalService
      .getGoals()
      .then(setGoals)
      .finally(() => setIsLoading(false))
  }, [])

  // Contributions come only from transactions actually linked to a goal
  // (transaction.goalId) — never inferred or estimated. With fewer than
  // two distinct months of linked contributions there's nothing honest to
  // trend, so the chart is skipped in favor of an explicit "not enough
  // data" note rather than fabricating a projected completion date.
  const contributionsByGoal = useMemo(() => {
    const map = new Map<string, { month: string; label: string; amount: number }[]>()
    for (const goal of goals) {
      const byMonth = new Map<string, number>()
      for (const tx of transactions) {
        if (tx.goalId !== goal.id) continue
        const monthKey = tx.date.slice(0, 7)
        byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + tx.amount)
      }
      const sorted = Array.from(byMonth.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([month, amount]) => ({ month, label: monthLabel(month, language), amount }))
      map.set(goal.id, sorted)
    }
    return map
  }, [goals, transactions, language])

  return (
    <div className="flex flex-col gap-5">
      {!isLoading && goals.length === 0 && (
        <Card className="p-8 text-center">
          <Flag className="mx-auto h-8 w-8 text-ink-tertiary" />
          <p className="mt-3 text-sm font-bold text-ink">{t('goals.emptyReadOnly')}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {goals.map((goal) => {
          const percentage = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0
          const contributions = contributionsByGoal.get(goal.id) ?? []
          let cumulative = 0
          const trend = contributions.map((c) => {
            cumulative += c.amount
            return { label: c.label, amount: cumulative }
          })

          return (
            <Card key={goal.id} className="p-5">
              <div className="mb-3 flex items-center gap-3">
                <Flag className="h-5 w-5 text-primary" />
                <p className="truncate text-[13.5px] font-bold text-ink">{goal.name}</p>
              </div>
              <p className="font-numeric text-lg font-extrabold text-ink">
                {format(goal.currentAmount)} <span className="text-sm font-semibold text-ink-tertiary">/ {format(goal.targetAmount)}</span>
              </p>
              <ProgressBar value={percentage} tone="primary" trackClassName="mt-3" />

              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-tertiary">{t('goals.contributionsOverTime')}</p>
                {trend.length >= 2 ? (
                  <NovaLineChart
                    data={trend}
                    xKey="label"
                    height={140}
                    series={[{ key: 'amount', label: t('goals.contributionsOverTime'), color: 'var(--color-primary)' }]}
                  />
                ) : (
                  <p className="text-xs text-ink-tertiary">{t('goals.insufficientData')}</p>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
