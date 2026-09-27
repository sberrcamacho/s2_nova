import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import { GuideCard } from '@/dashboard/components/GuideCard'

function capturePreferences() {
  const sent: unknown[] = []
  server.use(
    http.patch(`${BASE}/me/preferences`, async ({ request }) => {
      sent.push(await request.json())
      return HttpResponse.json({})
    }),
  )
  return sent
}

describe('GuideCard', () => {
  it("shows the page's guide and marks it seen with Entendido", async () => {
    mockSession()
    const sent = capturePreferences()
    const user = userEvent.setup()
    renderApp(<GuideCard />, { route: '/inicio' })

    const card = await screen.findByRole('region', { name: 'Guía rápida' })
    expect(card).toHaveTextContent('GUÍA RÁPIDA · INICIO')
    expect(card).toHaveTextContent('Tu dinero de un vistazo')
    await user.click(screen.getByRole('button', { name: 'Entendido' }))

    expect(screen.queryByRole('region', { name: 'Guía rápida' })).not.toBeInTheDocument()
    await waitFor(() => expect(sent).toContainEqual({ guidesSeen: ['inicio'] }))
  })

  it('turns every guide off with Omitir guías', async () => {
    mockSession()
    const sent = capturePreferences()
    const user = userEvent.setup()
    renderApp(<GuideCard />, { route: '/reportes' })

    await user.click(await screen.findByRole('button', { name: 'Omitir guías' }))
    await waitFor(() => expect(sent).toContainEqual({ guidesOff: true }))
  })

  it('stays hidden on pages without a guide', async () => {
    mockSession()
    renderApp(<GuideCard />, { route: '/ajustes' })
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('region', { name: 'Guía rápida' })).not.toBeInTheDocument()
  })
})
