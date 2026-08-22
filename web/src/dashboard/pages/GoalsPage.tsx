import { useEffect, useMemo, useState } from 'react'
import { Flag } from 'lucide-react'
import { Card } from '@/components/ui/Card'
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
      <p className="-mt-1 text-xs font-medium text-ink-tertiary">{t('goals.readOnlyNote')}</p>

      {!isLoading && goals.length === 0 && (
        <Card className="p-8 text-center">
          <Flag className="mx-auto h-8 w-8 text-ink-tertiary" />
          <p className="mt-3 text-sm font-bold text-ink">{t('goals.emptyReadOnly')}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {goals.map((goal) => {
          const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0
          const contributions = contributionsByGoal.get(goal.id) ?? []
          let cumulative = 0
          const trend = contributions.map((c) => {
            cumulative += c.amount
            return { label: c.label, amount: cumulative }
          })

          return (
            <Card key={goal.id} className="p-5">
              <div className="flex items-center gap-[18px]">
                <div
                  className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(var(--color-primary) ${pct}%, var(--color-border) 0)` }}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                    <span className="font-numeric text-sm font-extrabold text-ink">{pct}%</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-ink">{goal.name}</p>
                  <p className="font-numeric mt-1 text-lg font-extrabold text-ink">
                    {format(goal.currentAmount)}{' '}
                    <span className="text-xs font-semibold text-ink-tertiary">
                      {t('common.of')} {format(goal.targetAmount)}
                    </span>
                  </p>
                  {trend.length < 2 && <p className="mt-1 text-[11.5px] text-ink-tertiary">{t('goals.insufficientData')}</p>}
                </div>
              </div>

              {trend.length >= 2 && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-tertiary">{t('goals.contributionsOverTime')}</p>
                  <NovaLineChart
                    data={trend}
                    xKey="label"
                    height={120}
                    series={[{ key: 'amount', label: t('goals.contributionsOverTime'), color: 'var(--color-primary)' }]}
                  />
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
