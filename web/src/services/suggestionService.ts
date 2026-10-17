import { apiClient } from '@/lib/apiClient'
import { categorySlugFor } from '@/lib/backendCategories'
import type { CategoryId } from '@/types'

// "Por confirmar" (backend routes/suggestions.ts): movements read from a
// bank or wallet app's notification on the user's Android phone, waiting to
// be reviewed. Registrar opens the normal form prefilled; once saved, the
// suggestion is linked to the new movement.
export interface MovementSuggestion {
  id: string
  appLabel: string
  type: 'expense' | 'income'
  amount: number
  currency: string
  merchant: string | null
  category: CategoryId | null
  walletId: string | null
  occurredAt: string // ISO
}

type BackendSuggestion = Omit<MovementSuggestion, 'type' | 'category' | 'walletId'> & {
  type: 'EXPENSE' | 'INCOME'
  categoryId: string | null
  accountId: string | null
}

export const suggestionService = {
  async getPending(): Promise<MovementSuggestion[]> {
    const rows = await apiClient.get<BackendSuggestion[]>('/suggestions')
    return Promise.all(
      rows.map(async ({ type, categoryId, accountId, ...row }) => ({
        ...row,
        type: type === 'INCOME' ? ('income' as const) : ('expense' as const),
        category: categoryId ? await categorySlugFor(categoryId) : null,
        walletId: accountId,
      })),
    )
  },
  confirm(id: string, transactionId: string): Promise<unknown> {
    return apiClient.post(`/suggestions/${id}/confirm`, { transactionId })
  },
  dismiss(id: string): Promise<unknown> {
    return apiClient.post(`/suggestions/${id}/dismiss`, {})
  },
}
