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
}
