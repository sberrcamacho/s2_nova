import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import ReportesPage from '@/dashboard/pages/ReportesPage'

const totals = { income: 4_288_500, expenses: 1_927_100, savings: 2_361_400, savingsRate: 55 }
const report = (range: number) => ({
  range,
  month: '2026-08',
  months: Array.from({ length: range }, (_, i) => ({ month: `2026-${String(9 - range + i).padStart(2, '0')}`, income: 4_000_000, expenses: 2_000_000, net: 2_000_000 })),
  totals,
  previousTotals: totals,
  categories: [
    { categoryId: 'uuid-food', amount: 612_400, previousAmount: 600_000, change: 2, rising: false },
    { categoryId: 'uuid-bills', amount: 95_500, previousAmount: 52_500, change: 82, rising: true },
  ],
  dailyAverage: 91_767,
  peakWeekday: 6,
  fixedShare: 38,
  runwayMonths: 8.4,
  incomeSources: [{ categoryId: 'uuid-salary', merchant: 'Grupo Éxito', amount: 4_400_000, percentage: 100, monthlyMin: 4_400_000, monthlyMax: 4_400_000 }],
  netWorth: {
    wallets: 16_147_300,
    lent: { outstanding: 420_000, people: 1, settled: 1 },
    borrowed: { outstanding: 0, people: 0, settled: 0 },
    history: [{ month: '2026-08', balance: 16_147_300 }],
  },
})

describe('Reportes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 21, 10))
  })
  afterEach(() => vi.useRealTimers())

  function mockReport(requested: string[]) {
    mockSession()
    server.use(
      http.get(`${BASE}/summary/report`, ({ request }) => {
        const range = Number(new URL(request.url).searchParams.get('range'))
        requested.push(new URL(request.url).search)
        return HttpResponse.json(report(range))
      }),
      http.get(`${BASE}/accounts`, () => HttpResponse.json([])),
      http.get(`${BASE}/recurring-series`, () => HttpResponse.json([])),
    )
  }

  it('shows the Gastos figures from the backend report and refetches for another range', async () => {
    const requested: string[] = []
    mockReport(requested)
    const user = userEvent.setup()
    renderApp(<ReportesPage />, { route: '/reportes' })

    expect(await screen.findByText('Sábado')).toBeInTheDocument()
    expect(screen.getByText('38 / 62')).toBeInTheDocument()
    expect(screen.getByText('8,4')).toBeInTheDocument()
    // A category up 50% or more against last month carries its rise.
    expect(screen.getByText('Servicios').parentElement).toHaveTextContent('$95.500 · +82%')
    expect(screen.getByText('Alimentación').parentElement).not.toHaveTextContent('+')
    expect(screen.getByText('Últimos 6 meses')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '3M' }))
    expect(await screen.findByText('Últimos 3 meses')).toBeInTheDocument()
    expect(requested).toEqual(['?range=6&today=2026-08-21', '?range=3&today=2026-08-21'])
  })

  it('opens the tab in the URL and shows the loans outside the wallets', async () => {
    mockReport([])
    renderApp(<ReportesPage />, { route: '/reportes?tab=patrimonio' })

    const lent = (await screen.findByText('Prestado')).parentElement!
    expect(within(lent).getByText('$420.000')).toBeInTheDocument()
    expect(lent).toHaveTextContent('1 persona · 1 saldado')
    expect(screen.getByText('Recibido').parentElement).toHaveTextContent('Sin deudas pendientes')
    expect(screen.getByText('$16.147.300')).toBeInTheDocument()
  })
})
