import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setGuestHandler } from '@/lib/apiClient'
import { resetCategoryCache } from '@/lib/backendCategories'
import { createGuestApi } from '@/lib/guestApi'
import { SEED, resolveSeedDate } from '@/lib/guestSeed'
import { accountService } from '@/services/accountService'
import { alertService } from '@/services/alertService'
import { budgetService } from '@/services/budgetService'
import { goalService } from '@/services/goalService'
import { summaryService } from '@/services/summaryService'

describe('guest seed dates', () => {
  it('resolves month-anchored, day-relative and next-occurrence dates', () => {
    expect(resolveSeedDate('M:-1:31', '2026-03-15')).toBe('2026-02-28')
    expect(resolveSeedDate('M:0:L', '2026-02-10')).toBe('2026-02-28')
    expect(resolveSeedDate('M:-11:1', '2026-10-07')).toBe('2025-11-01')
    expect(resolveSeedDate('T:-8', '2026-03-03')).toBe('2026-02-23')
    expect(resolveSeedDate('D:-1', '2026-03-31')).toBe('2026-02-28')
    expect(resolveSeedDate('N:5', '2026-10-04')).toBe('2026-10-05')
    expect(resolveSeedDate('N:5', '2026-10-05')).toBe('2026-11-05')
  })

  it('is the same file Android loads', () => {
    const android = readFileSync(resolve(__dirname, '../../../android/app/src/main/assets/guest_seed.json'), 'utf8')
    expect(JSON.parse(android)).toEqual(SEED)
  })
})

describe('guest account on any day', () => {
  afterEach(() => {
    setGuestHandler(null)
    resetCategoryCache()
    vi.useRealTimers()
  })

  // On the 1st, the 31st or a short February, the current month always has
  // its salary and no month has two.
  it.each(['2026-10-01', '2026-10-31', '2027-02-28', '2027-03-01'])('has one salary in each month on %s', async (today) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(`${today}T10:00:00`))
    setGuestHandler(createGuestApi())
    resetCategoryCache()
    const months = await summaryService.getMonths(12, today)
    expect(months).toHaveLength(12)
    for (const m of months) {
      expect(m.income).toBeGreaterThanOrEqual(4_400_000)
      expect(m.income).toBeLessThan(2 * 4_400_000)
    }
  })
})

// The same figures Android's GuestSeedTest expects for this day, so both
// clients show the same example account.
describe('guest account on 2026-10-07', () => {
  afterEach(() => {
    setGuestHandler(null)
    resetCategoryCache()
    vi.useRealTimers()
  })

  it('derives the balances, budgets, goals and alerts Android derives', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-07T10:00:00'))
    setGuestHandler(createGuestApi())
    resetCategoryCache()
    expect((await accountService.getWallets()).map((w) => [w.id, w.currentBalance])).toEqual([
      ['guest-bancolombia', 15_849_029],
      ['guest-nequi', 474_400],
      ['guest-efectivo', 509_200],
      ['guest-visa', -1_018_800],
      ['guest-wise', 1_116],
      ['guest-revolut', 121.5],
    ])
    const spent = Object.fromEntries((await budgetService.getBudgets()).map((b) => [b.id, b.spent]))
    expect(spent).toMatchObject({ 'guest-budget-food': 587_800, 'guest-budget-restaurants': 396_700, 'guest-budget-transport': 55_000, 'guest-budget-sofia': 185_000 })
    expect((await goalService.getGoals()).map((g) => [g.id, g.currentAmount])).toEqual([
      ['guest-goal-emergencia', 4_300_000],
      ['guest-goal-peru', 2_145_000],
      ['guest-goal-portatil', 4_750_000],
      ['guest-goal-especializacion', 900_000],
      ['guest-goal-bici', 1_800_000],
    ])
    expect((await alertService.getAlerts('2026-10-07')).map((a) => a.id.split(':').slice(0, 2).join(':'))).toEqual([
      'series:guest-series-admin',
      'loan:guest-loan-daniela',
      'loan:guest-loan-camilo',
      'budget:guest-budget-restaurants',
      'goal:guest-goal-portatil',
      'goalplan:guest-goal-peru',
      expect.stringMatching(/^goalauto:/),
      expect.stringMatching(/^planned:/),
      expect.stringMatching(/^planned:/),
    ])
  })
})
