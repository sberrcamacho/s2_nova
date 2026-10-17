import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/render'
import LockPage from '@/auth/LockPage'

// Google's real button needs its script; this stand-in hands back a token.
vi.mock('@/auth/GoogleSignInButton', () => ({
  GoogleSignInButton: ({ onToken }: { onToken: (token: string) => void }) => (
    <button type="button" onClick={() => onToken('google-token')}>Continuar con Google</button>
  ),
}))

const BASE = 'http://test.local/api/v1'
const me = (id: string, hasPassword: boolean, hasGoogle: boolean) => ({
  id,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  createdAt: '2024-03-05T12:00:00.000Z',
  hasPassword,
  hasGoogle,
  preferences: { language: 'es', currency: 'COP', theme: 'SYSTEM', notifications: true, biometricLogin: false, blurBalance: false, onboardingCompleted: true, tutorialCompleted: true, autoLockMinutes: 5 },
})

function lock(hasPassword: boolean, hasGoogle: boolean) {
  localStorage.setItem('s2nova.session', '0')
  localStorage.setItem('s2nova.lockedAccount', JSON.stringify({ userId: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', hasPassword, hasGoogle }))
}

function renderLock() {
  return renderWithProviders(
    <Routes>
      <Route path="/bloqueo" element={<LockPage />} />
      <Route path="/movimientos" element={<div>Movimientos</div>} />
      <Route path="/login" element={<div>Pantalla de login</div>} />
    </Routes>,
    { route: '/bloqueo' },
  )
}

describe('LockPage', () => {
  afterEach(() => localStorage.clear())

  it('asks only for the password of the locked account', async () => {
    lock(true, false)
    const logins: unknown[] = []
    server.use(
      http.post(`${BASE}/auth/login`, async ({ request }) => {
        logins.push(await request.json())
        return HttpResponse.json({ accessToken: 't', user: { id: 'u1', name: 'Ada', email: 'ada@example.com' } })
      }),
      http.get(`${BASE}/me`, () => HttpResponse.json(me('u1', true, false))),
    )
    const user = userEvent.setup()
    renderLock()

    expect(await screen.findByText('Sesión bloqueada')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continuar con Google' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('CORREO')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('CONTRASEÑA'), 'Secret123')
    await user.click(screen.getByRole('button', { name: 'Desbloquear' }))
    await waitFor(() => expect(logins).toEqual([{ email: 'ada@example.com', password: 'Secret123' }]))
    expect(localStorage.getItem('s2nova.lockedAccount')).toBeNull()
  })

  it('offers only Google for an account created with Google', async () => {
    lock(false, true)
    server.use(
      http.post(`${BASE}/auth/google`, () => HttpResponse.json({ accessToken: 't', user: { id: 'u1', name: 'Ada', email: 'ada@example.com' } })),
      http.get(`${BASE}/me`, () => HttpResponse.json(me('u1', false, true))),
    )
    const user = userEvent.setup()
    renderLock()

    expect(await screen.findByText('Sesión bloqueada')).toBeInTheDocument()
    expect(screen.queryByLabelText('CONTRASEÑA')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuar con Google' }))
    await waitFor(() => expect(localStorage.getItem('s2nova.lockedAccount')).toBeNull())
  })

  it('shows both on an account with a password and Google', async () => {
    lock(true, true)
    renderLock()
    expect(await screen.findByLabelText('CONTRASEÑA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument()
  })

  it('signs a different Google account straight back out', async () => {
    lock(false, true)
    let loggedOut = false
    server.use(
      http.post(`${BASE}/auth/google`, () => HttpResponse.json({ accessToken: 't', user: { id: 'u2', name: 'Otra', email: 'otra@example.com' } })),
      http.get(`${BASE}/me`, () => HttpResponse.json(me('u2', false, true))),
      http.post(`${BASE}/auth/logout`, () => {
        loggedOut = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderLock()

    await user.click(await screen.findByRole('button', { name: 'Continuar con Google' }))
    expect(await screen.findByText('Esa cuenta de Google no es la de esta sesión.')).toBeInTheDocument()
    expect(loggedOut).toBe(true)
    expect(localStorage.getItem('s2nova.lockedAccount')).not.toBeNull()
  })

  it('"Cerrar sesión" forgets the account and goes to Login', async () => {
    lock(true, false)
    const user = userEvent.setup()
    renderLock()

    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument()
    expect(localStorage.getItem('s2nova.lockedAccount')).toBeNull()
  })
})
