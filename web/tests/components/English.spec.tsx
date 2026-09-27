import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import { server } from '../mocks/server'
import { BASE, CATEGORIES, mockSession, renderApp } from '../utils/renderApp'
import { NewTransactionPanel } from '@/components/panels/NewTransactionPanel'
import { setCurrentLanguage } from '@/lib/i18n/translations'
import { ensureCategories, resetCategoryCache } from '@/lib/backendCategories'

function mockPanel(categories = CATEGORIES) {
  mockSession({ language: 'en' })
  server.use(
    http.get(`${BASE}/categories`, () => HttpResponse.json(categories)),
    http.get(`${BASE}/accounts`, () => HttpResponse.json([{ id: '11111111-1111-4111-8111-111111111111', name: 'Nequi', type: 'NEQUI', currency: 'COP', initialBalance: 0, currentBalance: 50 }])),
    http.get(`${BASE}/me/currencies`, () => HttpResponse.json([])),
    http.get(`${BASE}/goals`, () => HttpResponse.json([])),
  )
}

describe('English', () => {
  afterEach(() => {
    setCurrentLanguage('es')
    resetCategoryCache()
  })

  it('shows Nuevo movimiento and the built-in categories in English', async () => {
    mockPanel()
    renderApp(<NewTransactionPanel onClose={() => undefined} />)
    expect(await screen.findByRole('dialog', { name: 'New transaction' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Expense' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Title')).toBeInTheDocument()
    expect(screen.getByText('Save transaction')).toBeInTheDocument()
    screen.getByText('Pick a category').click()
    expect(await screen.findByText('What did you spend on?')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
  })

  it('keeps a category the user renamed as they wrote it', async () => {
    mockPanel(CATEGORIES.map((c) => (c.slug === 'exp.food' ? { ...c, name: 'Comida de casa' } : c)))
    renderApp(<NewTransactionPanel onClose={() => undefined} />)
    // In the app the first service call loads them.
    ensureCategories()
    ;(await screen.findByText('Pick a category')).click()
    expect(await screen.findByText('Comida de casa')).toBeInTheDocument()
    expect(screen.getByText('Housing')).toBeInTheDocument()
  })
})
