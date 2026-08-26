import { useCallback, useMemo } from 'react'
import { useAuth } from '@/state/AuthContext'
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency'
import { userService } from '@/services/userService'
import type { CurrencyCode } from '@/types'

// Reads the user's currency-format preference (`user.currency`) and returns
// formatters bound to it, so every amount in the app re-renders with the
// right format the moment the preference changes in Settings.
export function useCurrency() {
  const { user, updateUser } = useAuth()
  const currency: CurrencyCode = user?.currency ?? 'COP'

  const format = useCallback((value: number, opts?: { signed?: boolean }) => formatCurrency(value, currency, opts), [currency])
  const formatCompact = useCallback((value: number) => formatCurrencyCompact(value, currency), [currency])
  const setCurrency = useCallback(
    (next: CurrencyCode) => {
      updateUser({ currency: next })
      void userService.updateCurrency(next)
    },
    [updateUser],
  )

  return useMemo(() => ({ currency, format, formatCompact, setCurrency }), [currency, format, formatCompact, setCurrency])
}
