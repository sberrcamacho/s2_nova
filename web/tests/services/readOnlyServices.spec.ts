import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { accountService } from '@/services/accountService'
import { goalService } from '@/services/goalService'
import { budgetService } from '@/services/budgetService'
import { recurringService } from '@/services/recurringService'
import { resetCategoryCache } from '@/lib/backendCategories'

const BASE = 'http://test.local/api/v1'
const CATEGORIES = [{ id: 'uuid-food', slug: 'food' }]

describe('accountService', () => {
  it('collapses backend wallet subtypes that Web has no distinct type for (BANK_CREDIT -> bank, NEQUI -> other)', async () => {
    server.use(
      http.get(`${BASE}/accounts`, () =>
        HttpResponse.json([
          { id: 'a1', name: 'Card', type: 'BANK_CREDIT', initialBalance: 0, currentBalance: -50_000 },
          { id: 'a2', name: 'Nequi', type: 'NEQUI', initialBalance: 0, currentBalance: 100_000 },
        ]),
      ),
    )
    const wallets = await accountService.getWallets()
    expect(wallets.map((w) => w.type)).toEqual(['bank', 'other'])
  })
})

describe('goalService', () => {
  it('maps a goal and truncates targetDate to a date-only string, never recomputing progress client-side', async () => {
    server.use(
      http.get(`${BASE}/goals`, () =>
        HttpResponse.json([{ id: 'g1', name: 'Trip', targetAmount: 500_000, currentAmount: 125_000, targetDate: '2026-12-01T00:00:00.000Z' }]),
      ),
    )
    const [goal] = await goalService.getGoals()
    expect(goal).toMatchObject({ targetAmount: 500_000, currentAmount: 125_000, targetDate: '2026-12-01' })
  })
})

describe('budgetService', () => {
  afterEach(() => resetCategoryCache())

  it('maps backend status/casing to Web\'s lowercase status and resolves the category slug', async () => {
    server.use(
      http.get(`${BASE}/categories`, () => HttpResponse.json(CATEGORIES)),
      http.get(`${BASE}/budgets`, () =>
        HttpResponse.json([
          { id: 'b1', name: 'Groceries', categoryId: 'uuid-food', amount: 300_000, spent: 320_000, remaining: -20_000, percentage: 107, status: 'OVER_BUDGET', month: '2026-06' },
        ]),
      ),
    )
    const [budget] = await budgetService.getBudgets('2026-06')
    expect(budget).toMatchObject({ category: 'food', status: 'over_budget', percentage: 107 })
  })

  it('getOverallBudgetSummary aggregates limit/spent across every budget for the month', async () => {
    server.use(
      http.get(`${BASE}/categories`, () => HttpResponse.json(CATEGORIES)),
      http.get(`${BASE}/budgets`, () =>
        HttpResponse.json([
          { id: 'b1', name: null, categoryId: 'uuid-food', amount: 200_000, spent: 100_000, remaining: 100_000, percentage: 50, status: 'ON_TRACK', month: '2026-06' },
          { id: 'b2', name: null, categoryId: 'uuid-food', amount: 100_000, spent: 100_000, remaining: 0, percentage: 100, status: 'OVER_BUDGET', month: '2026-06' },
        ]),
      ),
    )
    const summary = await budgetService.getOverallBudgetSummary('2026-06')
    expect(summary).toMatchObject({ totalLimit: 300_000, totalSpent: 200_000, totalRemaining: 100_000, percentage: 67 })
  })
})

describe('recurringService', () => {
  it('maps interval casing and resolves the category slug per series', async () => {
    server.use(
      http.get(`${BASE}/categories`, () => HttpResponse.json(CATEGORIES)),
      http.get(`${BASE}/recurring-series`, () =>
        HttpResponse.json([
          { id: 'r1', name: 'Netflix', type: 'EXPENSE', amount: 45_000, accountId: 'acc1', categoryId: 'uuid-food', interval: 'MONTHLY', nextOccurrenceDate: '2026-07-01T00:00:00.000Z', isDue: true, active: true },
        ]),
      ),
    )
    const [series] = await recurringService.getRecurringSeries()
    expect(series).toMatchObject({ type: 'expense', interval: 'monthly', category: 'food', nextOccurrenceDate: '2026-07-01', isDue: true })
  })
})
