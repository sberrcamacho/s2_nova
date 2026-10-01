import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import FirstRunPage from '@/auth/FirstRunPage'
import { ProtectedRoute } from '@/dashboard/ProtectedRoute'

const app = (
  <Routes>
    <Route element={<ProtectedRoute />}>
      <Route path="/bienvenida" element={<FirstRunPage />} />
      <Route path="/inicio" element={<div>Pantalla de inicio</div>} />
    </Route>
    <Route path="/register" element={<div>Pantalla de registro</div>} />
  </Routes>
)

function mockFirstRun() {
  mockSession({ onboardingCompleted: false })
  const sent: Record<string, unknown> = {}
  server.use(
    http.get(`${BASE}/accounts`, () => HttpResponse.json([])),
    http.put(`${BASE}/me/currencies/principal`, async ({ request }) => {
      sent.principal = await request.json()
      return HttpResponse.json([])
    }),
    http.post(`${BASE}/accounts`, async ({ request }) => {
      sent.account = await request.json()
      return HttpResponse.json({ id: 'w1', name: 'Nequi', type: 'NEQUI', currency: 'COP', initialBalance: 350000, currentBalance: 350000 }, { status: 201 })
    }),
    http.patch(`${BASE}/me/preferences`, async ({ request }) => {
      sent.preferences = await request.json()
      return HttpResponse.json({})
    }),
    http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  )
  return sent
}

describe('First run', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'languages', { value: ['es-CO'], configurable: true })
  })

  it('sends a new account through currency and first wallet before Inicio', async () => {
    const sent = mockFirstRun()
    const user = userEvent.setup()
    renderApp(app, { route: '/inicio' })

    expect(await screen.findByRole('heading', { name: 'Tu moneda principal' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Peso colombiano · COP/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Detectada en tu navegador · Colombia')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('PASO 2 DE 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear billetera y entrar' })).toBeDisabled()
    await user.type(screen.getByPlaceholderText('Nequi, Bancolombia, Efectivo…'), 'Nequi')
    await user.click(screen.getByRole('radio', { name: 'Nequi' }))
    await user.type(screen.getByPlaceholderText('0'), '350000')
    await user.click(screen.getByRole('button', { name: 'Crear billetera y entrar' }))

    expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument()
    expect(sent.account).toEqual({ name: 'Nequi', type: 'NEQUI', initialBalance: 350000, currency: 'COP' })
    expect(sent.preferences).toEqual({ onboardingCompleted: true, tutorialCompleted: true })
    // COP is already the principal: nothing to change.
    expect(sent.principal).toBeUndefined()
  })

  it('saves another principal currency with the wallet', async () => {
    const sent = mockFirstRun()
    const user = userEvent.setup()
    renderApp(app, { route: '/bienvenida' })

    await user.click(await screen.findByRole('radio', { name: /Dólar estadounidense · USD/ }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('Dólar estadounidense · USD')).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Nequi, Bancolombia, Efectivo…'), 'Wise')
    await user.click(screen.getByRole('button', { name: 'Crear billetera y entrar' }))

    await waitFor(() => expect(sent.principal).toEqual({ code: 'USD' }))
    await waitFor(() => expect(sent.account).toMatchObject({ name: 'Wise', type: 'SAVINGS', currency: 'USD' }))
  })

  it('returns to Crear cuenta from the first step, signed out', async () => {
    mockFirstRun()
    const user = userEvent.setup()
    renderApp(app, { route: '/bienvenida' })

    await user.click(await screen.findByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(screen.getByText('PASO 1 DE 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Volver' }))
    expect(await screen.findByText('Pantalla de registro')).toBeInTheDocument()
  })
})
