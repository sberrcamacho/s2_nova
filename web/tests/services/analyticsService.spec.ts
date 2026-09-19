import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { analyticsService } from '@/services/analyticsService'
import { transactionService } from '@/services/transactionService'
import { resetCategoryCache } from '@/lib/backendCategories'

const BASE = 'http://test.local/api/v1'
const CATEGORIES = [
  { id: 'uuid-food', slug: 'food' },
  { id: 'uuid-transportation', slug: 'transportation' },
  { id: 'uuid-salary', slug: 'salary' },
]

function row(overrides: Partial<Record<string, unknown>>) {
  return {
    id: `row-${Math.random()}`,
    accountId: 'acc1',
    transferToAccountId: null,
    type: 'EXPENSE',
    status: 'COMPLETED',
    amount: 0,
    categoryId: 'uuid-food',
    productId: null,
    budgetId: null,
    goalId: null,
    recurringSeriesId: null,
    loanKind: null,
    counterpartyName: null,
    dueDate: null,
    loanSettledAt: null,
    settledByTransactionId: null,
    paymentMethod: 'CASH',
    description: 'x',
    merchant: null,
    note: null,
    date: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

async function seedTransactions(rows: ReturnType<typeof row>[]) {
  server.use(http.get(`${BASE}/categories`, () => HttpResponse.json(CATEGORIES)))
  server.use(http.get(`${BASE}/transactions`, () => HttpResponse.json(rows)))
  await transactionService.getTransactions()
}

describe('analyticsService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    resetCategoryCache()
  })

  it('getMonthlySummary sums income/expenses and derives savings for the given month', async () => {
    await seedTransactions([
      row({ type: 'INCOME', amount: 3_000_000, categoryId: 'uuid-salary', date: '2026-06-01T00:00:00.000Z' }),
      row({ type: 'EXPENSE', amount: 500_000, date: '2026-06-05T00:00:00.000Z' }),
      row({ type: 'EXPENSE', amount: 200_000, categoryId: 'uuid-transportation', date: '2026-06-10T00:00:00.000Z' }),
      // A different month must not leak into June's totals.
      row({ type: 'INCOME', amount: 999_999, categoryId: 'uuid-salary', date: '2026-05-01T00:00:00.000Z' }),
    ])
    const summary = await analyticsService.getMonthlySummary('2026-06')
    expect(summary).toMatchObject({ income: 3_000_000, expenses: 700_000, savings: 2_300_000 })
  })

  it('getMonthlyHistory returns months oldest-to-newest ending on the current month', async () => {
    await seedTransactions([])
    const history = await analyticsService.getMonthlyHistory(3)
    expect(history.map((m) => m.month)).toEqual(['2026-04', '2026-05', '2026-06'])
  })

  it('getCategoryBreakdown computes percentages of total spend and sorts by amount descending', async () => {
    await seedTransactions([
      row({ type: 'EXPENSE', amount: 300_000, categoryId: 'uuid-food', date: '2026-06-05T00:00:00.000Z' }),
      row({ type: 'EXPENSE', amount: 100_000, categoryId: 'uuid-transportation', date: '2026-06-06T00:00:00.000Z' }),
    ])
    const breakdown = await analyticsService.getCategoryBreakdown('2026-06')
    expect(breakdown).toEqual([
      { category: 'food', amount: 300_000, percentage: 75 },
      { category: 'transportation', amount: 100_000, percentage: 25 },
    ])
  })

  it('getWeeklySpending buckets expenses into 5 week-of-month buckets by day', async () => {
    await seedTransactions([
      row({ type: 'EXPENSE', amount: 10_000, date: '2026-06-01T00:00:00.000Z' }), // day 1 -> week 0
      row({ type: 'EXPENSE', amount: 20_000, date: '2026-06-08T00:00:00.000Z' }), // day 8 -> week 1
      row({ type: 'EXPENSE', amount: 30_000, date: '2026-06-29T00:00:00.000Z' }), // day 29 -> week 4 (clamped)
    ])
    const weeks = await analyticsService.getWeeklySpending('2026-06')
    expect(weeks.map((w) => w.amount)).toEqual([10_000, 20_000, 0, 0, 30_000])
  })

  it('getSavingsTrend accumulates each month\'s savings into a running balance', async () => {
    await seedTransactions([
      row({ type: 'INCOME', amount: 100, categoryId: 'uuid-salary', date: '2026-05-01T00:00:00.000Z' }),
      row({ type: 'EXPENSE', amount: 40, date: '2026-05-02T00:00:00.000Z' }),
      row({ type: 'INCOME', amount: 100, categoryId: 'uuid-salary', date: '2026-06-01T00:00:00.000Z' }),
      row({ type: 'EXPENSE', amount: 10, date: '2026-06-02T00:00:00.000Z' }),
    ])
    const trend = await analyticsService.getSavingsTrend(2)
    expect(trend.map((t) => t.balance)).toEqual([60, 150])
  })

  it('getPeriodComparison reports pctChange as null when the previous period has no baseline', async () => {
    await seedTransactions([row({ type: 'INCOME', amount: 500_000, categoryId: 'uuid-salary', date: '2026-06-01T00:00:00.000Z' })])
    const comparison = await analyticsService.getPeriodComparison()
    const income = comparison.overall.find((e) => e.key === 'income')
    expect(income).toMatchObject({ current: 500_000, previous: 0, pctChange: null })
  })

  it('getPeriodComparison computes a real percentage change against a non-zero previous period', async () => {
    await seedTransactions([
      row({ type: 'EXPENSE', amount: 200_000, date: '2026-05-05T00:00:00.000Z' }),
      row({ type: 'EXPENSE', amount: 300_000, date: '2026-06-05T00:00:00.000Z' }),
    ])
    const comparison = await analyticsService.getPeriodComparison()
    const expenses = comparison.overall.find((e) => e.key === 'expenses')
    expect(expenses).toMatchObject({ current: 300_000, previous: 200_000, pctChange: 50 })
  })

  it('getPeriodComparison resolves the previous month correctly across a year boundary', async () => {
    vi.setSystemTime(new Date('2026-01-15T12:00:00'))
    await seedTransactions([
      row({ type: 'EXPENSE', amount: 100_000, date: '2025-12-05T00:00:00.000Z' }),
      row({ type: 'EXPENSE', amount: 150_000, date: '2026-01-05T00:00:00.000Z' }),
    ])
    const comparison = await analyticsService.getPeriodComparison()
    const expenses = comparison.overall.find((e) => e.key === 'expenses')
    expect(expenses).toMatchObject({ current: 150_000, previous: 100_000, pctChange: 50 })
  })
})
