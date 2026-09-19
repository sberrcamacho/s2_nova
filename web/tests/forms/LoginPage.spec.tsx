import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/render'
import LoginPage from '@/auth/LoginPage'

const BASE = 'http://test.local/api/v1'

function mockLoggedOut() {
  server.use(http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })))
}

describe('LoginPage validation', () => {
  it('rejects a malformed email and a too-short password together, without submitting', async () => {
    mockLoggedOut()
    const user = userEvent.setup()
    let loginCalls = 0
    server.use(http.post(`${BASE}/auth/login`, () => { loginCalls++; return HttpResponse.json({}) }))
    renderWithProviders(<LoginPage />)
    await waitFor(() => expect(screen.getByLabelText('CORREO')).toBeInTheDocument())

    await user.type(screen.getByLabelText('CORREO'), 'not-an-email')
    await user.type(screen.getByLabelText('CONTRASEÑA'), 'short')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText(/correo válido/i)).toBeInTheDocument()
    expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument()
    expect(loginCalls).toBe(0)
  })

  it('surfaces the backend error message on a valid but rejected login', async () => {
    mockLoggedOut()
    server.use(http.post(`${BASE}/auth/login`, () => HttpResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 })))
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await waitFor(() => expect(screen.getByLabelText('CORREO')).toBeInTheDocument())

    await user.type(screen.getByLabelText('CORREO'), 'ada@example.com')
    await user.type(screen.getByLabelText('CONTRASEÑA'), 'GoodPass1')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Credenciales inválidas.')).toBeInTheDocument()
  })
})
