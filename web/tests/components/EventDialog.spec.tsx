import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import { EventDialog } from '@/dashboard/components/EventDialog'
import type { RecurringSeries } from '@/types'

const SERIES: RecurringSeries = {
  id: 's1',
  name: 'Arriendo',
  type: 'expense',
  amount: 1_200_000,
  accountId: 'a1',
  category: 'exp.home',
  currency: 'COP',
  interval: 'monthly',
  nextOccurrenceDate: '2026-10-05',
  occurrencesDone: 0,
  autoConfirm: false,
  isDue: false,
  active: true,
}

describe('EventDialog', () => {
  it('deletes the series only after a second click', async () => {
    mockSession()
    const deleted: string[] = []
    server.use(
      http.delete(`${BASE}/recurring-series/:id`, ({ params }) => {
        deleted.push(String(params.id))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const onChanged = vi.fn()
    const user = userEvent.setup()
    renderApp(<EventDialog series={SERIES} walletName="Bancolombia" today="2026-09-27" hidden={false} onClose={() => undefined} onChanged={onChanged} />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar serie' }))
    expect(deleted).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }))

    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(deleted).toEqual(['s1'])
  })
})
