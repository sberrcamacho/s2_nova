import { apiClient } from '@/lib/apiClient'
import type { Wallet, WalletType } from '@/types'

// Read-only by design: creating/editing wallets is Android's job
// (micro-management) — Web (macro-analysis) only ever reads wallet
// balances. See root AGENTS.md's Android/Web responsibility split.

interface BackendAccount {
  id: string
  name: string
  type: 'CASH' | 'BANK_DEBIT' | 'BANK_CREDIT' | 'SAVINGS' | 'CRYPTO' | 'NEQUI' | 'DAVIPLATA' | 'OTHER'
  initialBalance: number
  currentBalance: number
}

// The backend distinguishes more wallet subtypes (bank debit/credit,
// Nequi, Daviplata) than Web's WalletType — since Web only ever *displays*
// the type (an icon/label), subtypes collapse into the closest existing
// bucket rather than widening a type that has no create/edit UI to justify it.
const TYPE_MAP: Record<BackendAccount['type'], WalletType> = {
  CASH: 'cash',
  BANK_DEBIT: 'bank',
  BANK_CREDIT: 'bank',
  SAVINGS: 'savings',
  CRYPTO: 'crypto',
  NEQUI: 'other',
  DAVIPLATA: 'other',
  OTHER: 'other',
}

function mapAccount(account: BackendAccount): Wallet {
  return {
    id: account.id,
    name: account.name,
    type: TYPE_MAP[account.type],
    initialBalance: account.initialBalance,
    currentBalance: account.currentBalance,
  }
}

export const accountService = {
  async getWallets(): Promise<Wallet[]> {
    const accounts = await apiClient.get<BackendAccount[]>('/accounts')
    return accounts.map(mapAccount)
  },
}
