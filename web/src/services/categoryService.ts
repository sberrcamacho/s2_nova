import { apiClient } from '@/lib/apiClient'
import { categoryIdFor, refreshCategories } from '@/lib/backendCategories'
import type { CategoryId } from '@/types'

// Ajustes › Categorías (CATEGORY_SYSTEM.md §7b): rename or re-icon any
// node, hide built-ins, create and delete custom ones. Every write reloads
// the shared registry so all screens pick the change up.
export const categoryService = {
  async create(input: { income: boolean; parentId?: CategoryId | null; name: string; vis?: string }): Promise<void> {
    await apiClient.post('/categories', {
      type: input.income ? 'INCOME' : 'EXPENSE',
      parentId: input.parentId ? await categoryIdFor(input.parentId) : undefined,
      name: input.name,
      icon: input.parentId ? undefined : input.vis,
    })
    await refreshCategories()
  },

  async update(id: CategoryId, patch: { name?: string; vis?: string; hidden?: boolean }): Promise<void> {
    await apiClient.patch(`/categories/${await categoryIdFor(id)}`, { name: patch.name, icon: patch.vis, hidden: patch.hidden })
    await refreshCategories()
  },

  // Custom nodes only; their movements move to the parent (or "Otros").
  async remove(id: CategoryId): Promise<void> {
    await apiClient.delete(`/categories/${await categoryIdFor(id)}`)
    await refreshCategories()
  },
}
