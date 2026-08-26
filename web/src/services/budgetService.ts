import { monthlyIncomeTarget } from '@/data/budgets'
import { apiClient } from '@/lib/apiClient'
import { categorySlugFor } from '@/lib/backendCategories'
import { currentMonthKey } from '@/lib/date'
import type { CategoryBudget, CategoryId } from '@/types'

// Read-only by design: creating/editing budgets is Android's job
// (micro-management) — Web (macro-analysis) only ever reads budget
// progress, which the backend computes server-side (spent/remaining/
// percentage/status — see backend/src/routes/budgets.ts's serializeBudget)
// and is never recomputed here, same rule Android follows.
interface BackendBudget {
  id: string
  name: string | null
  categoryId: string
  amount: number
  spent: number
  remaining: number
  percentage: number
  status: 'ON_TRACK' | 'NEAR_LIMIT' | 'OVER_BUDGET'
  month: string
}

export interface BudgetProgress extends CategoryBudget {
  spent: number
  remaining: number
  percentage: number
  status: 'on_track' | 'near_limit' | 'over_budget'
}

const STATUS_MAP: Record<BackendBudget['status'], BudgetProgress['status']> = {
  ON_TRACK: 'on_track',
  NEAR_LIMIT: 'near_limit',
  OVER_BUDGET: 'over_budget',
}

async function mapBudget(budget: BackendBudget): Promise<BudgetProgress> {
  return {
    id: budget.id,
    name: budget.name ?? undefined,
    category: await categorySlugFor(budget.categoryId),
    limit: budget.amount,
    month: budget.month,
    spent: budget.spent,
    remaining: budget.remaining,
    percentage: budget.percentage,
    status: STATUS_MAP[budget.status],
  }
}

export const budgetService = {
  async getBudgets(month: string = currentMonthKey()): Promise<BudgetProgress[]> {
    const budgets = await apiClient.get<BackendBudget[]>(`/budgets?month=${month}`)
    return Promise.all(budgets.map(mapBudget))
  },

  async getBudgetByCategory(category: CategoryId, month: string = currentMonthKey()): Promise<BudgetProgress | undefined> {
    const budgets = await budgetService.getBudgets(month)
    return budgets.find((b) => b.category === category)
  },

  async getOverallBudgetSummary(month: string = currentMonthKey()) {
    const progress = await budgetService.getBudgets(month)
    const totalLimit = progress.reduce((s, b) => s + b.limit, 0)
    const totalSpent = progress.reduce((s, b) => s + b.spent, 0)
    return {
      totalLimit,
      totalSpent,
      totalRemaining: totalLimit - totalSpent,
      percentage: totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0,
      monthlyIncomeTarget,
    }
  },
}
