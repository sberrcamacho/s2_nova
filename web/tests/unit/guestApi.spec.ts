import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setGuestHandler } from '@/lib/apiClient'
import { resetCategoryCache } from '@/lib/backendCategories'
import { todayISO } from '@/lib/date'
import { createGuestApi } from '@/lib/guestApi'
import { accountService } from '@/services/accountService'
import { alertService } from '@/services/alertService'
import { budgetService } from '@/services/budgetService'
import { currencyService } from '@/services/currencyService'
import { goalService } from '@/services/goalService'
import { summaryService } from '@/services/summaryService'
import { transactionService } from '@/services/transactionService'
import { userService } from '@/services/userService'

// The test server errors on any unhandled request, so each test also
// proves guest mode never reaches the network.
const balanceOf = async (id: string) => (await accountService.getWallets()).find((w) => w.id === id)!.currentBalance

describe('Guest mode example account', () => {
  beforeEach(() => {
    setGuestHandler(createGuestApi())
    resetCategoryCache()
  })
  afterEach(() => {
    setGuestHandler(null)
    resetCategoryCache()
  })

  it('holds the mockup example account, with guides on', async () => {
    const wallets = await accountService.getWallets()
    expect(wallets.map((w) => [w.name, w.currency, w.currentBalance])).toEqual([
      ['Bancolombia — Ahorros', 'COP', 13_740_000],
      ['Nequi', 'COP', 1_982_300],
      ['Efectivo', 'COP', 425_000],
      ['Wise — Dólares', 'USD', 320],
    ])
    expect(wallets[3].principalBalance).toBe(1_264_000)

    const me = await userService.getCurrentUser()
    expect(me).toMatchObject({ name: 'Invitado', principalCurrency: 'COP', onboardingCompleted: true, guidesSeen: [], guidesOff: false })
    // The six months ending now have income, except the current one on the
    // first days of a month, before its salary is dated.
    expect((await summaryService.getMonths(6)).filter((m) => m.income > 0).length).toBeGreaterThanOrEqual(5)
  })

  it('reports the real net worth, the fixed amount and what changed, as the backend does', async () => {
    const report = await summaryService.getReport(6, todayISO())
    const { wallets, lent, borrowed, total, history } = report.netWorth
    expect(total).toBe(wallets + lent.outstanding - borrowed.outstanding)
    expect(history.at(-1)!.netWorth).toBe(total)
    expect(report.fixedAmount).toBeGreaterThanOrEqual(0)
    expect(report.fixedAmount).toBeLessThanOrEqual(report.totals.expenses)
    expect(report.changes.categories.length).toBeLessThanOrEqual(3)
    for (const c of report.changes.categories) expect(c.delta).toBe(c.current - c.previous)
  })

  it('applies a new expense to its wallet, the month and the budget', async () => {
    const food = async () => (await budgetService.getBudgets()).find((b) => b.category === 'exp.food')!
    const before = { wallet: await balanceOf('guest-nequi'), budget: (await food()).spent, month: (await summaryService.getMonths(1))[0].expenses }

    const created = await transactionService.addTransaction({ accountId: 'guest-nequi', type: 'expense', amount: 50_000, category: 'exp.food.groceries', description: 'Mercado', date: todayISO(), time: '00:00' })

    expect(await balanceOf('guest-nequi')).toBe(before.wallet - 50_000)
    expect((await food()).spent).toBe(before.budget + 50_000)
    expect((await summaryService.getMonths(1))[0].expenses).toBe(before.month + 50_000)

    await transactionService.deleteTransaction(created.id)
    expect(await balanceOf('guest-nequi')).toBe(before.wallet)
  })

  it('confirms a due aporte from its alert', async () => {
    const due = (await alertService.getAlerts()).find((a) => a.kind === 'goal_plan_due')
    expect(due).toMatchObject({ goalId: 'guest-goal-2', amount: 250_000 })
    const before = await balanceOf('guest-bancolombia')

    const goal = await goalService.confirmPlan('guest-goal-2')

    expect(goal.currentAmount).toBe(2_230_000)
    expect(await balanceOf('guest-bancolombia')).toBe(before - 250_000)
    expect((await alertService.getAlerts()).some((a) => a.kind === 'goal_plan_due')).toBe(false)
  })

  it('settles a loan with an abono and clears its alert', async () => {
    expect((await alertService.getAlerts()).some((a) => a.kind === 'loan_open')).toBe(true)

    await transactionService.settleLoan('guest-loan-1', { amount: 420_000, accountId: 'guest-bancolombia', date: todayISO() })

    const loan = (await transactionService.getLoans()).find((l) => l.id === 'guest-loan-1')!
    expect(loan).toMatchObject({ loanSettled: true, outstanding: 0 })
    expect((await alertService.getAlerts()).some((a) => a.kind === 'loan_open')).toBe(false)
  })

  it('keeps the backend rule that the principal is fixed once wallets exist', async () => {
    await expect(currencyService.setPrincipal('USD')).rejects.toThrow('La moneda principal se elige antes de crear billeteras.')
  })
})
