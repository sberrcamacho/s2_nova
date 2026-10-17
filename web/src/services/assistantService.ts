import { apiClient } from '@/lib/apiClient'
import { categorySlugFor } from '@/lib/backendCategories'
import { todayISO } from '@/lib/date'
import type { CategoryId } from '@/types'

// "Asistente" (backend routes/assistant.ts): answers from the user's own
// data; it only reads, and a movement it prepares is a draft the user saves
// from the normal form. The conversation stays in the page.
export interface ChatTurn {
  role: 'user' | 'model'
  text: string
}

export interface AssistantProposal {
  type: 'expense' | 'income'
  amount: number
  description: string
  category: CategoryId | null
  date: string | null
}

export interface AssistantStatus {
  available: boolean
  dailyLimit: number
  remaining: number
}

type BackendProposal = Omit<AssistantProposal, 'type' | 'category'> & { type: 'EXPENSE' | 'INCOME'; categoryId: string | null }

export const assistantService = {
  status(): Promise<AssistantStatus> {
    return apiClient.get<AssistantStatus>('/assistant/status')
  },
  async send(messages: ChatTurn[]): Promise<{ reply: string; proposals: AssistantProposal[]; remaining: number }> {
    const body = await apiClient.post<{ reply: string; proposals: BackendProposal[]; remaining: number }>('/assistant/messages', { messages, today: todayISO() })
    const proposals = await Promise.all(
      body.proposals.map(async ({ type, categoryId, ...p }) => ({ ...p, type: type === 'INCOME' ? ('income' as const) : ('expense' as const), category: categoryId ? await categorySlugFor(categoryId) : null })),
    )
    return { reply: body.reply, proposals, remaining: body.remaining }
  },
}
