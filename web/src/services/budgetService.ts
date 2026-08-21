import { budgets as seedBudgets, monthlyIncomeTarget } from '@/data/budgets'
import { delay } from '@/lib/async'
import { currentMonthKey, isSameMonth } from '@/lib/date'
import { transactionService } from '@/services/transactionService'
import type { CategoryBudget, CategoryId } from '@/types'

// Read-only by design: creating/editing budgets is Android's job
// (micro-management) — Web (macro-analysis) only ever reads budget
// progress. See root AGENTS.md's Android/Web responsibility split.
let store: CategoryBudget[] = [...seedBudgets]

export interface BudgetProgress extends CategoryBudget {
  spent: number
  remaining: number
  percentage: number
  status: 'on_track' | 'near_limit' | 'over_budget'
}

// A transaction contributes to a budget either by direct link
// (transaction.budgetId === budget.id) or, absent that, by the legacy
// category+month match — mirrors backend/src/routes/budgets.ts
// `computeSpent` so a transaction never double-counts.
function computeProgress(budget: CategoryBudget): BudgetProgress {
  const spent = transactionService
    ._snapshot()
    .filter(
      (t) =>
        t.type === 'expense' &&
        (t.budgetId ? t.budgetId === budget.id : t.category === budget.category && isSameMonth(t.date, budget.month)),
    )
    .reduce((sum, t) => sum + t.amount, 0)

  const percentage = budget.limit > 0 ? Math.min(999, Math.round((spent / budget.limit) * 100)) : 0
  const status: BudgetProgress['status'] = percentage >= 100 ? 'over_budget' : percentage >= 80 ? 'near_limit' : 'on_track'

  return { ...budget, spent, remaining: budget.limit - spent, percentage, status }
}

export const budgetService = {
  async getBudgets(month: string = currentMonthKey()): Promise<BudgetProgress[]> {
    return delay(store.filter((b) => b.month === month).map(computeProgress))
  },

  async getBudgetByCategory(category: CategoryId, month: string = currentMonthKey()): Promise<BudgetProgress | undefined> {
    const budget = store.find((b) => b.category === category && b.month === month)
    return delay(budget ? computeProgress(budget) : undefined)
  },

  async getOverallBudgetSummary(month: string = currentMonthKey()) {
    const progress = store.filter((b) => b.month === month).map(computeProgress)
    const totalLimit = progress.reduce((s, b) => s + b.limit, 0)
    const totalSpent = progress.reduce((s, b) => s + b.spent, 0)
    return delay({
      totalLimit,
      totalSpent,
      totalRemaining: totalLimit - totalSpent,
      percentage: totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0,
      monthlyIncomeTarget,
    })
  },
}
