import { afterEach, describe, expect, it } from 'vitest'
import { useAutoTour } from '@/components/tour/TourProvider'
import { http, HttpResponse } from 'msw'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, renderApp } from '../utils/renderApp'
import LoginPage from '@/auth/LoginPage'
import RegisterPage from '@/auth/RegisterPage'
import { DashboardLayout } from '@/dashboard/DashboardLayout'
import { ProtectedRoute } from '@/dashboard/ProtectedRoute'
import { isGuestMode, setGuestHandler } from '@/lib/apiClient'
import AjustesPage from '@/dashboard/pages/AjustesPage'
import EliminarPage from '@/dashboard/pages/ajustes/EliminarPage'
import { AccountOnly } from '@/dashboard/AccountOnly'

const app = (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<DashboardLayout />}>
        <Route path="/inicio" element={<InicioStub />} />
        <Route path="/ajustes" element={<AjustesPage />} />
        <Route path="/ajustes/eliminar" element={<AccountOnly><EliminarPage /></AccountOnly>} />
      </Route>
    </Route>
  </Routes>
)

// Inicio asks for the general tour as soon as it is drawn.
function InicioStub() {
  useAutoTour('tour.welcome', true)
  const navigate = useNavigate()
  return (
    <div>
      Pantalla de inicio
      <button type="button" onClick={() => navigate('/ajustes/eliminar')}>
        Ir a eliminar cuenta
      </button>
    </div>
  )
}

describe('Guest mode', () => {
  afterEach(() => setGuestHandler(null))

  it('opens the example account from Login, with the banner and the welcome tour', async () => {
    server.use(http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })))
    const user = userEvent.setup()
    renderApp(app, { route: '/login' })

    expect(await screen.findByText('Explora una cuenta de ejemplo. No se guarda nada.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuar como invitado' }))

    expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument()
    expect(screen.getByText('Modo invitado.')).toBeInTheDocument()
    expect(screen.getByText('Estás usando datos de ejemplo. No se guarda nada.')).toBeInTheDocument()
    expect(await screen.findByRole('dialog', {}, { timeout: 2000 })).toHaveTextContent('Te damos la bienvenida a S2 Nova')
    expect(isGuestMode()).toBe(true)
  })

  it("doesn't offer the example account to rename itself, change the password, reset or delete it", async () => {
    server.use(http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })))
    const user = userEvent.setup()
    renderApp(app, { route: '/login' })

    await user.click(await screen.findByRole('button', { name: 'Continuar como invitado' }))
    await screen.findByRole('dialog', {}, { timeout: 2000 })
    await user.keyboard('{Escape}')
    // A direct link to an account page lands back on Ajustes.
    await user.click(screen.getByRole('button', { name: 'Ir a eliminar cuenta' }))

    expect(await screen.findByText(/Estás en modo invitado. Crea una cuenta para cambiar tu nombre/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar perfil' })).not.toBeInTheDocument()
    expect(screen.queryByText('Contraseña')).not.toBeInTheDocument()
    expect(screen.queryByText('Zona de riesgo')).not.toBeInTheDocument()
    expect(screen.queryByText(/TELÉFONO|Ciudad/)).not.toBeInTheDocument()
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
