import { accounts as seedAccounts } from '@/data/accounts'
import { delay } from '@/lib/async'
import type { Wallet } from '@/types'

// Mock "backend" — mirrors backend/src/routes/accounts.ts's shape so this
// module is a drop-in swap once Web grows real authentication (see
// ARCHITECTURE.md §9; Web has no login screen yet, so it can't call the
// real API today — same reasoning documented on authService.ts).
//
// Read-only by design: creating/editing wallets is Android's job
// (micro-management) — Web (macro-analysis) only ever reads wallet
// balances. See root AGENTS.md's Android/Web responsibility split.
let store: Wallet[] = [...seedAccounts]

export const accountService = {
  async getWallets(): Promise<Wallet[]> {
    return delay([...store])
  },

  // Internal — called by transactionService when a mutation affects
  // balances, so the two mock stores stay consistent the same way the
  // backend's Prisma transaction keeps Account.currentBalanceMinor in
  // sync with Transaction rows.
  _applyBalanceDelta(accountId: string, deltaMinor: number) {
    store = store.map((w) => (w.id === accountId ? { ...w, currentBalance: w.currentBalance + deltaMinor } : w))
  },

  _snapshot(): Wallet[] {
    return store
  },
}
