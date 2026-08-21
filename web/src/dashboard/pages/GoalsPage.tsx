import { useEffect, useState } from 'react'
import { Flag } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { goalService } from '@/services/goalService'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import type { Goal } from '@/types'

// Read-only: creating/editing goals is Android's job (micro-management),
// Web only shows progress for analysis — see root AGENTS.md.
export default function GoalsPage() {
  const { format } = useCurrency()
  const { t } = useTranslation()
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    goalService
      .getGoals()
      .then(setGoals)
      .finally(() => setIsLoading(false))
  }, [])

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
            </Card>
          )
        })}
      </div>
    </div>
  )
}
