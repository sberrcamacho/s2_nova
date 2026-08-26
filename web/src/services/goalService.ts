import { apiClient } from '@/lib/apiClient'
import type { Goal } from '@/types'

// Read-only by design: creating/editing goals is Android's job
// (micro-management) — Web (macro-analysis) only ever reads goal
// progress, which the backend computes from linked transactions (see
// backend/src/routes/goals.ts's computeProgress) — never recomputed here.
interface BackendGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
}

function mapGoal(goal: BackendGoal): Goal {
  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    targetDate: goal.targetDate?.slice(0, 10),
  }
}

export const goalService = {
  async getGoals(): Promise<Goal[]> {
    const goals = await apiClient.get<BackendGoal[]>('/goals')
    return goals.map(mapGoal)
  },
}
