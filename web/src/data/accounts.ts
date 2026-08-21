import type { Wallet } from '@/types'

// Seed wallets — mirrors android's MockAccounts equivalent and the
// backend's Account examples (Cash, Banking, Savings, Bitcoin).
export const accounts: Wallet[] = [
  { id: 'wal_cash', name: 'Efectivo', type: 'cash', initialBalance: 350_000, currentBalance: 350_000 },
  { id: 'wal_bank', name: 'Bancolombia', type: 'bank', initialBalance: 4_200_000, currentBalance: 4_200_000 },
  { id: 'wal_savings', name: 'Ahorros', type: 'savings', initialBalance: 6_000_000, currentBalance: 6_000_000 },
]

export const DEFAULT_ACCOUNT_ID = accounts[0].id
