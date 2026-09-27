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
    await user.type(screen.getByLabelText('MONTO'), '5000')
    await user.click(save)
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un título.')
  })

  it('evaluates typed arithmetic and posts the expense with its subcategory', async () => {
    const sent = mockPanel()
    const user = userEvent.setup()
    const onClose = await open()
    await pickCategory(user, 'Alimentación', 'Mercado')
    await user.type(screen.getByLabelText('MONTO'), '150000+18500')
    expect(screen.getByText('= $168.500')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Título'), 'Mercado de la semana')
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
    await user.type(screen.getByPlaceholderText('Título'), 'Arriendo')

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
    await user.type(screen.getByPlaceholderText('Título'), 'Diseño web')
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
    await user.type(screen.getByPlaceholderText('Título'), 'Ahorro')
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Elige la billetera de destino.')
  })

  it('edits a movement keeping its Repetir and receipt, and saves every field with PATCH', async () => {
    mockPanel()
    let patched: Record<string, unknown> | undefined
    let receiptRemoved = false
    server.use(
      http.get(`${BASE}/recurring-series`, () =>
        HttpResponse.json([
          { id: 's1', name: 'Gimnasio', type: 'EXPENSE', amount: 90000, currency: 'COP', accountId: WALLETS[1].id, categoryId: 'uuid-exp.health', subcategoryId: null, interval: 'WEEKLY', nextOccurrenceDate: '2026-10-01', occurrences: 4, occurrencesDone: 1, endDate: null, autoConfirm: true, isDue: false, active: true },
        ]),
      ),
      http.patch(`${BASE}/transactions/t9`, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(row({ id: 't9', ...patched, type: 'EXPENSE', categoryId: 'uuid-exp.health', date: '2026-09-20T00:00:00.000Z', recurringSeriesId: 's1' }))
      }),
      http.delete(`${BASE}/transactions/t9/attachment`, () => {
        receiptRemoved = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderApp(
      <NewTransactionPanel
        onClose={onClose}
        editing={{
          id: 't9', accountId: WALLETS[1].id, description: 'Gimnasio', amount: 90000, currency: 'COP', type: 'expense', status: 'completed', category: 'exp.health',
          date: '2026-09-20', time: '07:30', paymentMethod: 'transfer', note: 'Plan anual', recurringSeriesId: 's1', customBudgetId: undefined,
          attachment: { id: 'f1', kind: 'image', mime: 'image/jpeg', name: 'recibo-gym.jpg', size: 200_000, createdAt: '2026-09-20T10:00:00.000Z' },
        }}
      />,
    )
    expect(await screen.findByRole('dialog', { name: 'Editar movimiento' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Título')).toHaveValue('Gimnasio')
    expect(screen.getByPlaceholderText('Nota (opcional)')).toHaveValue('Plan anual')
    expect(screen.getByText('recibo-gym.jpg')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Semanal ×4' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Ingreso' })).toBeDisabled()

    await user.clear(screen.getByPlaceholderText('Nota (opcional)'))
    await user.click(screen.getByRole('button', { name: 'Quitar adjunto' }))
    await user.click(screen.getByRole('button', { name: 'Guardar y repetir' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(patched).toMatchObject({
      accountId: WALLETS[1].id,
      amount: 90000,
      description: 'Gimnasio',
      note: null,
      customBudgetId: null,
      goalId: null,
      date: '2026-09-20',
      time: '07:30',
      repeat: { interval: 'WEEKLY', occurrences: 4, autoConfirm: true },
    })
    expect(receiptRemoved).toBe(true)
  })
})
