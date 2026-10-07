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
  await waitFor(() => expect(screen.getByRole('button', { name: /^Billetera\s*Bancolombia/ })).toBeInTheDocument())
  return onClose
}

async function pickCategory(user: ReturnType<typeof userEvent.setup>, parent: string, leaf: string) {
  await user.click(screen.getByRole('button', { name: /Elige una categoría/ }))
  await user.click(screen.getByRole('radio', { name: parent }))
  await user.click(screen.getByRole('radio', { name: leaf }))
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
    await user.clear(screen.getByLabelText('Título'))
    await user.click(save)
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe un título.')
  })

  it('starts with a generic title for the type until the user writes one', async () => {
    mockPanel()
    await open()
    expect(screen.getByLabelText('Título')).toHaveValue('Gasto')
  })

  it('suggests the category, then the subcategory name, tags it, and remembers the last title', async () => {
    mockPanel()
    server.use(
      http.get(`${BASE}/transactions/titles`, ({ request }) => {
        const q = new URL(request.url).searchParams
        const last = q.get('subcategoryId') === 'uuid-exp.food.groceries' ? 'Mercado de la semana' : null
        return HttpResponse.json({ titles: [], last })
      }),
    )
    const user = userEvent.setup()
    await open()
    // Even the generic first title is a suggestion.
    expect(screen.getByLabelText('Título')).toHaveValue('Gasto')
    expect(screen.getByText('Sugerido')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Elige una categoría/ }))
    await user.click(screen.getByRole('radio', { name: 'Alimentación' }))
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Alimentación'))
    expect(screen.getByText('Sugerido')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Mercado' }))
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Mercado de la semana'))
    expect(screen.getByText('Sugerido')).toBeInTheDocument()
  })

  it('stops suggesting once the user writes their own title', async () => {
    mockPanel()
    const user = userEvent.setup()
    await open()
    await pickCategory(user, 'Alimentación', 'Mercado')
    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue('Mercado'))
    await user.clear(screen.getByLabelText('Título'))
    await user.type(screen.getByLabelText('Título'), 'Cena con Ana')
    expect(screen.queryByText('Sugerido')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Alimentación · Mercado/ }))
    await user.click(screen.getByRole('radio', { name: 'Alimentación' }))
    expect(screen.getByLabelText('Título')).toHaveValue('Cena con Ana')
  })

  it('evaluates typed arithmetic and posts the expense with its subcategory', async () => {
    const sent = mockPanel()
    const user = userEvent.setup()
    const onClose = await open()
    await pickCategory(user, 'Alimentación', 'Mercado')
    await user.type(screen.getByLabelText('MONTO'), '150000+18500')
    expect(screen.getByText('= $168.500')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Título'), 'Mercado de la semana')
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }))
    // It's more than the wallet has: a heads-up first, saving anyway is allowed.
    const warn = await screen.findByRole('alertdialog', { name: 'Saldo insuficiente' })
    expect(warn).toHaveTextContent('Con este movimiento, Bancolombia queda en negativo.')
    expect(warn).toHaveTextContent('Saldo actual$100')
    expect(warn).toHaveTextContent('Este movimiento−$168.500')
    expect(warn).toHaveTextContent('Saldo después−$168.400')
    await user.click(within(warn).getByRole('button', { name: 'Guardar de todos modos' }))

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

  it('saves within the balance without asking, and Revisar keeps an overdraft unsaved', async () => {
    const sent = mockPanel()
    const user = userEvent.setup()
    const onClose = await open()
    await pickCategory(user, 'Alimentación', 'Mercado')
    await user.type(screen.getByLabelText('MONTO'), '500')
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }))
    await user.click(await screen.findByRole('button', { name: 'Revisar monto' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(sent()).toBeUndefined()
    await user.clear(screen.getByLabelText('MONTO'))
    await user.type(screen.getByLabelText('MONTO'), '100')
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(sent()).toMatchObject({ amount: 100 })
  })

  it('labels and sends a future, repeating movement', async () => {
    const sent = mockPanel()
    const user = userEvent.setup()
    await open()
    await pickCategory(user, 'Vivienda', 'Arriendo')
    await user.type(screen.getByLabelText('MONTO'), '1450000')
    await user.type(screen.getByLabelText('Título'), 'Arriendo')

    await user.click(screen.getByRole('button', { name: /^Más opciones/ }))
    await user.click(screen.getByRole('button', { name: /^Repetir/ }))
    await user.click(screen.getByRole('button', { name: 'Semanal' }))
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(screen.getByRole('button', { name: 'Guardar y repetir' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Fecha y hora/ }))
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
    await user.type(screen.getByLabelText('Título'), 'Diseño web')
    await user.click(screen.getByRole('button', { name: /^Más opciones/ }))
    await user.click(screen.getByRole('button', { name: /^De / }))
    await user.type(screen.getByPlaceholderText('Empresa, cliente o persona'), 'Andrés Gómez')
    await user.click(screen.getByRole('button', { name: 'Cliente' }))
    expect(screen.getByRole('button', { name: /^De Andrés Gómez/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }))

    await waitFor(() => expect(sent()).toBeDefined())
    expect(sent()).toMatchObject({ type: 'INCOME', counterpartyName: 'Andrés Gómez', counterpartyKind: 'CLIENT', categoryId: 'uuid-inc.work' })
  })

  it('picks the wallet from a list that opens from its row', async () => {
    mockPanel()
    const user = userEvent.setup()
    await open()
    await user.click(screen.getByRole('button', { name: /^Billetera\s*Bancolombia/ }))
    const list = screen.getByRole('radiogroup', { name: 'Billetera' })
    expect(within(list).getByRole('radio', { name: 'Bancolombia' })).toBeChecked()
    await user.click(within(list).getByRole('radio', { name: 'Nequi' }))
    expect(screen.queryByRole('radiogroup', { name: 'Billetera' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Billetera\s*Nequi/ })).toBeInTheDocument()
  })

  it('needs a destination wallet for a transfer', async () => {
    mockPanel([WALLETS[0]])
    const user = userEvent.setup()
    await open()
    await user.click(screen.getByRole('radio', { name: 'Transferencia' }))
    expect(screen.queryByText('CATEGORÍA')).not.toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /^Desde\s*Bancolombia/ })).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /^Transferir a\s*Elige una billetera/ })).toBeInTheDocument()
    await user.type(screen.getByLabelText('MONTO'), '1000')
    await user.type(screen.getByLabelText('Título'), 'Ahorro')
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
    expect(screen.getByLabelText('Título')).toHaveValue('Gimnasio')
    expect(screen.getByLabelText('Nota')).toHaveValue('Plan anual')
    expect(screen.getByText(/recibo-gym\.jpg/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /^Repetir Cada semana × 4/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Ingreso' })).toBeDisabled()

    await user.clear(screen.getByLabelText('Nota'))
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
