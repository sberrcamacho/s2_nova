import { categoryMap } from '@/data/categories'
import { delay } from '@/lib/async'
import { currentMonthKey, isSameMonth, monthLabel } from '@/lib/date'
import { translate } from '@/lib/i18n/translations'
import { transactionService } from '@/services/transactionService'
import type { CategoryBreakdownEntry, CategoryId, LanguageCode, MonthlySummary, Transaction } from '@/types'

function lastNMonthKeys(n: number): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

function summarizeMonth(items: Transaction[], monthKey: string, language: LanguageCode): MonthlySummary {
  const monthItems = items.filter((t) => isSameMonth(t.date, monthKey))
  const income = monthItems.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = monthItems.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return { month: monthKey, label: monthLabel(monthKey, language), income, expenses, savings: income - expenses }
}

export const analyticsService = {
  async getMonthlySummary(monthKey: string = currentMonthKey(), language: LanguageCode = 'es'): Promise<MonthlySummary> {
    return delay(summarizeMonth(transactionService._snapshot(), monthKey, language))
  },

  async getMonthlyHistory(months = 6, language: LanguageCode = 'es'): Promise<MonthlySummary[]> {
    const items = transactionService._snapshot()
    return delay(lastNMonthKeys(months).map((key) => summarizeMonth(items, key, language)))
  },

  async getCategoryBreakdown(monthKey: string = currentMonthKey()): Promise<CategoryBreakdownEntry[]> {
    const items = transactionService._snapshot().filter((t) => t.type === 'expense' && isSameMonth(t.date, monthKey))
    const total = items.reduce((s, t) => s + t.amount, 0)
    const byCategory = new Map<CategoryId, number>()
    for (const t of items) {
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount)
    }
    const entries = Array.from(byCategory.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
    return delay(entries)
  },

  async getWeeklySpending(
    monthKey: string = currentMonthKey(),
    language: LanguageCode = 'es',
  ): Promise<{ label: string; amount: number }[]> {
    const items = transactionService
      ._snapshot()
      .filter((t) => t.type === 'expense' && isSameMonth(t.date, monthKey))
    const buckets = [0, 0, 0, 0, 0]
    for (const t of items) {
      const day = Number(t.date.slice(8, 10))
      const week = Math.min(4, Math.floor((day - 1) / 7))
      buckets[week] += t.amount
    }
    const weekWord = translate('common.weekShort', language)
    return delay(buckets.map((amount, i) => ({ label: `${weekWord} ${i + 1}`, amount })))
  },

  async getSavingsTrend(months = 6, language: LanguageCode = 'es'): Promise<{ month: string; label: string; balance: number }[]> {
    const history = await this.getMonthlyHistory(months, language)
    let balance = 0
    return history.map((m) => {
      balance += m.savings
      return { month: m.month, label: m.label, balance }
    })
  },

  async getTopCategories(monthKey: string = currentMonthKey(), limit = 5) {
    const breakdown = await this.getCategoryBreakdown(monthKey)
    return breakdown.slice(0, limit).map((entry) => ({
      ...entry,
      label: categoryMap[entry.category]?.label ?? entry.category,
      color: categoryMap[entry.category]?.color ?? '#9C9CAA',
      icon: categoryMap[entry.category]?.icon ?? 'CircleEllipsis',
    }))
  },

  // Actual spend for one category over the last N months — used by the
  // Budgets page's "historical performance" view. There is no historized
  // CategoryBudget record per past month in this data model (budgets are
  // only ever defined for the current month), so past months are compared
  // against today's limit as the best available proxy for "what the
  // budget would have looked like" rather than fabricating past limits.
  async getCategoryHistory(category: CategoryId, months = 6, language: LanguageCode = 'es'): Promise<MonthlySummary[]> {
    const items = transactionService._snapshot().filter((t) => t.type === 'expense' && t.category === category)
    return delay(
      lastNMonthKeys(months).map((key) => {
        const amount = items.filter((t) => isSameMonth(t.date, key)).reduce((s, t) => s + t.amount, 0)
        return { month: key, label: monthLabel(key, language), income: 0, expenses: amount, savings: -amount }
      }),
    )
  },

  // Period-over-period "what changed?" comparison — current month vs. the
  // prior month, for the headline totals and the categories that moved the
  // most. `pctChange` is null (not 0 or Infinity) when the previous period
  // had nothing to compare against, so callers never show a fabricated
  // percentage from a zero baseline.
  async getPeriodComparison(language: LanguageCode = 'es'): Promise<PeriodComparison> {
    const monthKey = currentMonthKey()
    const [y, m] = monthKey.split('-').map(Number)
    const prevDate = new Date(y!, m! - 2, 1)
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

    const items = transactionService._snapshot()
    const current = summarizeMonth(items, monthKey, language)
    const previous = summarizeMonth(items, prevMonthKey, language)
    const [currentBreakdown, prevBreakdown] = await Promise.all([
      this.getCategoryBreakdown(monthKey),
      this.getCategoryBreakdown(prevMonthKey),
    ])

    const pct = (curr: number, prev: number): number | null => (prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null)

    const overall: PeriodComparisonEntry[] = [
      { key: 'income', current: current.income, previous: previous.income, pctChange: pct(current.income, previous.income) },
      { key: 'expenses', current: current.expenses, previous: previous.expenses, pctChange: pct(current.expenses, previous.expenses) },
      { key: 'savings', current: current.savings, previous: previous.savings, pctChange: pct(current.savings, previous.savings) },
    ]

    const prevByCategory = new Map(prevBreakdown.map((e) => [e.category, e.amount]))
    const categoryChanges: CategoryComparisonEntry[] = currentBreakdown
      .map((entry) => {
        const previousAmount = prevByCategory.get(entry.category) ?? 0
        return { ...entry, previousAmount, pctChange: pct(entry.amount, previousAmount) }
      })
      .filter((entry) => entry.pctChange !== null)
      .sort((a, b) => Math.abs(b.pctChange!) - Math.abs(a.pctChange!))
      .slice(0, 3)

    return { overall, categoryChanges }
  },
}

export interface PeriodComparisonEntry {
  key: 'income' | 'expenses' | 'savings'
  current: number
  previous: number
  pctChange: number | null
}

export interface CategoryComparisonEntry extends CategoryBreakdownEntry {
  previousAmount: number
  pctChange: number | null
}

export interface PeriodComparison {
  overall: PeriodComparisonEntry[]
  categoryChanges: CategoryComparisonEntry[]
}
