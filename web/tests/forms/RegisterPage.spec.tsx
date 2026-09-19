import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/render'
import RegisterPage from '@/auth/RegisterPage'

const BASE = 'http://test.local/api/v1'

function mockLoggedOut() {
  server.use(http.post(`${BASE}/auth/refresh`, () => new HttpResponse(null, { status: 401 })))
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, { name, email, password, agree = true }: { name: string; email: string; password: string; agree?: boolean }) {
  // Exact-match the field labels ("NOMBRE"/"CORREO"/"CONTRASEÑA") rather
  // than a loose /contraseña/i regex — the password field's show/hide
  // toggle button also carries an aria-label containing "contraseña",
  // which a case-insensitive substring match ambiguously matches too.
  if (name) await user.type(screen.getByLabelText('NOMBRE'), name)
  if (email) await user.type(screen.getByLabelText('CORREO'), email)
  if (password) await user.type(screen.getByLabelText('CONTRASEÑA'), password)
  if (agree) await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
}

describe('RegisterPage validation', () => {
  it('rejects a password under 8 characters, without a digit, or without an uppercase letter', async () => {
    mockLoggedOut()
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)
    await waitFor(() => expect(screen.getByLabelText('CORREO')).toBeInTheDocument())

    await fillAndSubmit(user, { name: 'Ada', email: 'ada@example.com', password: 'short1a' })
    expect(await screen.findByText(/al menos 8 caracteres/i)).toBeInTheDocument()
  })

  it('rejects a malformed email', async () => {
    mockLoggedOut()
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)
    await waitFor(() => expect(screen.getByLabelText('CORREO')).toBeInTheDocument())

    await fillAndSubmit(user, { name: 'Ada', email: 'not-an-email', password: 'GoodPass1' })
    expect(await screen.findByText(/correo válido/i)).toBeInTheDocument()
  })

  it('requires agreeing to terms before submitting', async () => {
    mockLoggedOut()
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)
    await waitFor(() => expect(screen.getByLabelText('CORREO')).toBeInTheDocument())

    await fillAndSubmit(user, { name: 'Ada', email: 'ada@example.com', password: 'GoodPass1', agree: false })
    expect(await screen.findByText('Debes aceptar los Términos para continuar.')).toBeInTheDocument()
  })

  it('submits and navigates once every field is valid', async () => {
    mockLoggedOut()
    server.use(
      http.post(`${BASE}/auth/register`, () => HttpResponse.json({ accessToken: 't', user: { id: 'u1', name: 'Ada', email: 'ada@example.com' } })),
      http.get(`${BASE}/me`, () =>
        HttpResponse.json({ id: 'u1', name: 'Ada', email: 'ada@example.com', createdAt: '2026-01-01', hasPassword: true, preferences: null }),
      ),
    )
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)
    await waitFor(() => expect(screen.getByLabelText('CORREO')).toBeInTheDocument())

    await fillAndSubmit(user, { name: 'Ada', email: 'ada@example.com', password: 'GoodPass1' })
    await waitFor(() => expect(screen.queryByText(/al menos 8 caracteres/i)).not.toBeInTheDocument())
  })
})
