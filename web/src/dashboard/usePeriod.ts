import { useSearchParams } from 'react-router-dom'
import { todayISO } from '@/lib/date'
import { recentMonths } from '@/lib/movimientos'

// The selected period: `?period=YYYY-MM` (set by the header's period
// selector), defaulting to the current month.
export function usePeriod(): [string, (monthKey: string) => void] {
  const [params, setParams] = useSearchParams()
  const current = todayISO().slice(0, 7)
  const raw = params.get('period')
  const period = raw && recentMonths(todayISO()).includes(raw) ? raw : current
  const setPeriod = (monthKey: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (monthKey === current) next.delete('period')
        else next.set('period', monthKey)
        return next
      },
      { replace: true },
    )
  return [period, setPeriod]
}
