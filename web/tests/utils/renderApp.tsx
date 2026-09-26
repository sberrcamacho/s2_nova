import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { ThemeProvider } from '@/state/ThemeContext'
import { ToastProvider } from '@/state/ToastContext'
import { AuthProvider } from '@/state/AuthContext'
import { AppDataProvider } from '@/state/AppDataContext'
import { TAX_NODES } from '@/lib/taxonomy'

export const BASE = 'http://test.local/api/v1'
// GET /categories: the bundled v2 taxonomy, each node's UUID `uuid-<slug>`
// ('uuid-exp.food.groceries').
export const CATEGORIES = TAX_NODES.map((n) => ({
  id: `uuid-${n.id}`,
  slug: n.id,
  name: n.name,
  icon: n.vis,
  color: n.color,
  kind: n.type === 'income' ? 'INCOME' : 'EXPENSE',
  parentId: n.parentId ? `uuid-${n.parentId}` : null,
  isCustom: false,
  hidden: false,
  usage: 0,
}))

// Signed-in session with the given blurBalance preference, plus empty
// transactions/budgets for AppDataProvider unless a test overrides them.
export function mockSession({ blurBalance = false } = {}) {
  server.use(
    http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ accessToken: 't' })),
    http.get(`${BASE}/me`, () =>
      HttpResponse.json({
        id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', createdAt: '2024-03-05T12:00:00.000Z', hasPassword: true,
        preferences: { language: 'es', currency: 'COP', theme: 'SYSTEM', notifications: true, biometricLogin: false, blurBalance, onboardingCompleted: true, tutorialCompleted: true },
      }),
    ),
    http.get(`${BASE}/categories`, () => HttpResponse.json(CATEGORIES)),
    http.get(`${BASE}/transactions`, () => HttpResponse.json([])),
    http.get(`${BASE}/budgets`, () => HttpResponse.json([])),
  )
}

export function renderApp(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppDataProvider>{ui}</AppDataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}
