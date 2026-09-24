import { describe, expect, it } from 'vitest'
import {
  budgetNote,
  budgetTone,
  goalEta,
  guessCategory,
  nextOccurrenceAfter,
  pruneDismissed,
  upcomingWithin,
  walletKind,
} from '@/lib/inicio'
import type { Goal, RecurringSeries, Transaction } from '@/types'

const series = (over: Partial<RecurringSeries>): RecurringSeries => ({
  id: 's',
  name: 'S',
  type: 'expense',
  amount: 1000,
  accountId: 'a1',
  category: 'bills',
  interval: 'monthly',
  nextOccurrenceDate: '2026-08-24',
  isDue: false,
  active: true,
  ...over,
})

describe('upcomingWithin (Próximos 14 días)', () => {
  it('puts due-today and overdue first dated today, skips paused/far items, and runs the balance', () => {
    const list = upcomingWithin(
      [
        series({ id: 'netflix', amount: 45_000, nextOccurrenceDate: '2026-08-24' }),
        series({ id: 'admin', amount: 232_000, nextOccurrenceDate: '2026-08-21' }),
        series({ id: 'salary', type: 'income', amount: 4_400_000, nextOccurrenceDate: '2026-09-01' }),
        series({ id: 'late', amount: 10_000, nextOccurrenceDate: '2026-08-19' }),
        series({ id: 'paused', active: false, nextOccurrenceDate: '2026-08-22' }),
        series({ id: 'far', nextOccurrenceDate: '2026-09-10' }),
      ],
      '2026-08-21',
      16_147_300,
    )
    expect(list.map((e) => e.series.id)).toEqual(['late', 'admin', 'netflix', 'salary'])
    expect(list[0]).toMatchObject({ dueToday: true, date: '2026-08-21' })
    expect(list.map((e) => e.running)).toEqual([16_137_300, 15_905_300, 15_860_300, 20_260_300])
  })
})

describe('budgets', () => {
  it('uses the shared ≥90 / ≥65 tone rule', () => {
    expect([budgetTone(94), budgetTone(90), budgetTone(68), budgetTone(64)]).toEqual(['neg', 'neg', 'warn', 'pos'])
  })

  it('projects the month pace into a note', () => {
    // $412.000 of $450.000 by day 21 of a 31-day month → crosses the limit in 2 days
    expect(budgetNote(412_000, 450_000, 92, '2026-08-21')).toEqual({ kind: 'exceeds', days: 2 })
    expect(budgetNote(600_000, 900_000, 67, '2026-08-21')).toEqual({ kind: 'closes', amount: 890_000 })
    expect(budgetNote(88_000, 300_000, 29, '2026-08-21')).toEqual({ kind: 'relaxed' })
    expect(budgetNote(500, 400, 125, '2026-08-21')).toEqual({ kind: 'over', amount: 100 })
  })
})

describe('goalEta', () => {
  const goal: Goal = { id: 'g', name: 'Viaje', targetAmount: 1_000_000, currentAmount: 400_000, remaining: 600_000, percentage: 40 }
  const contribution = (date: string, amount: number): Transaction => ({
    id: date, accountId: 'a', description: 'Aporte', amount, type: 'expense', category: 'other', date, paymentMethod: 'cash', goalId: 'g',
  })

  it('refuses to estimate with fewer than two contribution months', () => {
    expect(goalEta(goal, [contribution('2026-08-02', 400_000)], '2026-08-21')).toEqual({ kind: 'insufficient' })
  })

  it('averages contributions per month since the first one', () => {
    // 400.000 over Jul–Aug = 200.000/month → 3 more months
    const eta = goalEta(goal, [contribution('2026-07-05', 200_000), contribution('2026-08-05', 200_000)], '2026-08-21')
    expect(eta).toEqual({ kind: 'estimate', month: '2026-11' })
  })

  it('reports a finished goal', () => {
    expect(goalEta({ ...goal, remaining: 0 }, [], '2026-08-21')).toEqual({ kind: 'done' })
  })
})

describe('misc helpers', () => {
  it('prunes dismissed ids to live alerts only', () => {
    expect(pruneDismissed(['a', 'b', 'c'], ['b', 'z'])).toEqual(['b'])
  })

  it('suggests a category from the description, per the mockup keyword table', () => {
    expect(guessCategory('Mercado semanal')).toBe('food')
    expect(guessCategory('Viaje en app')).toBe('transportation')
    expect(guessCategory('Pago Netflix')).toBe('subscriptions')
    expect(guessCategory('xyz')).toBeNull()
    expect(guessCategory('  ')).toBeNull()
  })

  it('computes the display-only next occurrence, clamping short months', () => {
    expect(nextOccurrenceAfter('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(nextOccurrenceAfter('2026-12-15', 'monthly')).toBe('2027-01-15')
    expect(nextOccurrenceAfter('2026-08-21', 'weekly')).toBe('2026-08-28')
    expect(nextOccurrenceAfter('2026-08-21', 'yearly')).toBe('2027-08-21')
  })

  it('labels wallets by their full backend type', () => {
    expect([walletKind('SAVINGS'), walletKind('NEQUI'), walletKind('DAVIPLATA'), walletKind('CASH')]).toEqual(['savings', 'digital', 'digital', 'cash'])
  })
})
