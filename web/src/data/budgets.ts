import type { CategoryBudget } from '@/types'
import { currentMonthKey } from '@/lib/date'

const month = currentMonthKey()

export const budgets: CategoryBudget[] = [
  { id: 'bud_food', category: 'food', limit: 900_000, month },
  { id: 'bud_transportation', category: 'transportation', limit: 350_000, month },
  { id: 'bud_shopping', category: 'shopping', limit: 500_000, month },
  { id: 'bud_health', category: 'health', limit: 250_000, month },
  { id: 'bud_education', category: 'education', limit: 200_000, month },
  { id: 'bud_entertainment', category: 'entertainment', limit: 300_000, month },
  { id: 'bud_bills', category: 'bills', limit: 650_000, month },
  { id: 'bud_subscriptions', category: 'subscriptions', limit: 130_000, month },
]

export const monthlyIncomeTarget = 4_800_000
