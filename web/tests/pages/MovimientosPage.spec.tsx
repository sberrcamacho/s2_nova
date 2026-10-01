import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import { ToastViewport } from '@/components/ui/Toast'
import MovimientosPage from '@/dashboard/pages/MovimientosPage'

const row = (over: Record<string, unknown>) => ({
  id: 't', accountId: 'a1', transferToAccountId: null, type: 'EXPENSE', status: 'COMPLETED', amount: 1000, currency: 'COP', fxRate: null, walletAmount: null,
  categoryId: 'uuid-exp.food', subcategoryId: null, productId: null, budgetId: null, customBudgetId: null, goalId: null, recurringSeriesId: null,
  loanKind: null, counterpartyName: null, counterpartyKind: null, dueDate: null, loanSettledAt: null, settledByTransactionId: null, parentLoanId: null,
  outstanding: null, paymentMethod: 'CASH', description: 'x', merchant: null, note: null, attachment: null,
  date: '2026-09-23T00:00:00.000Z', occurredAt: '2026-09-23T12:00:00.000Z', ...over,
})

let rows: ReturnType<typeof row>[]
let lastFrom = ''
let created: unknown = null

function mockMovimientos() {
  created = null
  rows = [
    row({ id: 't1', description: 'Mercado semanal', merchant: 'Éxito', amount: 168_500, subcategoryId: 'uuid-exp.food.groceries', occurredAt: '2026-09-23T09:12:00.000Z',
      attachment: { id: 'f1', kind: 'IMAGE', mime: 'image/jpeg', name: 'recibo-exito.jpg', size: 1_200_000, createdAt: '2026-09-23T14:00:00.000Z' } }),
    row({ id: 't2', description: 'Café', merchant: 'Tostao', amount: 21_000, accountId: 'a2', subcategoryId: 'uuid-exp.food.cafes', occurredAt: '2026-09-23T07:48:00.000Z' }),
    row({ id: 't3', description: 'Salario mensual', type: 'INCOME', categoryId: 'uuid-inc.work', subcategoryId: 'uuid-inc.work.salary', amount: 4_400_000, date: '2026-09-01T00:00:00.000Z', occurredAt: '2026-09-01T06:00:00.000Z' }),
  ]
  const planned = [row({ id: 'p1', description: 'Arriendo', status: 'PLANNED', amount: 1_450_000, categoryId: 'uuid-exp.housing', subcategoryId: 'uuid-exp.housing.rent', date: '2026-10-01T00:00:00.000Z', occurredAt: '2026-10-01T08:00:00.000Z' })]
  server.use(
    http.get(`${BASE}/accounts`, () =>
      HttpResponse.json([
        { id: 'a1', name: 'Bancolombia — Ahorros', type: 'SAVINGS', currency: 'COP', initialBalance: 0, currentBalance: 0 },
        { id: 'a2', name: 'Efectivo', type: 'CASH', currency: 'COP', initialBalance: 0, currentBalance: 0 },
      ]),
    ),
    http.get(`${BASE}/transactions`, ({ request }) => {
      const url = new URL(request.url)
      if (url.searchParams.get('status') === 'PLANNED') return HttpResponse.json(planned)
      if (url.searchParams.get('from')) lastFrom = url.searchParams.get('from')!
      return HttpResponse.json(url.searchParams.get('from') === '2026-09-01' ? rows : [])
    }),
    http.delete(`${BASE}/transactions/:id`, ({ params }) => {
      rows = rows.filter((r) => r.id !== params.id)
      return new HttpResponse(null, { status: 204 })
    }),
    http.post(`${BASE}/transactions`, async ({ request }) => {
      created = await request.json()
      rows = [...rows, row({ id: 't2b', description: 'Café', merchant: 'Tostao', amount: 21_000, accountId: 'a2', subcategoryId: 'uuid-exp.food.cafes' })]
      return HttpResponse.json(rows[rows.length - 1], { status: 201 })
    }),
  )
}

describe('MovimientosPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 23, 18))
  })
  afterEach(() => vi.useRealTimers())

  it('groups Programados first and then each day with its total, and filters by type', async () => {
    mockSession()
    mockMovimientos()
    const user = userEvent.setup()
    renderApp(<MovimientosPage />, { route: '/movimientos' })

    expect(await screen.findByText('3 movimientos · 1 programados')).toBeInTheDocument()
    expect(screen.getByText('Vivienda · Arriendo · Bancolombia · 1 oct 08:00')).toBeInTheDocument()
    expect(screen.getByText('Alimentación · Mercado · Éxito · Bancolombia · 09:12')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^HOY/ })).toHaveTextContent('HOY−$189.500')
    expect(screen.getByRole('heading', { name: /^1 DE SEPTIEMBRE/ })).toHaveTextContent('+$4.400.000')

    await user.click(screen.getByRole('radio', { name: 'Ingresos' }))
    expect(screen.queryByText('Café')).not.toBeInTheDocument()
    expect(screen.getByText('Salario mensual')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Programados' }))
    expect(screen.getByText('Arriendo')).toBeInTheDocument()
    expect(screen.queryByText('Salario mensual')).not.toBeInTheDocument()
  })

  it('shows search results for ?q=', async () => {
    mockSession()
    mockMovimientos()
    renderApp(<MovimientosPage />, { route: '/movimientos?q=efectivo' })
    expect(await screen.findByText('1 resultados para “efectivo”')).toBeInTheDocument()
    expect(screen.getByText('Café')).toBeInTheDocument()
  })

  it('loads the month chosen in ?period= and shows its empty state', async () => {
    mockSession()
    mockMovimientos()
    renderApp(<MovimientosPage />, { route: '/movimientos?period=2026-07' })
    expect(await screen.findByText('Sin movimientos para este filtro.')).toBeInTheDocument()
    expect(lastFrom).toBe('2026-07-01')
  })

  it('deletes a small movement at once and brings it back with Deshacer', async () => {
    mockSession()
    mockMovimientos()
    const user = userEvent.setup()
    renderApp(
      <>
        <MovimientosPage />
        <ToastViewport />
      </>,
      { route: '/movimientos' },
    )
    await user.click(await screen.findByText('Café'))
    const dialog = screen.getByRole('dialog', { name: 'Café' })
    expect(within(dialog).getByText('23 de septiembre de 2026 · 07:48')).toBeInTheDocument()
    expect(within(dialog).getByText('Efectivo · COP')).toBeInTheDocument()
    expect(within(dialog).getByText('Adjuntar recibo o factura · o arrástralo aquí')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar movimiento' }))
    await waitFor(() => expect(screen.queryByText('Café')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Movimiento eliminado')

    await user.click(screen.getByRole('button', { name: 'Deshacer' }))
    await waitFor(() => expect(created).toMatchObject({ accountId: 'a2', type: 'EXPENSE', amount: 21_000, description: 'Café', date: '2026-09-23', time: '07:48' }))
    expect(await screen.findByText('Café')).toBeInTheDocument()
  })

  it('asks the two-step confirmation before deleting a movement with a receipt', async () => {
    mockSession()
    mockMovimientos()
    const user = userEvent.setup()
    renderApp(<MovimientosPage />, { route: '/movimientos' })
    await user.click(await screen.findByText('Mercado semanal'))
    const dialog = screen.getByRole('dialog', { name: 'Mercado semanal' })
    expect(within(dialog).getByText('recibo-exito.jpg')).toBeInTheDocument()
    expect(within(dialog).getByText('Foto · 1,2 MB · agregado el 23 sep')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Eliminar movimiento' }))
    const confirm = screen.getByRole('alertdialog', { name: 'Eliminar “Mercado semanal”' })
    expect(confirm).toHaveTextContent('Su comprobante: recibo-exito.jpg')
    expect(rows.some((r) => r.id === 't1')).toBe(true)
  })
})
