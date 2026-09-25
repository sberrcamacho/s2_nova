import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import AjustesPage from '@/dashboard/pages/AjustesPage'
import ContrasenaPage from '@/dashboard/pages/ajustes/ContrasenaPage'
import EliminarPage from '@/dashboard/pages/ajustes/EliminarPage'

const SESSIONS = [
  { id: 's1', device: 'Chrome · Windows', kind: 'desktop', lastActiveAt: '2026-08-21T10:00:00.000Z', current: true },
  { id: 's2', device: 'S2 Nova app · Pixel 8', kind: 'phone', lastActiveAt: '2026-08-21T08:00:00.000Z', current: false },
]

describe('Ajustes', () => {
  it('shows the profile, the wallet total in the currency line and the open sessions', async () => {
    mockSession()
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json([{ id: 'w1', name: 'Nequi', type: 'BANK_DEBIT', currentBalance: 16_147_300, initialBalance: 0 }])),
      http.get(`${BASE}/me/sessions`, () => HttpResponse.json(SESSIONS)),
    )
    renderApp(<AjustesPage />, { route: '/ajustes' })

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Miembro desde marzo 2024')).toBeInTheDocument()
    expect(await screen.findByText('Peso colombiano, sin decimales · $16.147.300')).toBeInTheDocument()
    expect(await screen.findByText('Este navegador · S2 Nova app · Pixel 8')).toBeInTheDocument()
  })

  it('reverts the notifications switch when the backend rejects it', async () => {
    mockSession()
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json([])),
      http.get(`${BASE}/me/sessions`, () => HttpResponse.json([])),
      http.patch(`${BASE}/me/preferences`, () => new HttpResponse(null, { status: 500 })),
    )
    const user = userEvent.setup()
    renderApp(<AjustesPage />, { route: '/ajustes' })

    const toggle = await screen.findByRole('switch', { name: 'Notificaciones' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    await user.click(toggle)
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
  })

  it('checks the password rules before calling the backend, then confirms the change', async () => {
    mockSession()
    const bodies: unknown[] = []
    server.use(
      http.post(`${BASE}/me/password`, async ({ request }) => {
        bodies.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<ContrasenaPage />, { route: '/ajustes/contrasena' })

    await user.type(await screen.findByLabelText('CONTRASEÑA ACTUAL'), 'Actual123')
    await user.type(screen.getByLabelText('NUEVA CONTRASEÑA'), 'sinnumero')
    await user.type(screen.getByLabelText('CONFIRMAR NUEVA CONTRASEÑA'), 'sinnumero')
    await user.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))
    expect(screen.getByRole('alert')).toHaveTextContent('La nueva contraseña no cumple todos los requisitos.')
    expect(bodies).toEqual([])

    await user.type(screen.getByLabelText('NUEVA CONTRASEÑA'), '1')
    await user.type(screen.getByLabelText('CONFIRMAR NUEVA CONTRASEÑA'), '1')
    await user.click(screen.getByRole('button', { name: 'Actualizar contraseña' }))
    expect(await screen.findByText('Contraseña actualizada. Cerramos tus otras sesiones.')).toBeInTheDocument()
    expect(bodies).toEqual([{ currentPassword: 'Actual123', newPassword: 'sinnumero1' }])
  })

  it('lists what gets deleted and only deletes after the word, the password and the checkbox', async () => {
    mockSession()
    const deletes: unknown[] = []
    server.use(
      http.get(`${BASE}/me/footprint`, () => HttpResponse.json({ transactions: 68, budgets: 6, goals: 4, loans: 1, wallets: 3, recurringSeries: 6 })),
      http.delete(`${BASE}/me`, async ({ request }) => {
        deletes.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<EliminarPage />, { route: '/ajustes/eliminar' })

    expect(await screen.findByText('68 movimientos y todo su historial')).toBeInTheDocument()
    expect(screen.getByText('6 presupuestos, 4 metas y 1 préstamo')).toBeInTheDocument()
    expect(screen.getByText('3 billeteras y todos tus programados')).toBeInTheDocument()

    const submit = screen.getByRole('button', { name: 'Eliminar cuenta definitivamente' })
    await user.type(screen.getByLabelText('ESCRIBE ELIMINAR PARA CONFIRMAR'), 'eliminar')
    await user.type(screen.getByLabelText('CONTRASEÑA ACTUAL'), 'Actual123')
    await user.click(submit)
    expect(deletes).toEqual([])

    await user.click(screen.getByRole('checkbox'))
    await user.click(submit)
    await waitFor(() => expect(deletes).toEqual([{ password: 'Actual123' }]))
  })
})
