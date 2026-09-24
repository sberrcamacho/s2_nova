import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import { NewTransactionPanel } from '@/components/panels/NewTransactionPanel'

const WALLETS = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Bancolombia', type: 'SAVINGS', initialBalance: 0, currentBalance: 100 },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Nequi', type: 'NEQUI', initialBalance: 0, currentBalance: 50 },
]

function mockWallets(list = WALLETS) {
  server.use(http.get(`${BASE}/accounts`, () => HttpResponse.json(list)))
}

async function open() {
  const onClose = vi.fn()
  renderApp(<NewTransactionPanel onClose={onClose} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Bancolombia' })).toBeInTheDocument())
  return onClose
}

describe('NewTransactionPanel', () => {
  it('validates amount, description and category in order', async () => {
    mockSession()
    mockWallets()
    const user = userEvent.setup()
    await open()
    const save = screen.getByRole('button', { name: 'Guardar movimiento' })

    await user.click(save)
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe el monto.')
    await user.type(screen.getByLabelText('MONTO'), '25000')
    await user.click(save)
    expect(screen.getByRole('alert')).toHaveTextContent('Escribe una descripción.')
    await user.type(screen.getByLabelText('DESCRIPCIÓN'), 'Algo')
    await user.click(save)
    expect(screen.getByRole('alert')).toHaveTextContent('Elige una categoría.')
  })

  it('suggests a category from the description and posts the expense', async () => {
    mockSession()
    mockWallets()
    let body: Record<string, unknown> | undefined
    server.use(
      http.post(`${BASE}/transactions`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          id: 't1', accountId: WALLETS[0].id, transferToAccountId: null, type: 'EXPENSE', status: 'COMPLETED', amount: 25000, categoryId: 'uuid-food',
          productId: null, budgetId: null, goalId: null, recurringSeriesId: null, loanKind: null, counterpartyName: null, dueDate: null, loanSettledAt: null,
          settledByTransactionId: null, parentLoanId: null, outstanding: null, paymentMethod: 'BANK_TRANSFER', description: 'Mercado semanal', merchant: null, note: null, date: '2026-08-21',
        })
      }),
    )
    const user = userEvent.setup()
    const onClose = await open()
    await user.type(screen.getByLabelText('MONTO'), '25000')
    await user.type(screen.getByLabelText('DESCRIPCIÓN'), 'Mercado semanal')
    expect(screen.getByText('Categoría sugerida: Alimentación')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(body).toMatchObject({ accountId: WALLETS[0].id, type: 'EXPENSE', amount: 25000, categoryId: 'uuid-food', description: 'Mercado semanal' })
    expect(body?.transferToAccountId).toBeUndefined()
  })

  it('requires a destination wallet for a transfer and sends it', async () => {
    mockSession()
    mockWallets([WALLETS[0]])
    const user = userEvent.setup()
    await open()
    await user.click(screen.getByRole('radio', { name: 'Transferencia' }))
    expect(screen.queryByText('CATEGORÍA')).not.toBeInTheDocument()
    expect(screen.getByText('DESDE')).toBeInTheDocument()
    await user.type(screen.getByLabelText('MONTO'), '1000')
    await user.type(screen.getByLabelText('DESCRIPCIÓN'), 'Ahorro')
    await user.click(screen.getByRole('button', { name: 'Guardar movimiento' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Elige la billetera de destino.')
  })
})
