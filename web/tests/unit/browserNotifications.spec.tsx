import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { waitFor } from '@testing-library/react'
import { server } from '../mocks/server'
import { BASE, mockSession, renderApp } from '../utils/renderApp'
import { plainText, useBrowserNotifications } from '@/state/useBrowserNotifications'

const shown: { title: string; body?: string; tag?: string }[] = []
class FakeNotification {
  static permission: NotificationPermission = 'granted'
  onclick: (() => void) | null = null
  constructor(title: string, options?: NotificationOptions) {
    shown.push({ title, body: options?.body, tag: options?.tag })
  }
  close() {}
}

function Probe() {
  useBrowserNotifications()
  return null
}

describe('browser notifications', () => {
  beforeEach(() => {
    shown.length = 0
    localStorage.clear()
    vi.stubGlobal('Notification', FakeNotification)
    mockSession()
    server.use(
      http.get(`${BASE}/accounts`, () => HttpResponse.json([])),
      http.get(`${BASE}/alerts`, () =>
        HttpResponse.json([{ id: 'loan:1', kind: 'LOAN_OPEN', transactionId: '1', loanKind: 'LENT', counterpartyName: 'Camilo Restrepo', outstanding: 420_000, dueDate: '2026-09-15', overdue: false }]),
      ),
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows each live alert once, with its amounts', async () => {
    const view = renderApp(<Probe />)
    await waitFor(() => expect(shown).toHaveLength(1))
    expect(shown[0]).toMatchObject({ tag: 'loan:1' })
    expect(shown[0]!.title).toContain('Camilo Restrepo')
    expect(shown[0]!.body).toContain('$420.000')

    // The next visit doesn't repeat it.
    view.unmount()
    renderApp(<Probe />)
    await new Promise((r) => setTimeout(r, 50))
    expect(shown).toHaveLength(1)
  })

  it('stays quiet without the browser permission', async () => {
    FakeNotification.permission = 'denied'
    renderApp(<Probe />)
    await new Promise((r) => setTimeout(r, 50))
    expect(shown).toHaveLength(0)
    FakeNotification.permission = 'granted'
  })

  it('masks amounts when they are hidden', () => {
    expect(plainText([{ template: 'Te debe {0}', args: [{ amount: 420_000 }] }], (v) => `$${v}`, true)).toBe('Te debe •••')
  })
})
