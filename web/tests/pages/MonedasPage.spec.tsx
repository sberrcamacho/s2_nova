import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import MonedasPage from '@/dashboard/pages/ajustes/MonedasPage'

const cop = { code: 'COP', name: 'Peso colombiano', symbol: '$', decimals: 0, isPrincipal: true, rate: 1, wallets: 3 }
const usd = { code: 'USD', name: 'Dólar estadounidense', symbol: 'US$', decimals: 2, isPrincipal: false, rate: 3950, wallets: 1 }
const eur = { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, isPrincipal: false, rate: 4310, wallets: 0 }
const mxn = { code: 'MXN', name: 'Peso mexicano', symbol: 'MX$', decimals: 2, isPrincipal: false, rate: 215, wallets: 0 }

function mockCurrencies() {
  mockSession()
  server.use(
    http.get(`${BASE}/me/currencies`, () => HttpResponse.json([cop, usd, eur])),
    http.get(`${BASE}/currencies`, () => HttpResponse.json([cop, usd, eur, mxn])),
  )
}

describe('Ajustes › Monedas', () => {
  it('shows the principal, the other currencies and what can be added', async () => {
    mockCurrencies()
    renderApp(<MonedasPage />, { route: '/ajustes/monedas' })

    expect(await screen.findByText('Peso colombiano · COP')).toBeInTheDocument()
    expect(screen.getByText('1 USD = $3.950 · 1 billetera')).toBeInTheDocument()
    expect(screen.getByText('1 EUR = $4.310 · sin billeteras')).toBeInTheDocument()
    // Only a currency without wallets can be removed.
    expect(screen.getAllByRole('button', { name: 'Quitar' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: /Peso mexicano · MXN/ })).toHaveTextContent('1 MXN = $215')
    expect(screen.queryByRole('button', { name: /Euro · EUR/ })).not.toBeInTheDocument()
  })

  it('adds a currency from the catalog', async () => {
    mockCurrencies()
    let posted: unknown = null
    server.use(
      http.post(`${BASE}/me/currencies`, async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json([cop, usd, eur, mxn], { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<MonedasPage />, { route: '/ajustes/monedas' })

    await user.click(await screen.findByRole('button', { name: /Peso mexicano · MXN/ }))
    await waitFor(() => expect(posted).toEqual({ code: 'MXN' }))
    expect(await screen.findByText('1 MXN = $215 · sin billeteras')).toBeInTheDocument()
  })

  it('removes a currency after the two-step confirmation', async () => {
    mockCurrencies()
    let removed = ''
    server.use(
      http.delete(`${BASE}/me/currencies/:code`, ({ params }) => {
        removed = String(params.code)
        return HttpResponse.json([cop, usd])
      }),
    )
    const user = userEvent.setup()
    renderApp(<MonedasPage />, { route: '/ajustes/monedas' })

    await user.click(await screen.findByRole('button', { name: 'Quitar' }))
    const confirm = screen.getByRole('alertdialog')
    expect(confirm).toHaveTextContent('Los movimientos ya registrados en EUR conservan su monto y su tasa')
    await user.click(within(confirm).getByRole('button', { name: 'Continuar' }))
    await user.click(within(confirm).getByRole('button', { name: /Entiendo que EUR se quita de mis monedas/ }))
    await user.click(within(confirm).getByRole('button', { name: 'Quitar moneda' }))

    await waitFor(() => expect(removed).toBe('EUR'))
    await waitFor(() => expect(screen.queryByText(/sin billeteras/)).not.toBeInTheDocument())
  })
})
