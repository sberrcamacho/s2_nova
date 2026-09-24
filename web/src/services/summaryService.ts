import { apiClient } from '@/lib/apiClient'
import { categorySlugFor } from '@/lib/backendCategories'
import { todayISO } from '@/lib/date'
import type { CategoryId } from '@/types'

// Server-side monthly aggregates (backend/src/routes/summary.ts) — the same
// figures Android's Inicio shows. Never re-derived from the client's
// partial page of transactions.

export interface MonthTotals {
  month: string // YYYY-MM
  income: number
  expenses: number
  net: number
}

export interface CategorySpend {
  category: CategoryId
  amount: number
  percentage: number // whole-number share of the month's spending
}

export interface CategorySummary {
  month: string
  total: number
  categories: CategorySpend[]
}

interface BackendCategorySummary {
  month: string
  total: number
  categories: { categoryId: string; amount: number; percentage: number }[]
}

export const summaryService = {
  // Oldest month first; the current month (by the user's local date) last.
  async getMonths(count = 6, today: string = todayISO()): Promise<MonthTotals[]> {
    return apiClient.get<MonthTotals[]>(`/summary/months?count=${count}&today=${today}`)
  },

  // This month's spending per category, largest first.
  async getCategories(today: string = todayISO()): Promise<CategorySummary> {
    const body = await apiClient.get<BackendCategorySummary>(`/summary/categories?today=${today}`)
    const categories = await Promise.all(
      body.categories.map(async (row) => ({
        category: await categorySlugFor(row.categoryId),
        amount: row.amount,
        percentage: row.percentage,
      })),
    )
    return { month: body.month, total: body.total, categories }
  },
}
