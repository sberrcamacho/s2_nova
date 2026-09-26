import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import BilleterasPage from '@/dashboard/pages/BilleterasPage'

const wallets = [
  { id: 'a1', name: 'Bancolombia — Ahorros', type: 'SAVINGS', currency: 'COP', initialBalance: 0, currentBalance: 13_740_000, principalBalance: 13_740_000, movements: 5 },
  { id: 'a2', name: 'Wise — Dólares', type: 'SAVINGS', currency: 'USD', initialBalance: 0, currentBalance: 320, principalBalance: 1_264_000, movements: 1 },
]
const currencies = [
  { code: 'COP', name: 'Peso colombiano', symbol: '$', decimals: 0, isPrincipal: true, rate: 1, wallets: 1 },
  { code: 'USD', name: 'Dólar estadounidense', symbol: 'US$', decimals: 2, isPrincipal: false, rate: 3950, wallets: 1 },
]

function mockWallets() {
  mockSession()
  server.use(
    http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
    http.get(`${BASE}/me/currencies`, () => HttpResponse.json(currencies)),
  )
}

describe('Billeteras', () => {
  it('shows each wallet with its currency, the ≈ principal line and its share', async () => {
    mockWallets()
    renderApp(<BilleterasPage />, { route: '/billeteras' })

    const cop = (await screen.findByText('Bancolombia — Ahorros')).closest('[role=button]')!
    expect(cop).toHaveTextContent('Cuenta de ahorros · COP')
    expect(cop).toHaveTextContent('$13.740.000')
    expect(cop).toHaveTextContent('92% del total')
    const usd = screen.getByText('Wise — Dólares').closest('[role=button]')!
    expect(usd).toHaveTextContent('US$320')
    expect(usd).toHaveTextContent('≈ $1.264.000 8% del total')
  })

  it('creates a wallet in another currency', async () => {
    mockWallets()
    let posted: unknown = null
    server.use(
      http.post(`${BASE}/accounts`, async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({ ...wallets[0], id: 'a3', name: 'Wise — Euros' }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<BilleterasPage />, { route: '/billeteras' })
    await screen.findByText('Bancolombia — Ahorros')

    await user.click(screen.getByRole('button', { name: '+ Nueva billetera' }))
    const dialog = screen.getByRole('dialog', { name: 'Nueva billetera' })
    await user.type(within(dialog).getByPlaceholderText(/Nequi, Bancolombia/), 'Wise — Euros')
    await user.click(within(dialog).getByRole('button', { name: 'Cuenta de ahorros' }))
    await user.click(await within(dialog).findByRole('button', { name: 'USD' }))
    expect(dialog).toHaveTextContent('El saldo se lleva en dólar estadounidense.')
    await user.type(within(dialog).getByPlaceholderText('0'), '150')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(posted).toEqual({ name: 'Wise — Euros', type: 'SAVINGS', initialBalance: 150, currency: 'USD' }))
  })

  it('deletes a wallet after the two-step confirmation', async () => {
    mockWallets()
    let deleted = ''
    server.use(
      http.delete(`${BASE}/accounts/:id`, ({ params }) => {
        deleted = String(params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<BilleterasPage />, { route: '/billeteras' })

    await user.click(await screen.findByText('Bancolombia — Ahorros'))
    await user.click(within(screen.getByRole('dialog', { name: 'Editar billetera' })).getByRole('button', { name: 'Eliminar billetera' }))
    const confirm = screen.getByRole('alertdialog')
    expect(confirm).toHaveTextContent('Saldo actual: $13.740.000')
    expect(confirm).toHaveTextContent('5 movimientos asociados se eliminan con ella')
    await user.click(within(confirm).getByRole('button', { name: 'Continuar' }))
    await user.click(within(confirm).getByRole('button', { name: /Entiendo que se eliminan la billetera y sus 5 movimientos/ }))
    await user.click(within(confirm).getByRole('button', { name: 'Eliminar billetera' }))

    await waitFor(() => expect(deleted).toBe('a1'))
  })
})
