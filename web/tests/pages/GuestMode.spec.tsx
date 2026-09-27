import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, renderApp } from '../utils/renderApp'
import LoginPage from '@/auth/LoginPage'
import RegisterPage from '@/auth/RegisterPage'
import { DashboardLayout } from '@/dashboard/DashboardLayout'
import { ProtectedRoute } from '@/dashboard/ProtectedRoute'
import { isGuestMode, setGuestHandler } from '@/lib/apiClient'

const app = (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<DashboardLayout />}>
        <Route path="/inicio" element={<div>Pantalla de inicio</div>} />
      </Route>
    </Route>
  </Routes>
)

describe('Guest mode', () => {
  afterEach(() => setGuestHandler(null))

  it('opens the example account from Login, with the banner and the guides on', async () => {
    server.use(http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })))
    const user = userEvent.setup()
    renderApp(app, { route: '/login' })

    expect(await screen.findByText('Explora una cuenta de ejemplo. No se guarda nada.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuar como invitado' }))

    expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument()
    expect(screen.getByText('Modo invitado.')).toBeInTheDocument()
    expect(screen.getByText('Estás usando datos de ejemplo. No se guarda nada.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Guía rápida' })).toHaveTextContent('Tu dinero de un vistazo')
    expect(isGuestMode()).toBe(true)
  })

  it('leaves the example account for Crear cuenta', async () => {
    server.use(http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })))
    const user = userEvent.setup()
    renderApp(app, { route: '/login' })

    await user.click(await screen.findByRole('button', { name: 'Continuar como invitado' }))
    await user.click(await screen.findByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument()
    expect(screen.queryByText('Modo invitado.')).not.toBeInTheDocument()
    await waitFor(() => expect(isGuestMode()).toBe(false))
  })
})
