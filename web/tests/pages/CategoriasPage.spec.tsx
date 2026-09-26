import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../mocks/server'
import { BASE, CATEGORIES, mockSession, renderApp } from '../utils/renderApp'
import CategoriasPage from '@/dashboard/pages/ajustes/CategoriasPage'
import { resetCategoryCache } from '@/lib/backendCategories'

const CLASES = { id: 'uuid-exp.clases', slug: 'exp.clases', name: 'Clases', icon: 'education', color: '#5D6BE8', kind: 'EXPENSE', parentId: null, isCustom: true, hidden: false, usage: 3 }

const row = (name: string) => screen.getAllByRole('button').find((e) => e.getAttribute('role') === 'button' && e.textContent?.startsWith(name))!

describe('Ajustes › Categorías', () => {
  beforeEach(() => resetCategoryCache())

  it('lists the expense taxonomy and switches to Ingresos', async () => {
    mockSession()
    const user = userEvent.setup()
    renderApp(<CategoriasPage />, { route: '/ajustes/categorias' })

    expect(await screen.findByRole('tab', { name: 'Gastos · 14' })).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(row('Alimentación')).toHaveTextContent('4 subcategorías'))
    expect(screen.getByRole('button', { name: 'Mercado' })).toBeInTheDocument()
    expect(screen.getByText('Nueva categoría')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Ingresos · 7' }))
    expect(row('Trabajo')).toHaveTextContent('5 subcategorías')
    expect(screen.getByText(/Tipo: ingreso/)).toBeInTheDocument()
  })

  it('creates a subcategory inside the chosen parent', async () => {
    mockSession()
    let posted: unknown = null
    server.use(
      http.post(`${BASE}/categories`, async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<CategoriasPage />, { route: '/ajustes/categorias' })
    await waitFor(() => row('Alimentación'))

    await user.click(within(row('Alimentación').parentElement!).getByRole('button', { name: '+ Subcategoría' }))
    expect(screen.getByText('Nueva subcategoría en Alimentación')).toBeInTheDocument()
    expect(screen.getByText('Usa el color de Alimentación, así se agrupa igual en gráficos y reportes.')).toBeInTheDocument()
    // A name already used among the siblings is rejected before saving.
    await user.type(screen.getByPlaceholderText('Ej. Clases de música'), 'mercado')
    await user.click(screen.getByRole('button', { name: 'Crear categoría' }))
    expect(screen.getByText('Ya existe una categoría con ese nombre aquí.')).toBeInTheDocument()

    await user.clear(screen.getByPlaceholderText('Ej. Clases de música'))
    await user.type(screen.getByPlaceholderText('Ej. Clases de música'), 'Panadería')
    await user.click(screen.getByRole('button', { name: 'Crear categoría' }))
    await waitFor(() => expect(posted).toEqual({ type: 'EXPENSE', parentId: 'uuid-exp.food', name: 'Panadería' }))
  })

  it('renames and hides a built-in category', async () => {
    mockSession()
    let patched: unknown = null
    server.use(
      http.patch(`${BASE}/categories/:id`, async ({ request, params }) => {
        patched = { id: params.id, ...((await request.json()) as object) }
        return HttpResponse.json({})
      }),
    )
    const user = userEvent.setup()
    renderApp(<CategoriasPage />, { route: '/ajustes/categorias' })
    await waitFor(() => row('Educación'))

    await user.click(row('Educación'))
    expect(screen.getByText('Editar categoría')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar categoría' })).not.toBeInTheDocument()
    await user.clear(screen.getByPlaceholderText('Ej. Clases de música'))
    await user.type(screen.getByPlaceholderText('Ej. Clases de música'), 'Estudios')
    await user.click(screen.getByRole('switch', { name: 'Mostrar al registrar' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(patched).toEqual({ id: 'uuid-exp.education', name: 'Estudios', hidden: true }))
  })

  it('deletes a custom category after the two-step confirmation', async () => {
    mockSession()
    let deleted = ''
    server.use(
      http.get(`${BASE}/categories`, () => HttpResponse.json([...CATEGORIES, CLASES])),
      http.delete(`${BASE}/categories/:id`, ({ params }) => {
        deleted = String(params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    renderApp(<CategoriasPage />, { route: '/ajustes/categorias' })
    await waitFor(() => expect(row('Clases')).toHaveTextContent('Personalizada'))

    await user.click(row('Clases'))
    await user.click(screen.getByRole('button', { name: 'Eliminar categoría' }))
    const confirm = screen.getByRole('alertdialog')
    expect(confirm).toHaveTextContent('3 movimientos pasan a Otros gastos')
    await user.click(within(confirm).getByRole('button', { name: 'Continuar' }))
    await user.click(within(confirm).getByRole('button', { name: /Entiendo que los movimientos se reasignan a Otros gastos/ }))
    await user.click(within(confirm).getByRole('button', { name: 'Eliminar categoría' }))

    await waitFor(() => expect(deleted).toBe('uuid-exp.clases'))
  })
})
