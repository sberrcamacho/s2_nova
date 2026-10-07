import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { useState } from 'react'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import { TourProvider, useAutoTour } from '@/components/tour/TourProvider'
import { placePopover, scrimPath } from '@/components/tour/TourOverlay'
import { runnableSteps, TOURS } from '@/components/tour/tours'

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

// jsdom lays nothing out: give every tour target a box so it counts as
// on screen.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return (this.dataset.tour ? { left: 40, top: 40, right: 240, bottom: 90, width: 200, height: 50, x: 40, y: 40 } : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }) as DOMRect
  })
})
afterEach(() => vi.restoreAllMocks())

// Reportes' tour with its breakdown card missing (an empty month).
function ReportesLike({ ready = true }: { ready?: boolean }) {
  useAutoTour('tour.reportes', ready)
  return (
    <div>
      <div data-tour="rep.tabs">Pestañas</div>
      <div data-tour="rep.range">Rango</div>
      <button type="button">Fuera del recorrido</button>
    </div>
  )
}

const dialog = () => screen.findByRole('dialog', {}, { timeout: 2000 })

describe('Product tour', () => {
  it('runs the steps whose element is on screen and marks the tour seen when it ends', async () => {
    mockSession()
    const sent = capturePreferences()
    const user = userEvent.setup()
    renderApp(
      <TourProvider>
        <ReportesLike />
      </TourProvider>,
    )

    expect(await dialog()).toHaveTextContent('Paso 1 de 2')
    expect(screen.getByRole('heading', { name: 'Elige el reporte' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Anterior' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Paso 2 de 2')
    expect(screen.getByRole('heading', { name: 'Cambia el periodo' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Paso 1 de 2')
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.click(screen.getByRole('button', { name: 'Listo' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(sent).toContainEqual({ guidesSeen: ['tour.reportes'] }))
  })

  it('Omitir closes the tour and marks it seen too', async () => {
    mockSession({ guidesSeen: ['inicio'] })
    const sent = capturePreferences()
    const user = userEvent.setup()
    renderApp(
      <TourProvider>
        <ReportesLike />
      </TourProvider>,
    )
    await dialog()
    await user.click(screen.getByRole('button', { name: 'Omitir' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(sent).toContainEqual({ guidesSeen: ['inicio', 'tour.reportes'] }))
  })

  it('Esc skips, the arrows move between steps, and the page behind is inert', async () => {
    mockSession()
    const sent = capturePreferences()
    const user = userEvent.setup()
    renderApp(
      <TourProvider>
        <ReportesLike />
      </TourProvider>,
    )
    await dialog()
    expect(screen.getByRole('button', { name: 'Fuera del recorrido', hidden: true }).closest('[inert]')).not.toBeNull()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('dialog')).toHaveTextContent('Paso 2 de 2')
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('dialog')).toHaveTextContent('Paso 1 de 2')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fuera del recorrido' }).closest('[inert]')).toBeNull()
    await waitFor(() => expect(sent).toContainEqual({ guidesSeen: ['tour.reportes'] }))
  })

  it("doesn't start a tour the user already finished or skipped", async () => {
    mockSession({ guidesSeen: ['tour.reportes'] })
    renderApp(
      <TourProvider>
        <ReportesLike />
      </TourProvider>,
    )
    await act(() => new Promise((r) => setTimeout(r, 700)))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('waits while a dialog is open and starts once it closes', async () => {
    mockSession()
    const modal = document.createElement('div')
    modal.setAttribute('aria-modal', 'true')
    document.body.appendChild(modal)
    renderApp(
      <TourProvider>
        <ReportesLike />
      </TourProvider>,
    )
    await act(() => new Promise((r) => setTimeout(r, 700)))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    act(() => modal.remove())
    expect(await dialog()).toHaveTextContent('Paso 1 de 2')
  })

  it('waits until the page says its data is ready', async () => {
    mockSession()
    const user = userEvent.setup()
    function Loading() {
      const [ready, setReady] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setReady(true)}>
            Cargar
          </button>
          <ReportesLike ready={ready} />
        </>
      )
    }
    renderApp(
      <TourProvider>
        <Loading />
      </TourProvider>,
    )
    await act(() => new Promise((r) => setTimeout(r, 700)))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cargar' }))
    expect(await dialog()).toHaveTextContent('Paso 1 de 2')
  })
})

describe('tour helpers', () => {
  it('leaves out steps whose element is missing, keeps centred ones', () => {
    const present = new Set(['inicio.balance'])
    const steps = runnableSteps(TOURS['tour.welcome'], (s) => (typeof s.target === 'string' && present.has(s.target) ? document.body : null))
    expect(steps.map((s) => s.id)).toEqual(['intro', 'balance'])
  })

  it('places the popover below the target, flips it above, and centres a step without one', () => {
    const view = { width: 1000, height: 800 }
    const pop = { width: 320, height: 180 }
    expect(placePopover({ left: 100, top: 100, width: 200, height: 50 }, pop, view)).toEqual({ left: 40, top: 170 })
    expect(placePopover({ left: 100, top: 600, width: 200, height: 50 }, pop, view).top).toBe(600 - 6 - 14 - 180)
    expect(placePopover(null, pop, view)).toEqual({ left: 340, top: 310 })
    expect(placePopover({ left: 10, top: 100, width: 200, height: 500 }, pop, view, 'right').left).toBe(10 + 200 + 6 + 14)
  })

  it('cuts the padded target out of the scrim', () => {
    expect(scrimPath({ width: 100, height: 80 }, null, 12)).toBe('M0 0H100V80H0Z')
    expect(scrimPath({ width: 100, height: 80 }, { left: 20, top: 20, width: 40, height: 20 }, 0)).toContain('M18 14H')
  })
})
