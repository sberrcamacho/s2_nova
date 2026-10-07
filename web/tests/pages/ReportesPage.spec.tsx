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
    { categoryId: 'uuid-exp.food', amount: 612_400, previousAmount: 600_000, change: 2, rising: false },
    { categoryId: 'uuid-exp.transportation', amount: 95_500, previousAmount: 52_500, change: 82, rising: true },
  ],
  subcategories: [
    { categoryId: 'uuid-exp.food.groceries', amount: 400_000 },
    { categoryId: 'uuid-exp.food', amount: 212_400 },
    { categoryId: 'uuid-exp.transportation', amount: 95_500 },
  ],
  dailyAverage: 91_767,
  peakWeekday: 6,
  fixedShare: 38,
  fixedAmount: 732_300,
  runwayMonths: 8.4,
  incomeSources: [
    { categoryId: 'uuid-inc.work.salary', merchant: 'Grupo Éxito', amount: 4_400_000, percentage: 84, monthlyMin: 4_400_000, monthlyMax: 4_400_000 },
    { categoryId: 'uuid-inc.work.freelance', merchant: 'Estudio Andina', amount: 880_000, percentage: 16, monthlyMin: 350_000, monthlyMax: 1_200_000 },
  ],
  netWorth: {
    wallets: 16_147_300,
    lent: { outstanding: 420_000, people: 1, settled: 1 },
    borrowed: { outstanding: 100_000, people: 1, settled: 0 },
    total: 16_467_300,
    history: [
      { month: '2026-07', balance: 15_000_000, netWorth: 15_320_000 },
      { month: '2026-08', balance: 16_147_300, netWorth: 16_467_300 },
    ],
  },
  changes: {
    current: 900_000,
    previous: 700_000,
    categories: [
      { categoryId: 'uuid-exp.transportation', current: 95_500, previous: 52_500, delta: 43_000 },
      { categoryId: 'uuid-exp.food', current: 500_000, previous: 530_000, delta: -30_000 },
    ],
  },
})

const weekly = {
  id: 's1', name: 'Mercado semanal', type: 'EXPENSE', amount: 100_000, currency: 'COP', accountId: 'a1', categoryId: 'uuid-exp.food', subcategoryId: null,
  interval: 'WEEKLY', nextOccurrenceDate: '2026-08-24', occurrences: null, occurrencesDone: 0, endDate: null, autoConfirm: false, isDue: false, active: true,
}

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
      http.get(`${BASE}/accounts`, () => HttpResponse.json([{ id: 'a1', name: 'Bancolombia', type: 'SAVINGS', initialBalance: 0, currentBalance: 1_000_000 }])),
      http.get(`${BASE}/recurring-series`, () => HttpResponse.json([weekly])),
    )
  }

  it('opens Gastos with what changed, the month breakdown and the explained figures, and refetches for another range', async () => {
    const requested: string[] = []
    mockReport(requested)
    const user = userEvent.setup()
    renderApp(<ReportesPage />, { route: '/reportes' })

    // ¿Qué cambió?: the 1st–21st of August against the same days of July.
    expect(await screen.findByText('Hasta hoy gastaste $200.000 más que en el mismo periodo de julio.')).toBeInTheDocument()
    expect(screen.getByText('Del 1 al 21 de agosto, frente a los mismos días de julio')).toBeInTheDocument()
    expect(screen.getByText('↑ +$43.000')).toBeInTheDocument()
    expect(screen.getByText('↓ −$30.000')).toBeInTheDocument()

    // The breakdown names its month; the old KPIs are gone.
    expect(screen.getByText('En qué se fue el dinero en agosto')).toBeInTheDocument()
    expect(screen.queryByText('Gasto diario promedio')).not.toBeInTheDocument()
    expect(screen.queryByText('Día con más gasto')).not.toBeInTheDocument()
    expect(screen.queryByText('Exportar CSV')).not.toBeInTheDocument()
    expect(screen.getByText('$732.300')).toBeInTheDocument()
    expect(screen.getByText('$1.194.800')).toBeInTheDocument()
    expect(screen.getByText('Tu saldo cubre 8,4 meses de gastos')).toBeInTheDocument()
    expect(screen.getByText('Saldo de hoy ÷ gasto mensual promedio de los últimos 6 meses.')).toBeInTheDocument()

    // A category up 50% or more against last month carries its rise.
    const breakdown = screen.getByText('En qué se fue el dinero en agosto').closest('[data-tour]') as HTMLElement
    expect(within(breakdown).getByText('Transporte').parentElement).toHaveTextContent('$95.500 · ↑ 82%')
    expect(within(breakdown).getByText('Alimentación').parentElement).not.toHaveTextContent('↑')

    // "Subcategorías": leaves, and parent-only spending under the parent.
    await user.click(screen.getByRole('radio', { name: 'Subcategorías' }))
    expect(within(breakdown).getByText('Alimentación · Mercado')).toBeInTheDocument()
    expect(within(breakdown).getByText('Alimentación').parentElement).toHaveTextContent('$212.400')

    await user.click(screen.getByRole('radio', { name: '3M' }))
    expect((await screen.findAllByText('Últimos 3 meses')).length).toBeGreaterThan(0)
    expect(requested).toEqual(['?range=6&today=2026-08-21', '?range=3&today=2026-08-21'])
  })

  it('shows income sources without the freelance note and the month-over-month change', async () => {
    mockReport([])
    renderApp(<ReportesPage />, { route: '/reportes?tab=ingresos' })

    expect(await screen.findByText('Salario — Grupo Éxito')).toBeInTheDocument()
    expect(screen.getByText('Freelance — Estudio Andina')).toBeInTheDocument()
    expect(screen.queryByText(/lo freelance es la parte variable/)).not.toBeInTheDocument()
    expect(screen.getByText('Cambio mes a mes')).toBeInTheDocument()
    // Flat income: no change, and a dash for the first month.
    expect(screen.getAllByText('0 %').length).toBe(5)
    expect(screen.getAllByText('—').length).toBe(1)
    expect(screen.getByRole('radiogroup', { name: 'Periodo' })).toBeInTheDocument()
  })

  it('projects every occurrence through the end of next month, with each month close', async () => {
    mockReport([])
    renderApp(<ReportesPage />, { route: '/reportes?tab=flujo' })

    expect(await screen.findByText('Proyección hasta fin de septiembre')).toBeInTheDocument()
    // The weekly Programado repeats: Aug 24 and 31, then Sep 7, 14, 21, 28.
    expect((await screen.findAllByText('Mercado semanal')).length).toBe(6)
    expect(screen.getByText('Saldo estimado al cierre de agosto').parentElement).toHaveTextContent('$800.000')
    expect(screen.getByText('Saldo estimado al cierre de septiembre').parentElement).toHaveTextContent('$400.000')
    expect(screen.queryByText('Entradas')).not.toBeInTheDocument()
    // The range doesn't apply here.
    expect(screen.queryByRole('radiogroup', { name: 'Periodo' })).not.toBeInTheDocument()
  })

  it('adds up the real net worth and keeps the loans card', async () => {
    mockReport([])
    renderApp(<ReportesPage />, { route: '/reportes?tab=patrimonio' })

    expect((await screen.findByText('Te deben')).parentElement).toHaveTextContent('+$420.000')
    expect(screen.getByText('Debes').parentElement).toHaveTextContent('−$100.000')
    expect(screen.getByText('Billeteras').parentElement).toHaveTextContent('$16.147.300')
    expect(screen.getAllByText('$16.467.300').length).toBeGreaterThan(0)

    const lent = screen.getByText('Prestado').parentElement!
    expect(within(lent).getByText('$420.000')).toBeInTheDocument()
    expect(lent).toHaveTextContent('1 persona · 1 saldado')
    expect(screen.queryByRole('radiogroup', { name: 'Periodo' })).not.toBeInTheDocument()
  })
})
