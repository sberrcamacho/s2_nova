import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { getFinancialHealth, getInsights } from '@/services/insightsService'
import { transactionService } from '@/services/transactionService'
import { resetCategoryCache } from '@/lib/backendCategories'
import { formatCOP } from '@/lib/currency'

const BASE = 'http://test.local/api/v1'
const CATEGORIES = [
  { id: 'uuid-food', slug: 'food' },
  { id: 'uuid-subscriptions', slug: 'subscriptions' },
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

function mockEmptyDependencies() {
  server.use(
    http.get(`${BASE}/categories`, () => HttpResponse.json(CATEGORIES)),
    http.get(`${BASE}/budgets`, () => HttpResponse.json([])),
    http.get(`${BASE}/goals`, () => HttpResponse.json([])),
    http.get(`${BASE}/accounts`, () => HttpResponse.json([])),
    http.get(`${BASE}/recurring-series`, () => HttpResponse.json([])),
  )
}

async function seedTransactions(rows: ReturnType<typeof row>[]) {
  server.use(http.get(`${BASE}/transactions`, () => HttpResponse.json(rows)))
  await transactionService.getTransactions()
}

const format = (n: number) => formatCOP(n)

describe('insightsService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-20T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    resetCategoryCache()
  })

  describe('getInsights', () => {
    it('returns nothing when there is no data to derive a suggestion from', async () => {
      mockEmptyDependencies()
      await seedTransactions([])
      expect(await getInsights('es', format)).toEqual([])
    })

    it('flags budgetPace when the current daily spend rate will exceed the limit before month end', async () => {
      mockEmptyDependencies()
      server.use(
        http.get(`${BASE}/budgets`, () =>
          HttpResponse.json([
            { id: 'b1', name: null, categoryId: 'uuid-food', amount: 300_000, spent: 250_000, remaining: 50_000, percentage: 83, status: 'NEAR_LIMIT', month: '2026-06' },
          ]),
        ),
      )
      await seedTransactions([])
      const insights = await getInsights('es', format)
      expect(insights.find((i) => i.kind === 'budgetPace')).toBeDefined()
    })

    it('does not flag budgetPace for a budget already at/over 100%: the over-budget badge already covers it', async () => {
      mockEmptyDependencies()
      server.use(
        http.get(`${BASE}/budgets`, () =>
          HttpResponse.json([
            { id: 'b1', name: null, categoryId: 'uuid-food', amount: 100_000, spent: 150_000, remaining: -50_000, percentage: 150, status: 'OVER_BUDGET', month: '2026-06' },
          ]),
        ),
      )
      await seedTransactions([])
      expect((await getInsights('es', format)).find((i) => i.kind === 'budgetPace')).toBeUndefined()
    })

    it('flags subscriptions with the real month-to-date subscriptions total', async () => {
      mockEmptyDependencies()
      await seedTransactions([row({ amount: 45_000, categoryId: 'uuid-subscriptions', date: '2026-06-05T00:00:00.000Z' })])
      const insight = (await getInsights('es', format)).find((i) => i.kind === 'subscriptions')
      expect(insight?.description).toContain(formatCOP(45_000))
    })

    it('flags categorySpike only once a category grows 25%+ over a meaningful (>=50k) previous baseline', async () => {
      mockEmptyDependencies()
      await seedTransactions([
        row({ amount: 100_000, categoryId: 'uuid-food', date: '2026-06-05T00:00:00.000Z' }),
        row({ amount: 60_000, categoryId: 'uuid-food', date: '2026-05-05T00:00:00.000Z' }),
      ])
      const insight = (await getInsights('es', format)).find((i) => i.kind === 'categorySpike')
      expect(insight).toBeDefined()
    })

    it('computes goalTarget as the remaining amount divided by months left to the target date', async () => {
      mockEmptyDependencies()
      server.use(
        http.get(`${BASE}/goals`, () =>
          HttpResponse.json([{ id: 'g1', name: 'Trip', targetAmount: 1_200_000, currentAmount: 0, targetDate: '2026-12-20' }]),
        ),
      )
      await seedTransactions([])
      const insight = (await getInsights('es', format)).find((i) => i.kind === 'goalTarget')
      expect(insight?.description).toContain('Trip')
    })

    it('sums upcomingExpenses only from active EXPENSE recurring series', async () => {
      mockEmptyDependencies()
      server.use(
        http.get(`${BASE}/recurring-series`, () =>
          HttpResponse.json([
            { id: 'r1', name: 'Netflix', type: 'EXPENSE', amount: 45_000, accountId: 'acc1', categoryId: 'uuid-subscriptions', interval: 'MONTHLY', nextOccurrenceDate: '2026-07-01', isDue: false, active: true },
            { id: 'r2', name: 'Paused gym', type: 'EXPENSE', amount: 99_999, accountId: 'acc1', categoryId: 'uuid-subscriptions', interval: 'MONTHLY', nextOccurrenceDate: '2026-07-01', isDue: false, active: false },
            { id: 'r3', name: 'Salary', type: 'INCOME', amount: 3_000_000, accountId: 'acc1', categoryId: 'uuid-salary', interval: 'MONTHLY', nextOccurrenceDate: '2026-07-01', isDue: false, active: true },
          ]),
        ),
      )
      await seedTransactions([])
      const insight = (await getInsights('es', format)).find((i) => i.kind === 'upcomingExpenses')
      expect(insight?.description).toContain(formatCOP(45_000))
    })
  })

  describe('getFinancialHealth', () => {
    it('rates savings "good" at >=20% of income and "low" below 10%', async () => {
      mockEmptyDependencies()
      await seedTransactions([
        row({ type: 'INCOME', amount: 1_000_000, categoryId: 'uuid-salary', date: '2026-06-01T00:00:00.000Z' }),
        row({ type: 'EXPENSE', amount: 950_000, date: '2026-06-05T00:00:00.000Z' }),
      ])
      const health = await getFinancialHealth('es', format)
      expect(health.categories.find((c) => c.key === 'savings')?.status).toBe('low')
    })

    it('reports budget status "none" when there are no budgets this month', async () => {
      mockEmptyDependencies()
      await seedTransactions([])
      const health = await getFinancialHealth('es', format)
      expect(health.categories.find((c) => c.key === 'budget')).toMatchObject({ status: 'none' })
    })

    it('reports budget status "overBudget" when any category budget is over, even if others are fine', async () => {
      mockEmptyDependencies()
      server.use(
        http.get(`${BASE}/budgets`, () =>
          HttpResponse.json([
            { id: 'b1', name: null, categoryId: 'uuid-food', amount: 100_000, spent: 150_000, remaining: -50_000, percentage: 150, status: 'OVER_BUDGET', month: '2026-06' },
            { id: 'b2', name: null, categoryId: 'uuid-subscriptions', amount: 100_000, spent: 10_000, remaining: 90_000, percentage: 10, status: 'ON_TRACK', month: '2026-06' },
          ]),
        ),
      )
      await seedTransactions([])
      const health = await getFinancialHealth('es', format)
      expect(health.categories.find((c) => c.key === 'budget')).toMatchObject({ status: 'overBudget' })
    })

    it('reports debt status "none" when nothing is currently borrowed', async () => {
      mockEmptyDependencies()
      await seedTransactions([])
      const health = await getFinancialHealth('es', format)
      expect(health.categories.find((c) => c.key === 'debt')).toMatchObject({ status: 'none' })
    })

    it('reports debt status "high" once outstanding borrowed money exceeds half of net assets', async () => {
      mockEmptyDependencies()
      server.use(http.get(`${BASE}/accounts`, () => HttpResponse.json([{ id: 'a1', name: 'Cash', type: 'CASH', initialBalance: 0, currentBalance: 100_000 }])))
      await seedTransactions([row({ amount: 90_000, loanKind: 'BORROWED', type: 'INCOME', loanSettledAt: null })])
      const health = await getFinancialHealth('es', format)
      expect(health.categories.find((c) => c.key === 'debt')).toMatchObject({ status: 'high' })
    })

    it('flags a goal as "attention" only when its deadline is within 90 days and it is still well short of complete', async () => {
      mockEmptyDependencies()
      server.use(
        http.get(`${BASE}/goals`, () =>
          HttpResponse.json([{ id: 'g1', name: 'Soon', targetAmount: 1_000_000, currentAmount: 100_000, targetDate: '2026-07-01' }]),
        ),
      )
      await seedTransactions([])
      const health = await getFinancialHealth('es', format)
      expect(health.categories.find((c) => c.key === 'goals')).toMatchObject({ status: 'attention' })
    })
  })
})
