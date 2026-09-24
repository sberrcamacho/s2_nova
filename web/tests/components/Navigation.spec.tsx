import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '@/dashboard/components/Sidebar'
import { dashboardRoutes } from '@/dashboard/routes'
import type { RouteObject } from 'react-router-dom'

function layoutChildren(): RouteObject[] {
  const protectedRoute = dashboardRoutes.find((r) => r.children)!
  return protectedRoute.children![0].children!
}

function Where() {
  const loc = useLocation()
  return <div data-testid="where">{loc.pathname + loc.search}</div>
}

describe('Web v2 navigation', () => {
  it('has the same four primary destinations as Android, in order', () => {
    expect(NAV_ITEMS.map((i) => i.to)).toEqual(['/inicio', '/movimientos', '/planes', '/reportes'])
  })

  it.each([
    ['/overview', '/inicio'],
    ['/transactions', '/movimientos'],
    ['/budgets', '/planes?tab=presupuestos'],
    ['/goals', '/planes?tab=metas'],
    ['/analytics', '/reportes'],
    ['/insights', '/reportes'],
    ['/reports', '/reportes'],
    ['/settings', '/ajustes'],
  ])('redirects %s to %s', (from, to) => {
    const redirects = layoutChildren().filter((r) => r.path && from === `/${r.path}`)
    render(
      <MemoryRouter initialEntries={[from]}>
        <Routes>
          {redirects.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('where')).toHaveTextContent(to)
  })
})
