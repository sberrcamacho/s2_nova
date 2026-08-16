import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { TranslationKey } from '@/lib/i18n/translations'

export type DateRangeKey = 'this_month' | 'last_month' | 'last_3_months' | 'this_year'

// Labels are translation keys, not text — the context stays presentation-
// language-agnostic and the consuming component (Header) translates them
// via useTranslation() so they react to the language preference.
export const DATE_RANGE_OPTIONS: { value: DateRangeKey; labelKey: TranslationKey }[] = [
  { value: 'this_month', labelKey: 'dateRange.thisMonth' },
  { value: 'last_month', labelKey: 'dateRange.lastMonth' },
  { value: 'last_3_months', labelKey: 'dateRange.last3Months' },
  { value: 'this_year', labelKey: 'dateRange.thisYear' },
]

function monthKeysFor(range: DateRangeKey): string[] {
  const now = new Date()
  const keyAt = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  switch (range) {
    case 'this_month':
      return [keyAt(0)]
    case 'last_month':
      return [keyAt(1)]
    case 'last_3_months':
      return [keyAt(2), keyAt(1), keyAt(0)]
    case 'this_year':
      return Array.from({ length: now.getMonth() + 1 }, (_, i) => keyAt(now.getMonth() - i)).reverse()
  }
}

interface DashboardFiltersValue {
  range: DateRangeKey
  setRange: (range: DateRangeKey) => void
  monthKeys: string[]
  rangeLabelKey: TranslationKey
}

const DashboardFiltersContext = createContext<DashboardFiltersValue | null>(null)

export function DashboardFiltersProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DateRangeKey>('this_month')

  const value = useMemo<DashboardFiltersValue>(() => {
    const monthKeys = monthKeysFor(range)
    return {
      range,
      setRange,
      monthKeys,
      rangeLabelKey: DATE_RANGE_OPTIONS.find((o) => o.value === range)?.labelKey ?? 'dateRange.thisMonth',
    }
  }, [range])

  return <DashboardFiltersContext.Provider value={value}>{children}</DashboardFiltersContext.Provider>
}

export function useDashboardFilters(): DashboardFiltersValue {
  const ctx = useContext(DashboardFiltersContext)
  if (!ctx) throw new Error('useDashboardFilters must be used within DashboardFiltersProvider')
  return ctx
}
