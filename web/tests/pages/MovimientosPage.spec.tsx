import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import MovimientosPage from '@/dashboard/pages/MovimientosPage'

const row = (over: Record<string, unknown>) => ({
  id: 't', accountId: 'a1', transferToAccountId: null, type: 'EXPENSE', status: 'COMPLETED', amount: 1000, categoryId: 'uuid-food',
  productId: null, budgetId: null, goalId: null, recurringSeriesId: null, loanKind: null, counterpartyName: null, dueDate: null,
  loanSettledAt: null, settledByTransactionId: null, parentLoanId: null, outstanding: null, paymentMethod: 'CASH',
  description: 'x', merchant: null, note: null, date: '2026-09-21T00:00:00.000Z', ...over,
})

let rows: ReturnType<typeof row>[]
let lastFrom = ''

function mockMovimientos() {
  rows = [
    row({ id: 't1', description: 'Mercado semanal', merchant: 'Éxito', amount: 168_500 }),
    row({ id: 't2', description: 'Café', merchant: 'Tostao', amount: 21_000, accountId: 'a2' }),
    row({ id: 't3', description: 'Salario mensual', type: 'INCOME', categoryId: 'uuid-salary', amount: 4_400_000, date: '2026-09-01T00:00:00.000Z' }),
  ]
  server.use(
    http.get(`${BASE}/accounts`, () =>
      HttpResponse.json([
        { id: 'a1', name: 'Bancolombia — Ahorros', type: 'SAVINGS', initialBalance: 0, currentBalance: 0 },
        { id: 'a2', name: 'Efectivo', type: 'CASH', initialBalance: 0, currentBalance: 0 },
      ]),
    ),
    http.get(`${BASE}/transactions`, ({ request }) => {
      const url = new URL(request.url)
      if (url.searchParams.get('from')) lastFrom = url.searchParams.get('from')!
      return HttpResponse.json(url.searchParams.get('from') === '2026-09-01' ? rows : [])
    }),
    http.delete(`${BASE}/transactions/:id`, ({ params }) => {
      rows = rows.filter((r) => r.id !== params.id)
      return new HttpResponse(null, { status: 204 })
    }),
  )
}

describe('MovimientosPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 23, 10))
  })
  afterEach(() => vi.useRealTimers())

  it("lists the month's movements, filters by type and searches by wallet", async () => {
    mockSession()
    mockMovimientos()
    const user = userEvent.setup()
    renderApp(<MovimientosPage />, { route: '/movimientos' })
    expect(await screen.findByText('Septiembre 2026 · 3 movimientos')).toBeInTheDocument()
    expect(screen.getByText('Éxito · 21 sep · Bancolombia')).toBeInTheDocument()
    expect(screen.getByText('−$168.500')).toBeInTheDocument()
    expect(screen.getByText('+$4.400.000')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Ingresos' }))
    expect(screen.getByText('Septiembre 2026 · 1 movimiento')).toBeInTheDocument()
    expect(screen.queryByText('Café')).not.toBeInTheDocument()
  })

  it('shows search results for ?q= and the empty search copy', async () => {
    mockSession()
    mockMovimientos()
    renderApp(<MovimientosPage />, { route: '/movimientos?q=efectivo' })
    expect(await screen.findByText('1 resultado para “efectivo”')).toBeInTheDocument()
    expect(screen.getByText('Café')).toBeInTheDocument()
  })

  it('loads the month chosen in ?period= and shows its empty state', async () => {
    mockSession()
    mockMovimientos()
    renderApp(<MovimientosPage />, { route: '/movimientos?period=2026-07' })
    expect(await screen.findByText('Sin movimientos en julio 2026.')).toBeInTheDocument()
    expect(lastFrom).toBe('2026-07-01')
  })

  it('opens a movement and deletes it through the backend', async () => {
    mockSession()
    mockMovimientos()
    const user = userEvent.setup()
    renderApp(<MovimientosPage />, { route: '/movimientos' })
    await user.click(await screen.findByText('Café'))
    const dialog = screen.getByRole('dialog', { name: 'Café' })
    expect(within(dialog).getByText('21 sep 2026')).toBeInTheDocument()
    expect(within(dialog).getByText('Efectivo')).toBeInTheDocument()
    expect(within(dialog).getByText('Gasto')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.queryByText('Café')).not.toBeInTheDocument())
    expect(screen.getByText('Septiembre 2026 · 2 movimientos')).toBeInTheDocument()
  })
})
