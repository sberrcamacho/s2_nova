import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, within } from '@testing-library/react'
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

  // Google's OAuth homepage requirements: it explains the Google data the app
  // uses and links the privacy policy set on the consent screen.
  it('explains the Google data it uses and links the privacy policy and terms', async () => {
    server.use(http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ error: 'No session.' }, { status: 401 })))
    renderApp(<LandingPage />)

    expect(await screen.findByRole('heading', { name: 'Qué datos usa S2 Nova' })).toBeInTheDocument()
    expect(screen.getByText(/recibe solo tu nombre, tu correo y tu identificador de Google/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Lee la política de privacidad/ })).toHaveAttribute('href', '/privacy.html')
    const legal = screen.getByRole('navigation', { name: 'Información legal' })
    expect(within(legal).getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute('href', '/privacy.html')
    expect(within(legal).getByRole('link', { name: 'Términos' })).toHaveAttribute('href', '/terms.html')
  })
})
