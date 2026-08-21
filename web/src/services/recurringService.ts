import { recurringSeries as seedSeries } from '@/data/recurringSeries'
import { delay } from '@/lib/async'
import type { RecurringSeries } from '@/types'

// Read-only by design: creating/editing recurring series is Android's job
// (micro-management) — Web (macro-analysis) only reads them, for the
// Recurring/Net Worth pages and upcoming-obligations insights. See root
// AGENTS.md's Android/Web responsibility split.
const store: RecurringSeries[] = [...seedSeries]

export const recurringService = {
  async getRecurringSeries(): Promise<RecurringSeries[]> {
    return delay([...store])
  },
}
