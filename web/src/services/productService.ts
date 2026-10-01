import { apiClient } from '@/lib/apiClient'

// Scanner catalog (backend/src/routes/products.ts). The camera lives on
// Android; Web resolves a typed code or the product linked to a movement.
export interface CatalogProduct {
  id: string
  barcode: string
  name: string
  brand: string | null
  categoryId: string | null
  imageUrl: string | null
  source: string
}

export const productService = {
  // null when no database knows the code.
  async lookup(code: string): Promise<CatalogProduct | null> {
    try {
      return await apiClient.get<CatalogProduct>(`/products/${encodeURIComponent(code.trim())}`)
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null
      throw err
    }
  },

  async get(id: string): Promise<CatalogProduct | null> {
    try {
      return await apiClient.get<CatalogProduct>(`/products/id/${id}`)
    } catch {
      return null
    }
  },
}
