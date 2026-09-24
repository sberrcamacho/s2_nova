import { monthlyIncomeTarget } from '@/data/budgets'
import { apiClient } from '@/lib/apiClient'
import { categoryIdFor, categorySlugFor } from '@/lib/backendCategories'
import { currentMonthKey } from '@/lib/date'
import type { CategoryBudget, CategoryId } from '@/types'

// Budget progress (spent/remaining/percentage/status) is computed by the
// backend (backend/src/routes/budgets.ts's serializeBudget) and never
// recomputed here, same rule Android follows. Writes mirror Android's
// Presupuestos sheet: one budget per category and month (409 otherwise).
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

  async createBudget(input: { name?: string; category: CategoryId; limit: number }): Promise<BudgetProgress> {
    const row = await apiClient.post<BackendBudget>('/budgets', {
      name: input.name,
      categoryId: await categoryIdFor(input.category),
      amount: input.limit,
      month: currentMonthKey(),
    })
    return mapBudget(row)
  },

  // `name: null` clears a custom name; `category` moves the budget.
  async updateBudget(id: string, input: { name: string | null; category?: CategoryId; limit: number }): Promise<BudgetProgress> {
    const row = await apiClient.patch<BackendBudget>(`/budgets/${id}`, {
      name: input.name,
      amount: input.limit,
      categoryId: input.category ? await categoryIdFor(input.category) : undefined,
    })
    return mapBudget(row)
  },

  async deleteBudget(id: string): Promise<void> {
    await apiClient.delete(`/budgets/${id}`)
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
