import { apiClient } from '@/lib/apiClient'
import { categorySlugFor } from '@/lib/backendCategories'
import type { RecurrenceInterval, RecurringSeries } from '@/types'

// Read-only by design: creating/editing recurring series is Android's job
// (micro-management) — Web (macro-analysis) only reads them, for the
// Recurring/Net Worth pages and upcoming-obligations insights. See root
// AGENTS.md's Android/Web responsibility split.
interface BackendRecurringSeries {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  accountId: string
  categoryId: string
  interval: 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  nextOccurrenceDate: string
  isDue: boolean
  active: boolean
}

const INTERVAL_MAP: Record<BackendRecurringSeries['interval'], RecurrenceInterval> = {
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
    accountId: series.accountId,
    category: await categorySlugFor(series.categoryId),
    interval: INTERVAL_MAP[series.interval],
    nextOccurrenceDate: series.nextOccurrenceDate.slice(0, 10),
    isDue: series.isDue,
    active: series.active,
  }
}

export const recurringService = {
  async getRecurringSeries(): Promise<RecurringSeries[]> {
    const series = await apiClient.get<BackendRecurringSeries[]>('/recurring-series')
    return Promise.all(series.map(mapSeries))
  },
}
