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

  it('holds the shared example account, with balances that follow from its movements', async () => {
    const wallets = await accountService.getWallets()
    expect(wallets.map((w) => [w.name, w.currency])).toEqual([
      ['Bancolombia — Ahorros', 'COP'],
      ['Nequi', 'COP'],
      ['Efectivo', 'COP'],
      ['Visa Bancolombia', 'COP'],
      ['Wise — Dólares', 'USD'],
      ['Revolut — Euros', 'EUR'],
    ])
    // Only the credit card carries a debt.
    for (const w of wallets) expect(w.id === 'guest-visa' ? w.currentBalance <= 0 : w.currentBalance > 0).toBe(true)

    const me = await userService.getCurrentUser()
    expect(me).toMatchObject({ name: 'Invitado', principalCurrency: 'COP', onboardingCompleted: true, guidesSeen: [], guidesOff: false })
    // Every month of the year has its salary, the current one included.
    const months = await summaryService.getMonths(12)
    expect(months.every((m) => m.income >= 4_400_000)).toBe(true)
  })

  it('suggests the titles already used, most recent first', async () => {
    const { titles, last } = await transactionService.getTitleSuggestions({ type: 'EXPENSE', categoryId: 'exp.food', subcategoryId: 'exp.food.cafes' })
    expect(titles).toEqual(['Café'])
    expect(last).toBe('Café')
  })

  it('exports the account as the backend CSV', async () => {
    let csv = ''
    URL.createObjectURL = (blob: Blob) => {
      void blob.text().then((t) => (csv = t))
      return 'blob:x'
    }
    URL.revokeObjectURL = () => {}
    await userService.exportData()
    await new Promise((r) => setTimeout(r, 0))
    expect(csv).toContain('Movimientos\r\nFecha,Tipo,Estado,Descripción')
    expect(csv).toContain('Préstamos\r\nFecha,Tipo,Persona')
    expect(csv).toContain('Salario mensual')
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

  it('refuses an abono above what a goal still needs, as the backend does', async () => {
    const peru = async () => (await goalService.getGoals()).find((g) => g.id === 'guest-goal-peru')!
    const before = { wallet: await balanceOf('guest-bancolombia'), goal: await peru() }
    await expect(goalService.contribute('guest-goal-peru', { amount: before.goal.remaining + 1, accountId: 'guest-bancolombia', date: todayISO() })).rejects.toMatchObject({
      status: 422,
      details: { code: 'GOAL_EXCEEDS_REMAINING', remaining: before.goal.remaining },
    })
    expect(await balanceOf('guest-bancolombia')).toBe(before.wallet)

    const done = await goalService.contribute('guest-goal-peru', { amount: before.goal.remaining, accountId: 'guest-bancolombia', date: todayISO() })
    expect(done).toMatchObject({ remaining: 0, percentage: 100 })
    await expect(goalService.contribute('guest-goal-peru', { amount: 1, accountId: 'guest-bancolombia', date: todayISO() })).rejects.toMatchObject({ status: 422 })
  })

  it('confirms a due aporte from its alert', async () => {
    const due = (await alertService.getAlerts()).find((a) => a.kind === 'goal_plan_due')
    expect(due).toMatchObject({ goalId: 'guest-goal-peru', amount: 250_000 })
    const before = { wallet: await balanceOf('guest-bancolombia'), saved: (await goalService.getGoals()).find((g) => g.id === 'guest-goal-peru')!.currentAmount }

    const goal = await goalService.confirmPlan('guest-goal-peru')

    expect(goal.currentAmount).toBe(before.saved + 250_000)
    expect(await balanceOf('guest-bancolombia')).toBe(before.wallet - 250_000)
    expect((await alertService.getAlerts()).some((a) => a.kind === 'goal_plan_due')).toBe(false)
  })

  it('settles a loan with an abono and clears its alert', async () => {
    const camilo = (a: { kind: string }) => a.kind === 'loan_open' && (a as { transactionId?: string }).transactionId === 'guest-loan-camilo'
    expect((await alertService.getAlerts()).some(camilo)).toBe(true)
    // Part of it was already paid back; it charges 2 % a month on the
    // balance, so it owes more than the unpaid principal.
    const open = (await transactionService.getLoans()).find((l) => l.id === 'guest-loan-camilo')!
    expect(open.interest).toMatchObject({ mode: 'on_balance', rate: 2, period: 'monthly' })
    expect(open.outstanding).toBe(open.interest!.principalOutstanding + open.interest!.accrued - open.interest!.paid)
    expect(open.outstanding!).toBeGreaterThan(open.interest!.principalOutstanding)

    await transactionService.settleLoan('guest-loan-camilo', { amount: open.outstanding!, accountId: 'guest-bancolombia', date: todayISO() })

    const loan = (await transactionService.getLoans()).find((l) => l.id === 'guest-loan-camilo')!
    expect(loan).toMatchObject({ loanSettled: true, outstanding: 0 })
    expect((await alertService.getAlerts()).some(camilo)).toBe(false)
  })

  it('keeps the backend rule that the principal is fixed once wallets exist', async () => {
    await expect(currencyService.setPrincipal('USD')).rejects.toThrow('La moneda principal se elige antes de crear billeteras.')
  })
})
