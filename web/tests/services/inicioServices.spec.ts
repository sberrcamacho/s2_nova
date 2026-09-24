import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { summaryService } from '@/services/summaryService'
import { alertService } from '@/services/alertService'
import { recurringService } from '@/services/recurringService'
import { mapMeResponse, userService } from '@/services/userService'

const BASE = 'http://test.local/api/v1'
const CATEGORIES = [
  { id: 'uuid-food', slug: 'food' },
  { id: 'uuid-bills', slug: 'bills' },
]

describe('summaryService', () => {
  it('passes the local date and returns months oldest first as sent', async () => {
    let query = ''
    server.use(
      http.get(`${BASE}/summary/months`, ({ request }) => {
        query = new URL(request.url).search
        return HttpResponse.json([
          { month: '2026-07', income: 10, expenses: 4, net: 6 },
          { month: '2026-08', income: 20, expenses: 5, net: 15 },
        ])
      }),
    )
    const months = await summaryService.getMonths(2, '2026-08-21')
    expect(query).toBe('?count=2&today=2026-08-21')
    expect(months.map((m) => m.month)).toEqual(['2026-07', '2026-08'])
  })

  it('maps category UUIDs to slugs', async () => {
    server.use(
      http.get(`${BASE}/categories`, () => HttpResponse.json(CATEGORIES)),
      http.get(`${BASE}/summary/categories`, () =>
        HttpResponse.json({ month: '2026-08', total: 100, categories: [{ categoryId: 'uuid-food', amount: 70, percentage: 70 }] }),
      ),
    )
    const summary = await summaryService.getCategories('2026-08-21')
    expect(summary.categories).toEqual([{ category: 'food', amount: 70, percentage: 70 }])
  })
})

describe('alertService', () => {
  it('maps every rule kind in backend order and drops kinds it does not know', async () => {
    server.use(
      http.get(`${BASE}/categories`, () => HttpResponse.json(CATEGORIES)),
      http.get(`${BASE}/alerts`, () =>
        HttpResponse.json([
          { id: 'series:1:2026-08-21', kind: 'SERIES_DUE', seriesId: '1', name: 'Administración', type: 'EXPENSE', amount: 232000, categoryId: 'uuid-bills', dueDate: '2026-08-21T00:00:00.000Z', overdue: false },
          { id: 'loan:2', kind: 'LOAN_OPEN', transactionId: '2', loanKind: 'LENT', counterpartyName: 'Camilo', outstanding: 420000, dueDate: '2026-09-15T00:00:00.000Z', overdue: false },
          { id: 'budget:3:2026-08', kind: 'BUDGET_AT_RISK', budgetId: '3', name: null, categoryId: 'uuid-bills', spent: 412000, amount: 450000, percentage: 92 },
          { id: 'goal:4', kind: 'GOAL_NEAR', goalId: '4', name: 'Portátil', themeIcon: 'TECHNOLOGY', percentage: 90, remaining: 520000 },
          { id: 'x', kind: 'FUTURE_RULE' },
        ]),
      ),
    )
    const alerts = await alertService.getAlerts('2026-08-21')
    expect(alerts.map((a) => a.kind)).toEqual(['series_due', 'loan_open', 'budget_at_risk', 'goal_near'])
    expect(alerts[0]).toMatchObject({ category: 'bills', dueDate: '2026-08-21' })
    expect(alerts[1]).toMatchObject({ loanKind: 'lent', outstanding: 420000, dueDate: '2026-09-15' })
    expect(alerts[2]).toMatchObject({ limit: 450000, name: undefined })
  })
})

describe('recurringService actions', () => {
  it('confirms with the local date and skips through the backend', async () => {
    const calls: string[] = []
    server.use(
      http.post(`${BASE}/recurring-series/s1/confirm`, async ({ request }) => {
        calls.push(`confirm ${JSON.stringify(await request.json())}`)
        return HttpResponse.json({})
      }),
      http.post(`${BASE}/recurring-series/s1/skip`, () => {
        calls.push('skip')
        return HttpResponse.json({})
      }),
    )
    await recurringService.confirmOccurrence('s1', '2026-08-21')
    await recurringService.skipOccurrence('s1')
    expect(calls).toEqual(['confirm {"date":"2026-08-21"}', 'skip'])
  })
})

describe('hidden amounts preference', () => {
  it('reads and writes the shared blurBalance preference', async () => {
    const user = mapMeResponse({
      id: 'u', name: 'A', email: 'a@x.co', createdAt: '2026-01-01T00:00:00.000Z', hasPassword: true,
      preferences: { language: 'es', currency: 'COP', theme: 'SYSTEM', notifications: true, biometricLogin: false, blurBalance: true, onboardingCompleted: true, tutorialCompleted: true },
    })
    expect(user.preferences.hideAmounts).toBe(true)

    let body: unknown
    server.use(
      http.patch(`${BASE}/me/preferences`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({})
      }),
    )
    await userService.updatePreferences({ hideAmounts: false })
    expect(body).toEqual({ blurBalance: false })
  })
})
