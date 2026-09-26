import { monthlyIncomeTarget } from '@/data/budgets'
import { apiClient } from '@/lib/apiClient'
import { categoryIdFor, categorySlugFor } from '@/lib/backendCategories'
import { currentMonthKey } from '@/lib/date'
import type { BudgetKind, BudgetPeriod, CategoryBudget, CategoryId } from '@/types'

// Budget progress (spent/remaining/percentage/status) is computed by the
// backend (backend/src/lib/budgetProgress.ts) and never recomputed here,
// same rule Android follows. PLANS.md §4: CATEGORY budgets (a category +
// wallet set, linked automatically) and CUSTOM ones (an icon, picked
// manually in Nuevo movimiento).
interface BackendBudget {
  id: string
  name: string | null
  kind: 'CATEGORY' | 'CUSTOM'
  categoryId: string | null
  icon: string | null
  walletIds: string[]
  period: 'MONTHLY' | 'WEEKLY' | 'CUSTOM'
  startDate: string | null
  endDate: string | null
  amount: number
  spent: number
  remaining: number
  percentage: number
  status: 'ON_TRACK' | 'AT_RISK' | 'NEAR_LIMIT' | 'OVER_BUDGET'
  assignedCount: number | null
  month: string
}

export interface BudgetProgress extends CategoryBudget {
  spent: number
  remaining: number
  percentage: number
  status: 'on_track' | 'at_risk' | 'near_limit' | 'over_budget'
}

export interface BudgetDraft {
  kind: BudgetKind
  name?: string | null
  category?: CategoryId
  icon?: string
  walletIds: string[]
  limit: number
  period: BudgetPeriod
  startDate?: string
  endDate?: string
}

async function mapBudget(budget: BackendBudget): Promise<BudgetProgress> {
  return {
    id: budget.id,
    kind: budget.kind === 'CUSTOM' ? 'custom' : 'category',
    name: budget.name ?? undefined,
    category: budget.categoryId ? await categorySlugFor(budget.categoryId) : undefined,
    icon: budget.icon ?? undefined,
    walletIds: budget.walletIds ?? [],
    period: (budget.period ?? 'MONTHLY').toLowerCase() as BudgetPeriod,
    startDate: budget.startDate?.slice(0, 10),
    endDate: budget.endDate?.slice(0, 10),
    limit: budget.amount,
    month: budget.month,
    assignedCount: budget.assignedCount ?? undefined,
    spent: budget.spent,
    remaining: budget.remaining,
    percentage: budget.percentage,
    status: budget.status.toLowerCase() as BudgetProgress['status'],
  }
}

async function wire(input: BudgetDraft) {
  return {
    kind: input.kind.toUpperCase(),
    name: input.name,
    categoryId: input.kind === 'category' && input.category ? await categoryIdFor(input.category) : undefined,
    icon: input.kind === 'custom' ? input.icon : undefined,
    walletIds: input.walletIds,
    amount: input.limit,
    period: input.period.toUpperCase(),
    startDate: input.period === 'custom' ? input.startDate : undefined,
    endDate: input.period === 'custom' ? input.endDate : undefined,
  }
}

export const budgetService = {
  async getBudgets(month: string = currentMonthKey()): Promise<BudgetProgress[]> {
    const budgets = await apiClient.get<BackendBudget[]>(`/budgets?month=${month}`)
    return Promise.all(budgets.map(mapBudget))
  },

  async createBudget(input: BudgetDraft): Promise<BudgetProgress> {
    const row = await apiClient.post<BackendBudget>('/budgets', { ...(await wire(input)), month: currentMonthKey() })
    return mapBudget(row)
  },

  // The kind is fixed once created.
  async updateBudget(id: string, input: BudgetDraft): Promise<BudgetProgress> {
    const { kind: _kind, ...body } = await wire(input)
    const row = await apiClient.patch<BackendBudget>(`/budgets/${id}`, body)
    return mapBudget(row)
  },

  async deleteBudget(id: string): Promise<void> {
    await apiClient.delete(`/budgets/${id}`)
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
