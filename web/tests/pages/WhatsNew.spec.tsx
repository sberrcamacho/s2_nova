import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockSession, renderApp } from '../utils/renderApp'
import { WhatsNewDialog } from '@/dashboard/components/WhatsNewDialog'
import NovedadesPage from '@/dashboard/pages/ajustes/NovedadesPage'
import { CHANGELOG, changelogImage, markWhatsNewSeen, pendingWhatsNew } from '@/lib/changelog'

const latest = CHANGELOG[0]!

describe('Novedades', () => {
  afterEach(() => localStorage.clear())

  it('shows the newest version once, to accounts older than it', () => {
    const older = { isGuest: false, memberSince: '2026-01-05' }
    expect(pendingWhatsNew(older)?.version).toBe(latest.version)
    markWhatsNewSeen(latest.version)
    expect(pendingWhatsNew(older)).toBeNull()
    // Seen an earlier one: this one is new.
    markWhatsNewSeen('0.9.0')
    expect(pendingWhatsNew(older)?.version).toBe(latest.version)
  })

  it('skips it for a new account and for the guest', () => {
    expect(pendingWhatsNew({ isGuest: false, memberSince: latest.date })).toBeNull()
    expect(localStorage.getItem('s2nova.whatsNewSeen')).toBe(latest.version)
    localStorage.clear()
    expect(pendingWhatsNew({ isGuest: true, memberSince: '2026-01-05' })).toBeNull()
  })

  it('every item has a capture in both themes', () => {
    for (const item of CHANGELOG.flatMap((v) => v.items)) {
      expect(changelogImage(item.image, 'light'), item.image).toBeTruthy()
      expect(changelogImage(item.image, 'dark'), item.image).toBeTruthy()
    }
  })

  it('walks through the features and closes on the last one', async () => {
    mockSession()
    const onClose = vi.fn()
    const onSeeAll = vi.fn()
    const user = userEvent.setup()
    renderApp(<WhatsNewDialog version={latest} onClose={onClose} onSeeAll={onSeeAll} />)

    expect(await screen.findByRole('dialog', { name: `Novedades · versión ${latest.version}` })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: latest.items[0]!.title.es })).toBeInTheDocument()
    expect(screen.getByText(`1 de ${latest.items.length}`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByRole('heading', { name: latest.items[1]!.title.es })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByRole('heading', { name: latest.items[0]!.title.es })).toBeInTheDocument()

    for (let i = 1; i < latest.items.length; i++) await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(screen.getByText(`${latest.items.length} de ${latest.items.length}`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Entendido' }))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Ver todas las novedades' }))
    expect(onSeeAll).toHaveBeenCalledTimes(1)
  })

  it('lists every version with its changes', async () => {
    mockSession()
    renderApp(<NovedadesPage />)
    for (const version of CHANGELOG) {
      expect(await screen.findByRole('heading', { name: `Versión ${version.version}` })).toBeInTheDocument()
      for (const item of version.items) expect(screen.getByRole('heading', { name: item.title.es })).toBeInTheDocument()
    }
    expect(screen.getByText('Esta versión')).toBeInTheDocument()
  })
})
