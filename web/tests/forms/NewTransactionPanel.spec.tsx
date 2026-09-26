import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import { NewTransactionPanel } from '@/components/panels/NewTransactionPanel'
import { todayISO } from '@/lib/date'
import { addDays } from '@/lib/nuevoMovimiento'

const WALLETS = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Bancolombia — Ahorros', type: 'SAVINGS', currency: 'COP', initialBalance: 0, currentBalance: 100 },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Nequi', type: 'NEQUI', currency: 'COP', initialBalance: 0, currentBalance: 50 },
]

// A saved row as POST /transactions returns it.
function row(body: Record<string, unknown>) {
  return {
    id: 't1', transferToAccountId: null, status: 'COMPLETED', currency: 'COP', fxRate: null, walletAmount: null, subcategoryId: null, productId: null, budgetId: null, customBudgetId: null,
    goalId: null, recurringSeriesId: null, loanKind: null, counterpartyName: null, counterpartyKind: null, dueDate: null, loanSettledAt: null, settledByTransactionId: null,
    parentLoanId: null, outstanding: null, paymentMethod: 'BANK_TRANSFER', merchant: null, note: null, occurredAt: null, attachment: null, categoryId: 'uuid-exp.other', ...body,
  }
}

function mockPanel(wallets = WALLETS) {
  mockSession()
  let body: Record<string, unknown> | undefined
  server.use(
    http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
    http.get(`${BASE}/me/currencies`, () => HttpResponse.json([{ code: 'COP', name: 'Peso colombiano', symbol: '$', decimals: 0, isPrincipal: true, rate: 1, wallets: 2 }])),
    http.get(`${BASE}/goals`, () => HttpResponse.json([])),
    http.post(`${BASE}/transactions`, async ({ request }) => {
      body = (await request.json()) as Record<string, unknown>
      return HttpResponse.json(row(body))
    }),
  )
  return () => body
}

async function open() {
  const onClose = vi.fn()
  renderApp(<NewTransactionPanel onClose={onClose} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Bancolombia' })).toBeInTheDocument())
  return onClose
}

async function pickCategory(user: ReturnType<typeof userEvent.setup>, parent: string, leaf: string) {
  await user.click(screen.getByRole('button', { name: /Elige una categoría/ }))
  await user.click(screen.getByRole('button', { name: parent }))
  await user.click(screen.getByRole('button', { name: leaf }))
}

describe('NewTransactionPanel', () => {
  it('asks for the category first, then the amount', async () => {
    mockPanel()
    const user = userEvent.setup()
    await open()
    const save = screen.getByRole('button', { name: 'Guardar movimiento' })

    await user.click(save)
    expect(screen.getByRole('alert')).toHaveTextContent('Elige una categoría.')
    await pickCategory(user, 'Alimentación', 'Mercado')
    expect(screen.getByText('Alimentación · Mercado')).toBeInTheDocument()
    await user.click(save)
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe el monto.')
  })

  it('evaluates typed arithmetic and posts the expense with its subcategory', async () => {
    const sent = mockPanel()
    const user = userEvent.setup()
    const onClose = await open()
    await pickCategory(user, 'Alimentación', 'Mercado')
    await user.type(screen.getByLabelText('MONTO'), '150000+18500')
    expect(screen.getByText('= $168.500')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Título (opcional)'), 'Mercado de la semana')
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(sent()).toMatchObject({
      accountId: WALLETS[0].id,
      type: 'EXPENSE',
      amount: 168500,
      currency: 'COP',
      categoryId: 'uuid-exp.food',
      subcategoryId: 'uuid-exp.food.groceries',
      description: 'Mercado de la semana',
      date: todayISO(),
    })
    // The backend decides COMPLETED vs PLANNED from the date and time.
    expect(sent()?.status).toBeUndefined()
  })

  it('labels and sends a future, repeating movement', async () => {
    const sent = mockPanel()
    const user = userEvent.setup()
    await open()
    await pickCategory(user, 'Vivienda', 'Arriendo')
    await user.type(screen.getByLabelText('MONTO'), '1450000')

    await user.click(screen.getByRole('button', { name: 'Repetir' }))
    await user.click(screen.getByRole('button', { name: 'Semanal' }))
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(screen.getByRole('button', { name: 'Guardar y repetir' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ahora' }))
    await user.click(screen.getByRole('button', { name: 'Mañana' }))
    expect(screen.getByText(/^PROGRAMADO · /)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Programar movimiento' }))

    await waitFor(() => expect(sent()).toBeDefined())
    expect(sent()).toMatchObject({ date: addDays(todayISO(), 1), repeat: { interval: 'WEEKLY', occurrences: 12, autoConfirm: false } })
  })

  it('records who an income came from', async () => {
    const sent = mockPanel()
    const user = userEvent.setup()
    await open()
    await user.click(screen.getByRole('radio', { name: 'Ingreso' }))
    await pickCategory(user, 'Trabajo', 'Freelance')
    await user.type(screen.getByLabelText('MONTO'), '1200000')
    await user.click(screen.getByRole('button', { name: 'De' }))
    await user.type(screen.getByPlaceholderText('Empresa, cliente o persona'), 'Andrés Gómez')
    await user.click(screen.getByRole('button', { name: 'Cliente' }))
    expect(screen.getByRole('button', { name: 'Andrés Gómez' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }))

    await waitFor(() => expect(sent()).toBeDefined())
    expect(sent()).toMatchObject({ type: 'INCOME', counterpartyName: 'Andrés Gómez', counterpartyKind: 'CLIENT', categoryId: 'uuid-inc.work' })
  })

  it('needs a destination wallet for a transfer', async () => {
    mockPanel([WALLETS[0]])
    const user = userEvent.setup()
    await open()
    await user.click(screen.getByRole('radio', { name: 'Transferencia' }))
    expect(screen.queryByText('CATEGORÍA')).not.toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText('DESDE')).toBeInTheDocument()
    await user.type(screen.getByLabelText('MONTO'), '1000')
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Elige la billetera de destino.')
  })
})
