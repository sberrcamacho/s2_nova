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

  getReport,
}

// Reportes (backend GET /summary/report): every figure both clients show,
// for a 3/6/12-month range ending with the current month.
export type ReportRange = 3 | 6 | 12

export interface ReportTotals {
  income: number
  expenses: number
  savings: number
  savingsRate: number // whole-number %
}

export interface ReportCategory {
  category: CategoryId
  amount: number
  previousAmount: number
  change: number | null // % against the previous month; null when it had none
  rising: boolean
}

export interface IncomeSource {
  category: CategoryId
  merchant: string | null
  amount: number
  percentage: number
  monthlyMin: number
  monthlyMax: number
}

export interface LoanSide {
  outstanding: number
  people: number
  settled: number
}

export interface Report {
  range: ReportRange
  month: string
  months: MonthTotals[]
  totals: ReportTotals
  previousTotals: ReportTotals
  categories: ReportCategory[]
  dailyAverage: number
  peakWeekday: number | null // 0 = Sunday
  fixedShare: number | null
  runwayMonths: number | null
  incomeSources: IncomeSource[]
  netWorth: { wallets: number; lent: LoanSide; borrowed: LoanSide; history: { month: string; balance: number }[] }
}

type BackendReport = Omit<Report, 'categories' | 'incomeSources'> & {
  categories: (Omit<ReportCategory, 'category'> & { categoryId: string })[]
  incomeSources: (Omit<IncomeSource, 'category'> & { categoryId: string })[]
}

export async function getReport(range: ReportRange, today: string = todayISO()): Promise<Report> {
  const body = await apiClient.get<BackendReport>(`/summary/report?range=${range}&today=${today}`)
  const [categories, incomeSources] = await Promise.all([
    Promise.all(body.categories.map(async ({ categoryId, ...row }) => ({ ...row, category: await categorySlugFor(categoryId) }))),
    Promise.all(body.incomeSources.map(async ({ categoryId, ...row }) => ({ ...row, category: await categorySlugFor(categoryId) }))),
  ])
  return { ...body, categories, incomeSources }
}
