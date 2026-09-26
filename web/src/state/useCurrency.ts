import { useCallback, useMemo } from 'react'
import { useAuth } from '@/state/AuthContext'
import { formatCurrency, formatCurrencyCompact, formatMoney } from '@/lib/currency'

// Formatters bound to the user's principal currency (Ajustes › Monedas):
// totals and summaries are shown in it. `formatIn` formats an amount in
// its own currency (a wallet's or a movement's).
export function useCurrency() {
  const { user } = useAuth()
  const currency: string = user?.principalCurrency ?? 'COP'

  const format = useCallback((value: number, opts?: { signed?: boolean }) => formatCurrency(value, currency, opts), [currency])
  const formatCompact = useCallback((value: number) => formatCurrencyCompact(value, currency), [currency])
  const formatIn = useCallback((value: number, code: string, opts?: { signed?: boolean }) => formatMoney(value, code, opts), [])

  return useMemo(() => ({ currency, format, formatCompact, formatIn }), [currency, format, formatCompact, formatIn])
}
