import { apiClient } from '@/lib/apiClient'

// Ajustes › Monedas (CURRENCIES_AND_WALLETS.md §4). `rate` = units of the
// principal currency per 1 unit of this one (the principal's is 1).
export interface UserCurrency {
  code: string
  name: string
  symbol: string
  decimals: number
  isPrincipal: boolean
  rate: number
  wallets: number
}

export const currencyService = {
  getMine(): Promise<UserCurrency[]> {
    return apiClient.get<UserCurrency[]>('/me/currencies')
  },

  getCatalog(): Promise<UserCurrency[]> {
    return apiClient.get<UserCurrency[]>('/currencies')
  },

  add(code: string): Promise<UserCurrency[]> {
    return apiClient.post<UserCurrency[]>('/me/currencies', { code })
  },

  // A currency used by a wallet can't be removed (409).
  remove(code: string): Promise<UserCurrency[]> {
    return apiClient.delete<UserCurrency[]>(`/me/currencies/${code}`)
  },

  // Only while the user has no wallets (first run).
  setPrincipal(code: string): Promise<UserCurrency[]> {
    return apiClient.put<UserCurrency[]>('/me/currencies/principal', { code })
  },
}
