import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { transactionService } from '@/services/transactionService'
import { resetCategoryCache } from '@/lib/backendCategories'

const BASE = 'http://test.local/api/v1'
const CATEGORIES = [
  { id: 'uuid-food', slug: 'food' },
  { id: 'uuid-salary', slug: 'salary' },
]

const BACKEND_ROW = {
  id: 't1',
  accountId: 'acc1',
  transferToAccountId: null,
  type: 'EXPENSE' as const,
  status: 'PLANNED' as const,
  amount: 15000,
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
  description: 'Lunch',
  merchant: 'Cafe',
  note: null,
  date: '2026-06-10T00:00:00.000Z',
}

function mockCategories() {
  server.use(http.get(`${BASE}/categories`, () => HttpResponse.json(CATEGORIES)))
}

describe('transactionService', () => {
  afterEach(() => resetCategoryCache())

  it('maps the backend wire shape (uppercase enums, categoryId) to Web domain casing', async () => {
    mockCategories()
    server.use(http.get(`${BASE}/transactions`, () => HttpResponse.json([BACKEND_ROW])))
    const [txn] = await transactionService.getTransactions()
    expect(txn).toMatchObject({
      id: 't1',
      type: 'expense',
      status: 'planned',
      category: 'food',
      paymentMethod: 'cash',
      date: '2026-06-10',
    })
  })

  it('addTransaction uppercases type/status/loanKind and resolves the category slug to its backend id', async () => {
    mockCategories()
    let body: Record<string, unknown> = {}
    server.use(
      http.post(`${BASE}/transactions`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...BACKEND_ROW, categoryId: 'uuid-salary', type: 'INCOME', status: 'COMPLETED' })
      }),
    )
    await transactionService.addTransaction({
      accountId: 'acc1',
      description: 'Paycheck',
      amount: 500000,
      type: 'income',
      category: 'salary',
      date: '2026-06-01',
      paymentMethod: 'bank_transfer',
    })
    expect(body).toMatchObject({ type: 'INCOME', status: 'COMPLETED', categoryId: 'uuid-salary' })
  })

  it('filters by paymentMethod client-side since the backend has no such query param', async () => {
    mockCategories()
    server.use(
      http.get(`${BASE}/transactions`, () =>
        HttpResponse.json([BACKEND_ROW, { ...BACKEND_ROW, id: 't2', paymentMethod: 'NEQUI' }]),
      ),
    )
    const result = await transactionService.getTransactions({ paymentMethod: 'nequi' })
    expect(result.map((t) => t.id)).toEqual(['t2'])
  })

  it('a filtered getTransactions call does not touch the _snapshot cache; only an unfiltered one does', async () => {
    mockCategories()
    server.use(http.get(`${BASE}/transactions`, () => HttpResponse.json([BACKEND_ROW])))
    await transactionService.getTransactions()
    const before = transactionService._snapshot()
    expect(before).toHaveLength(1)

    server.use(http.get(`${BASE}/transactions`, () => HttpResponse.json([BACKEND_ROW, { ...BACKEND_ROW, id: 't2' }])))
    await transactionService.getTransactions({ category: 'food' })
    expect(transactionService._snapshot()).toBe(before)

    await transactionService.getTransactions()
    expect(transactionService._snapshot()).toHaveLength(2)
  })

  it('getTransactionById reads from the cached snapshot before hitting the network again', async () => {
    mockCategories()
    let calls = 0
    server.use(
      http.get(`${BASE}/transactions`, () => {
        calls++
        return HttpResponse.json([BACKEND_ROW])
      }),
    )
    await transactionService.getTransactions()
    expect(calls).toBe(1)
    const found = await transactionService.getTransactionById('t1')
    expect(found?.id).toBe('t1')
    expect(calls).toBe(1)
  })

  it('resolves an explicit dateFrom/dateTo range over a monthKey when both are given', async () => {
    mockCategories()
    let query = ''
    server.use(
      http.get(`${BASE}/transactions`, ({ request }) => {
        query = new URL(request.url).search
        return HttpResponse.json([])
      }),
    )
    await transactionService.getTransactions({ monthKey: '2026-06', dateFrom: '2026-06-05', dateTo: '2026-06-10' })
    expect(query).toContain('from=2026-06-05')
    expect(query).toContain('to=2026-06-10')
  })
})
