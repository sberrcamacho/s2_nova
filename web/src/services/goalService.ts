import { apiClient } from '@/lib/apiClient'
import { todayISO } from '@/lib/date'
import type { Goal, GoalPlan } from '@/types'

// Goal progress is computed by the backend from linked transactions (see
// backend/src/lib/goalProgress.ts) — never recomputed here. PLANS.md §2–3:
// an icon, an initial amount, one-off "Abonar" and a periodic "Aporte".
interface BackendPlan {
  amount: number
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  accountId: string
  startDate: string
  endMode: 'GOAL' | 'COUNT' | 'DATE'
  count: number | null
  endDate: string | null
  autoConfirm: boolean
  nextDate: string
  doneCount: number
  active: boolean
  due: boolean
}

interface BackendGoal {
  id: string
  name: string
  icon: string | null
  targetAmount: number
  initialAmount: number
  currentAmount: number
  remaining: number
  percentage: number
  targetDate: string | null
  plan: BackendPlan | null
  contributions?: { accountId: string; amount: number }[]
}

function mapPlan(plan: BackendPlan): GoalPlan {
  return {
    amount: plan.amount,
    frequency: plan.frequency.toLowerCase() as GoalPlan['frequency'],
    accountId: plan.accountId,
    startDate: plan.startDate.slice(0, 10),
    endMode: plan.endMode.toLowerCase() as GoalPlan['endMode'],
    count: plan.count ?? undefined,
    endDate: plan.endDate?.slice(0, 10),
    autoConfirm: plan.autoConfirm,
    nextDate: plan.nextDate.slice(0, 10),
    doneCount: plan.doneCount,
    active: plan.active,
    due: plan.due,
  }
}

function mapGoal(goal: BackendGoal): Goal {
  return {
    id: goal.id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    remaining: goal.remaining,
    percentage: goal.percentage,
    icon: goal.icon ?? 'other',
    initialAmount: goal.initialAmount ?? 0,
    targetDate: goal.targetDate?.slice(0, 10),
    plan: goal.plan && goal.plan.active ? mapPlan(goal.plan) : undefined,
    contributions: goal.contributions ?? [],
  }
}

export interface GoalInput {
  name: string
  icon: string
  targetAmount: number
  initialAmount: number
  targetDate?: string | null
}

export interface GoalPlanInput {
  amount: number
  frequency: GoalPlan['frequency']
  accountId: string
  startDate: string
  endMode: GoalPlan['endMode']
  count?: number
  endDate?: string
  autoConfirm: boolean
}

export const goalService = {
  async getGoals(today: string = todayISO()): Promise<Goal[]> {
    const goals = await apiClient.get<BackendGoal[]>(`/goals?today=${today}`)
    return goals.map(mapGoal)
  },

  async createGoal(input: GoalInput): Promise<Goal> {
    return mapGoal(await apiClient.post<BackendGoal>('/goals', { ...input, targetDate: input.targetDate ?? undefined }))
  },

  async updateGoal(id: string, input: GoalInput): Promise<Goal> {
    return mapGoal(await apiClient.patch<BackendGoal>(`/goals/${id}`, input))
  },

  // "Abonar": a one-off contribution from a wallet.
  async contribute(id: string, input: { amount: number; accountId: string; date?: string }): Promise<Goal> {
    return mapGoal(await apiClient.post<BackendGoal>(`/goals/${id}/contribute`, input))
  },

  async setPlan(id: string, plan: GoalPlanInput): Promise<Goal> {
    return mapGoal(
      await apiClient.put<BackendGoal>(`/goals/${id}/plan`, {
        ...plan,
        frequency: plan.frequency.toUpperCase(),
        endMode: plan.endMode.toUpperCase(),
        count: plan.endMode === 'count' ? plan.count : undefined,
        endDate: plan.endMode === 'date' ? plan.endDate : undefined,
      }),
    )
  },

  async removePlan(id: string): Promise<Goal> {
    return mapGoal(await apiClient.delete<BackendGoal>(`/goals/${id}/plan`))
  },

  // "Confirmar aporte" / "Omitir esta vez" on a due contribution.
  async confirmPlan(id: string): Promise<Goal> {
    return mapGoal(await apiClient.post<BackendGoal>(`/goals/${id}/plan/confirm`, {}))
  },

  async skipPlan(id: string): Promise<Goal> {
    return mapGoal(await apiClient.post<BackendGoal>(`/goals/${id}/plan/skip`, {}))
  },

  // A goal holding money needs a destination: one wallet, or `origin` to
  // give every contributing wallet its own share back.
  async deleteGoal(id: string, returnTo?: { accountId: string } | 'origin'): Promise<void> {
    const body = returnTo === 'origin' ? { returnToOrigin: true } : returnTo ? { returnToAccountId: returnTo.accountId } : {}
    await apiClient.delete(`/goals/${id}`, body)
  },
}
