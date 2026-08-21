import { goals as seedGoals } from '@/data/goals'
import { delay } from '@/lib/async'
import type { Goal } from '@/types'

// Read-only by design: creating/editing goals is Android's job
// (micro-management) — Web (macro-analysis) only ever reads goal
// progress. See root AGENTS.md's Android/Web responsibility split.
let store: Goal[] = [...seedGoals]

export const goalService = {
  async getGoals(): Promise<Goal[]> {
    return delay([...store])
  },

  // Internal — mirrors backend's "progress computed from linked
  // transactions" design (see schema.prisma's Goal doc comment) rather
  // than a second write path that could drift.
  _applyContribution(goalId: string, amount: number) {
    store = store.map((g) => (g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g))
  },
}
