// The backend models categories as real rows with a generated UUID `id`,
// while Web's domain model (and every mock seed file) addresses a category
// by its fixed `slug` (== CategoryId, e.g. 'food') — see
// backend/src/routes/categories.ts and backend/prisma/seed.ts's `slug`
// column doc comment. Every service that reads/writes a categoryId over
// the wire needs to translate between the two; this module fetches
// GET /categories once per session and caches both directions.
import { apiClient } from '@/lib/apiClient'
import type { CategoryId } from '@/types'

interface BackendCategory {
  id: string
  slug: string
}

let cache: Promise<{ slugToId: Map<CategoryId, string>; idToSlug: Map<string, CategoryId> }> | null = null

function load() {
  if (!cache) {
    cache = apiClient.get<BackendCategory[]>('/categories').then((categories) => {
      const slugToId = new Map<CategoryId, string>()
      const idToSlug = new Map<string, CategoryId>()
      for (const category of categories) {
        slugToId.set(category.slug as CategoryId, category.id)
        idToSlug.set(category.id, category.slug as CategoryId)
      }
      return { slugToId, idToSlug }
    })
  }
  return cache
}

export async function categoryIdFor(slug: CategoryId): Promise<string> {
  const { slugToId } = await load()
  const id = slugToId.get(slug)
  if (!id) throw new Error(`Unknown category: ${slug}`)
  return id
}

export async function categorySlugFor(id: string): Promise<CategoryId> {
  const { idToSlug } = await load()
  return idToSlug.get(id) ?? 'other'
}

// Clears the cache — call on logout, since categories can include
// per-user rows in principle and a new session shouldn't reuse a stale map.
export function resetCategoryCache() {
  cache = null
}
