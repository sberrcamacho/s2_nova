import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import PlanesPage from '@/dashboard/pages/PlanesPage'
import { resetCategoryCache } from '@/lib/backendCategories'

const budget = {
  id: 'b1', kind: 'CATEGORY', name: null, categoryId: 'uuid-exp.utilities', icon: null, walletIds: [], period: 'MONTHLY', startDate: '2026-09-01', endDate: null,
  amount: 450_000, spent: 414_000, remaining: 36_000, percentage: 92, status: 'NEAR_LIMIT', assignedCount: null, month: '2026-09',
}
const wallets = [
  { id: 'a1', name: 'Bancolombia — Ahorros', type: 'SAVINGS', currency: 'COP', initialBalance: 0, currentBalance: 0, principalBalance: 0 },
  { id: 'a2', name: 'Nequi', type: 'NEQUI', currency: 'COP', initialBalance: 0, currentBalance: 300_000, principalBalance: 300_000 },
]
const goal = {
  id: 'g1', name: 'Viaje a Perú', icon: 'travel', targetAmount: 4_500_000, initialAmount: 500_000, currentAmount: 1_980_000, remaining: 2_520_000, percentage: 44,
  targetDate: '2027-06-30', plan: null, contributions: [{ accountId: 'a2', amount: 780_000 }, { accountId: 'a1', amount: 700_000 }],
}
const loanRow = {
  id: 'l1', accountId: 'a1', transferToAccountId: null, type: 'EXPENSE', status: 'COMPLETED', amount: 200_000, currency: 'COP', fxRate: null, walletAmount: null,
  categoryId: 'uuid-exp.other', subcategoryId: null, productId: null, budgetId: null, customBudgetId: null, goalId: null, recurringSeriesId: null,
  loanKind: 'LENT', counterpartyName: 'Camila', counterpartyKind: null, dueDate: null, loanSettledAt: null, settledByTransactionId: null, parentLoanId: null,
  outstanding: 200_000, paymentMethod: 'BANK_TRANSFER', description: 'Préstamo a Camila', merchant: null, note: null, date: '2026-09-10', occurredAt: null, attachment: null,
}

describe('Planes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 23, 10))
    resetCategoryCache()
  })
  afterEach(() => vi.useRealTimers())

  it('shows a budget card and creates a category budget from the header button', async () => {
    mockSession()
    let posted: unknown = null
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.get(`${BASE}/budgets`, () => HttpResponse.json([budget])),
      http.post(`${BASE}/budgets`, async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({ ...budget, id: 'b2' }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<PlanesPage />, { route: '/planes?tab=presupuestos' })

    const card = (await screen.findByText('Servicios públicos · Todas · Mensual · se reinicia el 1')).closest('button')!
    expect(within(card).getByText('92 %')).toBeInTheDocument()
    expect(card).toHaveTextContent('de $450.000')
    expect(card).toHaveTextContent('Cerca del límite')
    expect(card).toHaveTextContent('Mensual · se reinicia el 1')

    await user.click(screen.getByRole('button', { name: /Nuevo presupuesto/ }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo presupuesto' })
    // The kind, then the category and the subcategory: each choice advances
    // on its own, and nothing unfolds under it.
    expect(dialog).toHaveTextContent('Paso 1 de 3')
    await user.click(within(dialog).getByRole('radio', { name: /Una categoría/ }))
    expect(within(dialog).queryByRole('button', { name: 'Continuar' })).toBeNull()
    await user.click(within(dialog).getByRole('radio', { name: 'Alimentación' }))
    expect(dialog).toHaveTextContent('Paso 3 de 4')
    await user.click(within(dialog).getByRole('radio', { name: 'Mercado' }))
    // The limit step: amount, the name after the subcategory, and the
    // wallets on their own page.
    expect(within(dialog).getByPlaceholderText(/Mercado, salidas/)).toHaveValue('Mercado')
    await user.type(within(dialog).getByPlaceholderText('0'), '600000')
    await user.click(within(dialog).getByRole('button', { name: /Billeteras/ }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Nequi' }))
    await user.click(within(dialog).getByRole('button', { name: 'Listo' }))
    expect(dialog).toHaveTextContent('Solo Alimentación · Mercado, pagados desde Nequi · se reinicia cada mes.')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar presupuesto' }))
    await vi.waitFor(() =>
      expect(posted).toEqual({ kind: 'CATEGORY', name: 'Mercado', categoryId: 'uuid-exp.food.groceries', walletIds: ['a2'], amount: 600_000, period: 'MONTHLY', month: '2026-09' }),
    )
  })

  it('creates a custom budget with an icon suggested by its name', async () => {
    mockSession()
    let posted: unknown = null
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.post(`${BASE}/budgets`, async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({ ...budget, id: 'b2', kind: 'CUSTOM', categoryId: null, icon: 'events' }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<PlanesPage />, { route: '/planes?tab=presupuestos' })

    await user.click(await screen.findByRole('button', { name: /Nuevo presupuesto/ }))
    const dialog = screen.getByRole('dialog', { name: 'Nuevo presupuesto' })
    await user.click(within(dialog).getByRole('radio', { name: /Algo personalizado/ }))
    // A name is required before moving on.
    expect(within(dialog).getByRole('button', { name: 'Continuar' })).toBeDisabled()
    await user.type(within(dialog).getByPlaceholderText(/Cumpleaños, viaje/), 'Cumpleaños de Sofía')
    expect(dialog).toHaveTextContent('Icono sugerido por el nombre.')
    expect(within(dialog).getByRole('radio', { name: 'Celebración' })).toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: 'Continuar' }))
    await user.type(within(dialog).getByPlaceholderText('0'), '300000')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar presupuesto' }))
    await vi.waitFor(() =>
      expect(posted).toEqual({ kind: 'CUSTOM', name: 'Cumpleaños de Sofía', icon: 'events', walletIds: [], amount: 300_000, period: 'MONTHLY', month: '2026-09' }),
    )
  })

  it('explains a taken category when the backend answers 409', async () => {
    mockSession()
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.get(`${BASE}/budgets`, () => HttpResponse.json([budget])),
      http.patch(`${BASE}/budgets/:id`, () => HttpResponse.json({ error: 'A budget for this category already exists.' }, { status: 409 })),
    )
    const user = userEvent.setup()
    renderApp(<PlanesPage />, { route: '/planes?tab=presupuestos' })

    await user.click((await screen.findByText('Servicios públicos · Todas · Mensual · se reinicia el 1')).closest('button')!)
    const dialog = screen.getByRole('dialog', { name: 'Editar presupuesto' })
    // Editing opens on the last step; Atrás leads to the subcategory, then
    // the category.
    expect(dialog).toHaveTextContent('Paso 3 de 3')
    await user.click(within(dialog).getByRole('button', { name: 'Atrás' }))
    await user.click(within(dialog).getByRole('button', { name: 'Atrás' }))
    await user.click(within(dialog).getByRole('radio', { name: 'Alimentación' }))
    await user.click(within(dialog).getByRole('radio', { name: 'Toda la categoría' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Ya tienes un presupuesto para esa categoría en ese periodo.')
  })

  it('deletes a budget only after both confirmation steps', async () => {
    mockSession()
    let deleted = false
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.get(`${BASE}/budgets`, () => HttpResponse.json([budget])),
      http.delete(`${BASE}/budgets/:id`, () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<PlanesPage />, { route: '/planes?tab=presupuestos' })

    await user.click((await screen.findByText('Servicios públicos · Todas · Mensual · se reinicia el 1')).closest('button')!)
    await user.click(screen.getByRole('button', { name: 'Eliminar presupuesto' }))
    const confirm = screen.getByRole('alertdialog')
    expect(confirm).toHaveTextContent('$414.000 gastados de $450.000 · Mensual · se reinicia el 1')
    await user.click(within(confirm).getByRole('button', { name: 'Continuar' }))
    await user.click(within(confirm).getByRole('button', { name: 'Eliminar presupuesto' }))
    expect(deleted).toBe(false)
    await user.click(within(confirm).getByRole('button', { name: /Entiendo que el presupuesto/ }))
    await user.click(within(confirm).getByRole('button', { name: 'Eliminar presupuesto' }))
    await vi.waitFor(() => expect(deleted).toBe(true))
  })

  it('creates a goal with a periodic contribution', async () => {
    mockSession()
    let created: unknown = null
    let plan: unknown = null
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.get(`${BASE}/goals`, () => HttpResponse.json([])),
      http.post(`${BASE}/goals`, async ({ request }) => {
        created = await request.json()
        return HttpResponse.json({ ...goal, id: 'g2' }, { status: 201 })
      }),
      http.put(`${BASE}/goals/:id/plan`, async ({ request }) => {
        plan = await request.json()
        return HttpResponse.json({ ...goal, id: 'g2', plan: { ...(plan as object), nextDate: '2026-09-23', doneCount: 0, active: true, due: false } })
      }),
    )
    const user = userEvent.setup()
    renderApp(<PlanesPage />, { route: '/planes?tab=metas' })

    await user.click(await screen.findByRole('button', { name: /Nueva meta/ }))
    const dialog = screen.getByRole('dialog', { name: 'Nueva meta' })
    expect(within(dialog).getByRole('button', { name: 'Continuar' })).toBeDisabled()
    await user.type(within(dialog).getByPlaceholderText(/Viaje a Perú/), 'Vacaciones en Cartagena')
    await user.click(within(dialog).getByRole('button', { name: 'Continuar' }))
    expect(dialog).toHaveTextContent('Paso 2 de 3')
    const [target, initial] = within(dialog).getAllByPlaceholderText('0')
    await user.type(target, '3000000')
    await user.type(initial, '200000')
    await user.click(within(dialog).getByRole('button', { name: 'Continuar' }))
    expect(within(dialog).getByRole('radio', { name: /Cuando yo quiera/ })).toBeChecked()
    await user.click(within(dialog).getByRole('radio', { name: /Aporte periódico/ }))
    // The plan adds its own steps instead of unfolding under the choice.
    expect(dialog).toHaveTextContent('Paso 3 de 5')
    await user.click(within(dialog).getByRole('button', { name: 'Continuar' }))
    expect(within(dialog).getByRole('button', { name: 'Continuar' })).toBeDisabled()
    await user.type(within(dialog).getByPlaceholderText('0'), '350000')
    await user.click(within(dialog).getByRole('radio', { name: 'Nequi' }))
    await user.click(within(dialog).getByRole('button', { name: 'Continuar' }))
    expect(dialog).toHaveTextContent('Con 8 aportes de $350.000 cumples la meta hacia abril de 2027.')
    await user.click(within(dialog).getByRole('radio', { name: /Automático/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar meta' }))
    await vi.waitFor(() => expect(plan).not.toBeNull())
    expect(created).toEqual({ name: 'Vacaciones en Cartagena', icon: 'travel', targetAmount: 3_000_000, initialAmount: 200_000 })
    expect(plan).toEqual({ amount: 350_000, frequency: 'MONTHLY', accountId: 'a2', startDate: '2026-09-23', endMode: 'GOAL', autoConfirm: true })
  })

  it('contributes to a goal from a wallet with "Abonar"', async () => {
    mockSession()
    let body: unknown = null
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.get(`${BASE}/goals`, () => HttpResponse.json([goal])),
      http.post(`${BASE}/goals/:id/contribute`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(goal)
      }),
    )
    const user = userEvent.setup()
    renderApp(<PlanesPage />, { route: '/planes?tab=metas' })

    await user.click(await screen.findByRole('button', { name: 'Abonar' }))
    const dialog = screen.getByRole('dialog', { name: 'Abonar a Viaje a Perú' })
    await user.type(within(dialog).getByPlaceholderText('0'), '100000')
    await user.click(within(dialog).getByRole('radio', { name: 'Nequi' }))
    await user.click(within(dialog).getByRole('button', { name: 'Abonar' }))
    await vi.waitFor(() => expect(body).toEqual({ amount: 100_000, accountId: 'a2', date: '2026-09-23' }))
  })

  it('warns before an abono takes the wallet below zero, and lets it through', async () => {
    mockSession()
    let body: unknown = null
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.get(`${BASE}/goals`, () => HttpResponse.json([goal])),
      http.post(`${BASE}/goals/:id/contribute`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(goal)
      }),
    )
    const user = userEvent.setup()
    renderApp(<PlanesPage />, { route: '/planes?tab=metas' })

    await user.click(await screen.findByRole('button', { name: 'Abonar' }))
    const dialog = screen.getByRole('dialog', { name: 'Abonar a Viaje a Perú' })
    await user.type(within(dialog).getByPlaceholderText('0'), '400000')
    await user.click(within(dialog).getByRole('radio', { name: 'Nequi' }))
    await user.click(within(dialog).getByRole('button', { name: 'Abonar' }))

    const warn = await screen.findByRole('alertdialog', { name: 'Saldo insuficiente' })
    expect(warn).toHaveTextContent('Con este abono, Nequi queda en negativo.')
    expect(warn).toHaveTextContent('Saldo después')
    expect(warn).toHaveTextContent('−$100.000')
    expect(body).toBeNull()
    await user.click(within(warn).getByRole('button', { name: 'Revisar monto' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Abonar' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Abonar de todos modos' }))
    await vi.waitFor(() => expect(body).toEqual({ amount: 400_000, accountId: 'a2', date: '2026-09-23' }))
  })

  it('deletes a goal returning its money to the wallets it came from', async () => {
    mockSession()
    let deleted: unknown = null
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.get(`${BASE}/goals`, () => HttpResponse.json([goal])),
      http.delete(`${BASE}/goals/:id`, async ({ request }) => {
        deleted = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<PlanesPage />, { route: '/planes?tab=metas' })

    await user.click((await screen.findByText('Viaje a Perú')).closest('[role=button]')!)
    await user.click(screen.getByRole('button', { name: 'Eliminar meta' }))
    const confirm = screen.getByRole('alertdialog')
    expect(confirm).toHaveTextContent('$1.980.000 ahorrados de $4.500.000')
    expect(confirm).toHaveTextContent('El dinero ahorrado vuelve a las billeteras de origen')
    await user.click(within(confirm).getByRole('button', { name: 'Continuar' }))
    await user.click(within(confirm).getByRole('button', { name: /Entiendo que la meta/ }))
    await user.click(within(confirm).getByRole('button', { name: 'Eliminar meta' }))
    await vi.waitFor(() => expect(deleted).toEqual({ returnToOrigin: true }))
  })
  it('registers a debt from the header button', async () => {
    mockSession()
    let posted: Record<string, unknown> | null = null
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.get(`${BASE}/transactions`, () => HttpResponse.json([])),
      http.post(`${BASE}/transactions`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...loanRow, id: 'l2' }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<PlanesPage />, { route: '/planes?tab=prestamos' })

    await user.click(await screen.findByRole('button', { name: /Registrar préstamo/ }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar préstamo' })
    expect(dialog).toHaveTextContent('SALE DE')
    await user.click(within(dialog).getByRole('radio', { name: 'Me prestaron' }))
    expect(dialog).toHaveTextContent('QUIÉN TE PRESTÓ')
    expect(dialog).toHaveTextContent('ENTRA A')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar registro' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Escribe el nombre de la contraparte.')
    await user.type(within(dialog).getByPlaceholderText('Nombre de la contraparte'), 'Andrés')
    await user.type(within(dialog).getByLabelText('MONTO'), '300000')
    await user.click(within(dialog).getByRole('button', { name: 'Nequi' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar registro' }))
    await vi.waitFor(() =>
      expect(posted).toMatchObject({ accountId: 'a2', type: 'INCOME', amount: 300_000, categoryId: 'uuid-inc.other', loanKind: 'BORROWED', counterpartyName: 'Andrés', description: 'Deuda con Andrés' }),
    )
  })

  it('warns before lending more than the wallet has', async () => {
    mockSession()
    let posted: Record<string, unknown> | null = null
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.get(`${BASE}/transactions`, () => HttpResponse.json([])),
      http.post(`${BASE}/transactions`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ...loanRow, id: 'l3' }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<PlanesPage />, { route: '/planes?tab=prestamos' })

    await user.click(await screen.findByRole('button', { name: /Registrar préstamo/ }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar préstamo' })
    await user.type(within(dialog).getByPlaceholderText('Nombre de la contraparte'), 'Camila')
    await user.type(within(dialog).getByLabelText('MONTO'), '500000')
    await user.click(within(dialog).getByRole('button', { name: 'Nequi' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar registro' }))

    const warn = await screen.findByRole('alertdialog', { name: 'Saldo insuficiente' })
    expect(warn).toHaveTextContent('Con este préstamo, Nequi queda en negativo.')
    expect(posted).toBeNull()
    await user.click(within(warn).getByRole('button', { name: 'Guardar de todos modos' }))
    await vi.waitFor(() => expect(posted).toMatchObject({ accountId: 'a2', type: 'EXPENSE', amount: 500_000, loanKind: 'LENT' }))
  })

  it('opens the loan form filled in when Nuevo movimiento sends a loan here', async () => {
    mockSession()
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.get(`${BASE}/transactions`, () => HttpResponse.json([])),
    )
    renderApp(<PlanesPage />, { route: '/planes?tab=prestamos&side=lent&new=loan&amount=150000&wallet=a2' })

    const dialog = await screen.findByRole('dialog', { name: 'Registrar préstamo' })
    expect(within(dialog).getByLabelText('MONTO')).toHaveValue('150.000')
    expect(within(dialog).getByRole('button', { name: 'Nequi' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('records an abono on a lent loan', async () => {
    mockSession()
    let settled: unknown = null
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.get(`${BASE}/transactions`, ({ request }) => HttpResponse.json(new URL(request.url).searchParams.get('loanKind') === 'LENT' ? [loanRow] : [])),
      http.post(`${BASE}/transactions/:id/settle-loan`, async ({ request }) => {
        settled = await request.json()
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<PlanesPage />, { route: '/planes?tab=prestamos' })

    expect(await screen.findByText('Camila')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Registrar abono' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar abono' })
    expect(dialog).toHaveTextContent('Camila · pendiente $200.000')
    expect(within(dialog).getByRole('button', { name: 'Saldar todo · $200.000' })).toHaveAttribute('aria-pressed', 'true')
    const amount = within(dialog).getByLabelText('Monto del abono')
    await user.clear(amount)
    await user.type(amount, '500000')
    expect(dialog).toHaveTextContent('No puede superar el pendiente de $200.000.')
    expect(within(dialog).getByRole('button', { name: 'Guardar abono' })).toBeDisabled()
    await user.clear(amount)
    await user.type(amount, '50000')
    await user.click(within(dialog).getByRole('button', { name: 'Nequi' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar abono' }))
    await vi.waitFor(() => expect(settled).toEqual({ amount: 50_000, accountId: 'a2', date: '2026-09-23' }))
  })
})

