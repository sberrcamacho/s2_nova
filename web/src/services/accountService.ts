import { apiClient } from '@/lib/apiClient'
import type { AccountType, Wallet, WalletType } from '@/types'

// Billeteras (CURRENCIES_AND_WALLETS.md): one currency per wallet. The
// backend applies every balance rule; `principalBalance` is its conversion
// to the user's principal currency for totals.

interface BackendAccount {
  id: string
  name: string
  type: AccountType
  currency: string
  initialBalance: number
  currentBalance: number
  principalBalance?: number | null
  movements?: number | null
}

const TYPE_MAP: Record<AccountType, WalletType> = {
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
    accountType: account.type,
    currency: account.currency ?? 'COP',
    initialBalance: account.initialBalance,
    currentBalance: account.currentBalance,
    principalBalance: account.principalBalance ?? account.currentBalance,
    movements: account.movements ?? 0,
  }
}

export const accountService = {
  async getWallets(): Promise<Wallet[]> {
    const accounts = await apiClient.get<BackendAccount[]>('/accounts')
    return accounts.map(mapAccount)
  },

  async createWallet(input: { name: string; type: AccountType; initialBalance: number; currency: string }): Promise<Wallet> {
    return mapAccount(await apiClient.post<BackendAccount>('/accounts', input))
  },

  async updateWallet(id: string, input: { name?: string; type?: AccountType }): Promise<Wallet> {
    return mapAccount(await apiClient.patch<BackendAccount>(`/accounts/${id}`, input))
  },

  // Without `reassignToAccountId` the wallet's movements are deleted with
  // it. The last wallet can't be deleted (409).
  async deleteWallet(id: string, reassignToAccountId?: string): Promise<void> {
    await apiClient.delete(`/accounts/${id}`, { reassignToAccountId })
  },
}
