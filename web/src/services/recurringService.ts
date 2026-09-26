import { apiClient } from '@/lib/apiClient'
import { categorySlugFor } from '@/lib/backendCategories'
import type { RecurrenceInterval, RecurringSeries } from '@/types'

// Programados. New ones are created through "Repetir" in Nuevo movimiento
// (the movement is the first occurrence); Inicio confirms or skips them.
interface BackendRecurringSeries {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  currency: string
  accountId: string
  categoryId: string
  subcategoryId: string | null
  interval: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  nextOccurrenceDate: string
  occurrences: number | null
  occurrencesDone: number
  endDate: string | null
  autoConfirm: boolean
  isDue: boolean
  active: boolean
}

const INTERVAL_MAP: Record<BackendRecurringSeries['interval'], RecurrenceInterval> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
}

async function mapSeries(series: BackendRecurringSeries): Promise<RecurringSeries> {
  return {
    id: series.id,
    name: series.name,
    type: series.type === 'INCOME' ? 'income' : 'expense',
    amount: series.amount,
    currency: series.currency ?? 'COP',
    accountId: series.accountId,
    category: await categorySlugFor(series.subcategoryId ?? series.categoryId),
    interval: INTERVAL_MAP[series.interval],
    nextOccurrenceDate: series.nextOccurrenceDate.slice(0, 10),
    occurrences: series.occurrences ?? undefined,
    occurrencesDone: series.occurrencesDone ?? 0,
    endDate: series.endDate?.slice(0, 10),
    autoConfirm: series.autoConfirm ?? false,
    isDue: series.isDue,
    active: series.active,
  }
}

export const recurringService = {
  async getRecurringSeries(): Promise<RecurringSeries[]> {
    const series = await apiClient.get<BackendRecurringSeries[]>('/recurring-series')
    return Promise.all(series.map(mapSeries))
  },

  // Materializes the next occurrence as a real transaction (backend applies
  // the balance change and advances the date).
  async confirmOccurrence(id: string, date: string): Promise<void> {
    await apiClient.post(`/recurring-series/${id}/confirm`, { date })
  },

  async deleteSeries(id: string): Promise<void> {
    await apiClient.delete(`/recurring-series/${id}`)
  },

  // Skips the next occurrence ("Omitir esta vez") without a transaction.
  async skipOccurrence(id: string): Promise<void> {
    await apiClient.post(`/recurring-series/${id}/skip`)
  },
}
