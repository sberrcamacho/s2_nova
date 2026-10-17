import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import InicioPage from '@/dashboard/pages/InicioPage'

function mockInicio({ alertsFail = false, empty = false, suggestions = [] as unknown[] } = {}) {
  server.use(
    http.get(`${BASE}/suggestions`, () => HttpResponse.json(suggestions)),
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
        : HttpResponse.json(empty ? [] : [{ id: 'loan:1', kind: 'LOAN_OPEN', transactionId: '1', loanKind: 'LENT', counterpartyName: 'Camilo Restrepo', outstanding: 420_000, dueDate: '2026-09-15', overdue: false }]),
    ),
    http.get(`${BASE}/goals`, () => HttpResponse.json([])),
    http.get(`${BASE}/recurring-series`, () => HttpResponse.json([])),
    http.get(`${BASE}/summary/report`, () =>
      HttpResponse.json({
        categories: [],
        incomeSources: [],
        netWorth: { history: [{ month: '2026-07', balance: 15_000_000, netWorth: 15_000_000 }, { month: '2026-08', balance: 16_147_300, netWorth: 16_567_300 }] },
      }),
    ),
  )
}

describe('InicioPage', () => {
  it('shows the wallet-sum hero, month boxes and alerts, and dismisses an alert', async () => {
    mockSession()
    mockInicio()
    const user = userEvent.setup()
    renderApp(<InicioPage />)
    expect(await screen.findByText('$16.147.300')).toBeInTheDocument()
    expect(screen.getByText('+$4.288.500')).toBeInTheDocument()
    // The stat tile is announced as one sentence.
    expect(screen.getByText('Ingresos del mes, +$4.288.500')).toBeInTheDocument()
    expect(screen.getByText('2 billeteras')).toBeInTheDocument()
    expect(await screen.findByText('Camilo Restrepo te debe')).toBeInTheDocument()
    expect(screen.getByText('$420.000').parentElement).toHaveTextContent('$420.000 · vence 15 sep.')

    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.queryByText('Camilo Restrepo te debe')).not.toBeInTheDocument()
    expect(screen.getByText('Sin alertas pendientes.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Restaurar' }))
    expect(screen.getByText('Camilo Restrepo te debe')).toBeInTheDocument()
  })

  it('lists a movement read from a bank notification, prefilled when recorded, and dismisses it', async () => {
    const dismissed: string[] = []
    mockSession()
    mockInicio({
      suggestions: [{ id: 's1', sourceApp: 'com.todo1.mobile', appLabel: 'Bancolombia', type: 'EXPENSE', amount: 25_000, currency: 'COP', merchant: 'EXITO CALLE 80', categoryId: 'uuid-exp.food.groceries', accountId: 'a1', occurredAt: '2026-08-21T14:05:00.000Z', status: 'PENDING', transactionId: null, parsedBy: 'RULES' }],
    })
    server.use(http.post(`${BASE}/suggestions/:id/dismiss`, ({ params }) => (dismissed.push(String(params.id)), new HttpResponse(null, { status: 204 }))))
    const user = userEvent.setup()
    renderApp(<InicioPage />)

    const title = (_: string, el: Element | null) => el?.tagName === 'DIV' && el.textContent === '¿Registrar gasto de $25.000?'
    expect(await screen.findByText(title)).toBeInTheDocument()
    expect(screen.getByText('Leído de Bancolombia')).toBeInTheDocument()
    expect(screen.getByText(/EXITO CALLE 80 · Bancolombia/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Descartar: EXITO CALLE 80' }))
    expect(screen.queryByText(title)).not.toBeInTheDocument()
    await waitFor(() => expect(dismissed).toEqual(['s1']))
  })

  it('charts the balance at each month close, named for screen readers', async () => {
    mockSession()
    mockInicio()
    renderApp(<InicioPage />)
    expect(await screen.findByRole('button', { name: /^Saldo al cierre de cada mes: Jul \$15\.000\.000, Ago \$16\.147\.300\./ })).toBeInTheDocument()
  })

  it('hides amounts from screen readers when blurBalance is on', async () => {
    mockSession({ blurBalance: true })
    mockInicio()
    renderApp(<InicioPage />)
    const balance = await screen.findByText('$16.147.300')
    expect(balance).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getAllByText('Monto oculto').length).toBeGreaterThan(0)
    // Amounts inside alert copy blur too; the rest of the sentence stays.
    expect(await screen.findByText('$420.000')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('button', { name: 'Ocultar montos' })).toHaveAttribute('aria-pressed', 'true')
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
    expect(screen.getByText('Aún no tienes metas.')).toBeInTheDocument()
  })
})
