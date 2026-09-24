import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import InicioPage from '@/dashboard/pages/InicioPage'

function mockInicio({ alertsFail = false, empty = false } = {}) {
  server.use(
    http.get(`${BASE}/accounts`, () =>
      HttpResponse.json(empty ? [] : [
        { id: 'a1', name: 'Bancolombia', type: 'SAVINGS', initialBalance: 0, currentBalance: 13_740_000 },
        { id: 'a2', name: 'Nequi', type: 'NEQUI', initialBalance: 0, currentBalance: 2_407_300 },
      ]),
    ),
    http.get(`${BASE}/summary/months`, () =>
      HttpResponse.json([{ month: '2026-08', income: empty ? 0 : 4_288_500, expenses: empty ? 0 : 1_927_100, net: 0 }]),
    ),
    http.get(`${BASE}/summary/categories`, () => HttpResponse.json({ month: '2026-08', total: 0, categories: [] })),
    http.get(`${BASE}/alerts`, () =>
      alertsFail
        ? new HttpResponse(null, { status: 500 })
        : HttpResponse.json(empty ? [] : [{ id: 'goal:1', kind: 'GOAL_NEAR', goalId: '1', name: 'Portátil nuevo', themeIcon: 'TECHNOLOGY', percentage: 90, remaining: 520_000 }]),
    ),
    http.get(`${BASE}/goals`, () => HttpResponse.json([])),
    http.get(`${BASE}/recurring-series`, () => HttpResponse.json([])),
  )
}

describe('InicioPage', () => {
  it('shows the wallet-sum hero, month boxes and alerts, and dismisses an alert', async () => {
    mockSession()
    mockInicio()
    const user = userEvent.setup()
    renderApp(<InicioPage />)
    expect(await screen.findByText('$16.147.300')).toBeInTheDocument()
    expect(screen.getByText('$4.288.500')).toBeInTheDocument()
    expect(screen.getByText('2 billeteras')).toBeInTheDocument()
    expect(await screen.findByText('Portátil nuevo está al 90%')).toBeInTheDocument()
    expect(screen.getByText('$520.000').parentElement).toHaveTextContent('Faltan $520.000 para cumplirla.')

    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.queryByText('Portátil nuevo está al 90%')).not.toBeInTheDocument()
    expect(screen.getByText('Sin alertas pendientes.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restaurar' }))
    expect(screen.getByText('Portátil nuevo está al 90%')).toBeInTheDocument()
  })

  it('hides amounts from screen readers when blurBalance is on', async () => {
    mockSession({ blurBalance: true })
    mockInicio()
    renderApp(<InicioPage />)
    const balance = await screen.findByText('$16.147.300')
    expect(balance).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getAllByText('Monto oculto').length).toBeGreaterThan(0)
    // Amounts inside alert copy blur too; the rest of the sentence stays.
    expect(await screen.findByText('$520.000')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('button', { name: 'Mostrar montos' })).toBeInTheDocument()
  })

  it('keeps loaded data and shows the retry banner when a refresh fails', async () => {
    mockSession()
    mockInicio({ alertsFail: true })
    renderApp(<InicioPage />)
    expect(await screen.findByText('$16.147.300')).toBeInTheDocument()
    const banner = await screen.findByRole('status')
    expect(within(banner).getByText('No pudimos actualizar tus datos.')).toBeInTheDocument()
    expect(within(banner).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('renders the empty states for a new user', async () => {
    mockSession()
    mockInicio({ empty: true })
    renderApp(<InicioPage />)
    await waitFor(() => expect(screen.getByText('Agrega tu primera billetera')).toBeInTheDocument())
    expect(screen.getAllByText('$0').length).toBeGreaterThan(0)
    expect(screen.getByText('Nada programado en los próximos 14 días.')).toBeInTheDocument()
    expect(screen.getByText('Sin gastos registrados este mes.')).toBeInTheDocument()
  })
})
