import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import BudgetsPage from '@/dashboard/pages/BudgetsPage'
import GoalsPage from '@/dashboard/pages/GoalsPage'

const budget = { id: 'b1', name: null, categoryId: 'uuid-bills', amount: 450_000, spent: 414_000, remaining: 36_000, percentage: 92, status: 'NEAR_LIMIT', month: '2026-09' }
const wallets = [
  { id: 'a1', name: 'Bancolombia — Ahorros', type: 'SAVINGS', initialBalance: 0, currentBalance: 0 },
  { id: 'a2', name: 'Nequi', type: 'DIGITAL_WALLET', initialBalance: 0, currentBalance: 0 },
]

describe('Planes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 23, 10))
  })
  afterEach(() => vi.useRealTimers())

  it('shows a budget card and creates a budget whose category comes from the name', async () => {
    mockSession()
    let posted: unknown = null
    server.use(
      http.get(`${BASE}/budgets`, () => HttpResponse.json([budget])),
      http.post(`${BASE}/budgets`, async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({ ...budget, id: 'b2', name: 'Luz', categoryId: 'uuid-other', amount: 50_000, spent: 0, percentage: 0 }, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<BudgetsPage />, { route: '/planes' })

    const card = (await screen.findByText('Servicios')).closest('button')!
    expect(within(card).getByText('92%')).toBeInTheDocument()
    expect(card).toHaveTextContent('de $450.000')

    await user.click(screen.getByRole('button', { name: /Nuevo presupuesto/ }))
    await user.type(screen.getByLabelText('Nombre'), 'Luz')
    await user.type(screen.getByLabelText('Límite mensual'), '50000')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    // "Luz" suggests Servicios, as on Android.
    await vi.waitFor(() => expect(posted).toEqual({ name: 'Luz', categoryId: 'uuid-bills', amount: 50_000, month: '2026-09' }))
  })

  it('explains a taken category when the backend answers 409', async () => {
    mockSession()
    server.use(
      http.get(`${BASE}/budgets`, () => HttpResponse.json([budget])),
      http.patch(`${BASE}/budgets/:id`, () => HttpResponse.json({ error: 'A budget for this category and month already exists.' }, { status: 409 })),
    )
    const user = userEvent.setup()
    renderApp(<BudgetsPage />, { route: '/planes' })

    await user.click((await screen.findByText('Servicios')).closest('button')!)
    await user.click(screen.getByRole('radio', { name: 'Alimentación' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya tienes un presupuesto para esa categoría este mes.')
  })

  it('deletes a goal returning each wallet its own contribution', async () => {
    mockSession()
    let deleted: unknown = null
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json(wallets)),
      http.get(`${BASE}/goals`, () =>
        HttpResponse.json([
          {
            id: 'g1', name: 'Viaje a Perú', targetAmount: 4_500_000, currentAmount: 1_980_000, remaining: 2_520_000, percentage: 44, themeIcon: 'TRAVEL', targetDate: null,
            contributions: [{ accountId: 'a2', amount: 780_000 }, { accountId: 'a1', amount: 1_200_000 }],
          },
        ]),
      ),
      http.delete(`${BASE}/goals/:id`, async ({ request }) => {
        deleted = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<GoalsPage />, { route: '/planes?tab=metas' })

    await user.click((await screen.findByText('Viaje a Perú')).closest('button')!)
    await user.click(screen.getByRole('button', { name: 'Eliminar meta' }))
    const origin = screen.getByRole('radio', { name: /Devolver a su origen/ })
    expect(origin).toHaveAttribute('aria-checked', 'true')
    expect(origin).toHaveTextContent('Bancolombia $1.200.000 · Nequi $780.000')
    await user.click(screen.getByRole('button', { name: 'Eliminar y devolver $1.980.000' }))
    await vi.waitFor(() => expect(deleted).toEqual({ returnToOrigin: true }))
  })
})
