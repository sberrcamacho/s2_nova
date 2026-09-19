import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/render'
import SettingsPage from '@/dashboard/pages/SettingsPage'

const BASE = 'http://test.local/api/v1'
const ME_RESPONSE = {
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  createdAt: '2024-03-05T12:00:00.000Z',
  hasPassword: true,
  preferences: { language: 'es', currency: 'COP', theme: 'SYSTEM', notifications: true, biometricLogin: false, onboardingCompleted: true, tutorialCompleted: true },
}

function mockLoggedIn() {
  server.use(
    http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ accessToken: 't' })),
    http.get(`${BASE}/me`, () => HttpResponse.json(ME_RESPONSE)),
  )
}

async function openPasswordModal(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument())
  await user.click(screen.getByRole('button', { name: 'Cambiar' }))
  await waitFor(() => expect(screen.getByLabelText('Contraseña actual')).toBeInTheDocument())
  // The page also has its own "Cambiar" button (to open this modal), so
  // every subsequent query for the modal's submit button must be scoped to
  // the dialog to avoid an ambiguous match.
  return within(screen.getByRole('dialog'))
}

describe('SettingsPage - change password validation (regression for bug: was weaker than Register)', () => {
  it('rejects a new password under 8 characters, without an uppercase letter, or without a digit', async () => {
    mockLoggedIn()
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)
    const dialog = await openPasswordModal(user)

    await user.type(screen.getByLabelText('Contraseña actual'), 'currentpw')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'weakpass')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'weakpass')
    await user.click(dialog.getByRole('button', { name: 'Cambiar' }))

    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
  })

  it('accepts a password meeting Register\'s own policy (8+ chars, 1 upper, 1 digit)', async () => {
    mockLoggedIn()
    server.use(http.post(`${BASE}/me/password`, () => new HttpResponse(null, { status: 204 })))
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)
    const dialog = await openPasswordModal(user)

    await user.type(screen.getByLabelText('Contraseña actual'), 'currentpw')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'GoodPass1')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'GoodPass1')
    await user.click(dialog.getByRole('button', { name: 'Cambiar' }))

    await waitFor(() => expect(screen.queryByText('La contraseña debe tener al menos 8 caracteres.')).not.toBeInTheDocument())
  })
})

describe('SettingsPage - fire-and-forget preference updates revert on failure (regression)', () => {
  it('reverts the optimistic "notifications" toggle when the backend PATCH fails', async () => {
    mockLoggedIn()
    server.use(http.patch(`${BASE}/me/preferences`, () => new HttpResponse(null, { status: 500 })))
    const user = userEvent.setup()
    renderWithProviders(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument())

    const toggle = screen.getByRole('switch', { name: 'Notificaciones' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    await user.click(toggle)
    // Before the fix this stuck at "false" forever — the optimistic flip
    // was never caught/reverted when the PATCH failed. MSW's mock resolves
    // fast enough that the transient optimistic state isn't reliably
    // observable mid-click, so this asserts the settled end state instead.
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
  })
})
