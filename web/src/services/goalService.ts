import { apiClient } from '@/lib/apiClient'
import type { Goal } from '@/types'

// Goal progress is computed by the backend from linked transactions (see
// backend/src/lib/goalProgress.ts) — never recomputed here. Writes mirror
// Android's Metas sheets; a contribution ("Abonar") is an ordinary expense
// with goalId, created through transactionService.
interface BackendGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  remaining: number
  percentage: number
  themeIcon: string | null
  targetDate: string | null
  contributions?: { accountId: string; amount: number }[]
}

function mapGoal(goal: BackendGoal): Goal {
  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    remaining: goal.remaining,
    percentage: goal.percentage,
    themeIcon: goal.themeIcon ?? undefined,
    targetDate: goal.targetDate?.slice(0, 10),
    contributions: goal.contributions ?? [],
  }
}

export const goalService = {
  async getGoals(): Promise<Goal[]> {
    const goals = await apiClient.get<BackendGoal[]>('/goals')
    return goals.map(mapGoal)
  },

  async createGoal(input: { name: string; targetAmount: number; themeIcon: string }): Promise<Goal> {
    return mapGoal(await apiClient.post<BackendGoal>('/goals', input))
  },

  async updateGoal(id: string, input: { name: string; targetAmount: number; themeIcon: string }): Promise<Goal> {
    return mapGoal(await apiClient.patch<BackendGoal>(`/goals/${id}`, input))
  },

  // A goal holding money needs a destination: one wallet, or `origin` to
  // give every contributing wallet its own share back.
  async deleteGoal(id: string, returnTo?: { accountId: string } | 'origin'): Promise<void> {
    const body = returnTo === 'origin' ? { returnToOrigin: true } : returnTo ? { returnToAccountId: returnTo.accountId } : {}
    await apiClient.delete(`/goals/${id}`, body)
  },
}
