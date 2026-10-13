import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import { server } from '../mocks/server'
import { BASE, renderApp } from '../utils/renderApp'
import LandingPage from '@/landing/LandingPage'

describe('Landing page', () => {
  it('offers the Android app from the latest release', async () => {
    server.use(http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ error: 'No session.' }, { status: 401 })))
    renderApp(<LandingPage />)

    const download = await screen.findByRole('link', { name: 'Descargar para Android' })
    expect(download).toHaveAttribute('href', 'https://github.com/sberrcamacho/s2_nova/releases/latest/download/s2-nova.apk')
    expect(download).toHaveAccessibleDescription(/Android 12 o superior/)
    expect(screen.getByRole('link', { name: '¿Usas Android? Descarga la app' })).toHaveAttribute('href', download.getAttribute('href'))
  })
})
