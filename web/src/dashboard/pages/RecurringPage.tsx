import { useEffect, useMemo, useState } from 'react'
import { Calendar, CreditCard, Repeat, TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { KPICard } from '@/components/ui/KPICard'
import { Badge } from '@/components/ui/Badge'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { recurringService } from '@/services/recurringService'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { formatShortDate } from '@/lib/date'
import { recurringIntervalTranslationKey } from '@/lib/i18n/translations'
import type { RecurringSeries } from '@/types'

const INTERVALS_PER_MONTH: Record<RecurringSeries['interval'], number> = {
  weekly: 52 / 12,
  monthly: 1,
  yearly: 1 / 12,
}

// Read-only, analysis-oriented: totals + an upcoming-obligations timeline
// (the "financial calendar" the product direction asks for, scoped as a
// list rather than a full calendar-grid widget — no new dependency, and
// planning-by-list is the actual useful shape for a handful of recurring
// items). Creating/editing recurring series is Android's job.
export default function RecurringPage() {
  const { format } = useCurrency()
  const { t, tCategory } = useTranslation()
  const [series, setSeries] = useState<RecurringSeries[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    recurringService
      .getRecurringSeries()
      .then(setSeries)
      .finally(() => setIsLoading(false))
  }, [])

  const active = series.filter((s) => s.active)
  const monthlyExpenses = active.filter((s) => s.type === 'expense').reduce((sum, s) => sum + s.amount * INTERVALS_PER_MONTH[s.interval], 0)
  const monthlyIncome = active.filter((s) => s.type === 'income').reduce((sum, s) => sum + s.amount * INTERVALS_PER_MONTH[s.interval], 0)
  const subscriptionsTotal = active
    .filter((s) => s.type === 'expense' && s.category === 'subscriptions')
    .reduce((sum, s) => sum + s.amount * INTERVALS_PER_MONTH[s.interval], 0)

  const upcoming = useMemo(
    () => [...active].sort((a, b) => (a.nextOccurrenceDate < b.nextOccurrenceDate ? -1 : 1)),
    [active],
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard label={t('recurring.monthlyExpenses')} value={format(monthlyExpenses)} icon={<TrendingDown className="h-4 w-4" />} tone="primary" />
        <KPICard label={t('recurring.monthlyIncome')} value={format(monthlyIncome)} icon={<TrendingUp className="h-4 w-4" />} />
        <KPICard label={t('recurring.subscriptions')} value={format(subscriptionsTotal)} icon={<CreditCard className="h-4 w-4" />} />
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-ink">
          <Calendar className="h-4 w-4 text-primary" /> {t('recurring.upcoming')}
        </h3>

        {!isLoading && upcoming.length === 0 && <p className="text-sm text-ink-tertiary">{t('recurring.empty')}</p>}

        <div className="flex flex-col divide-y divide-border">
          {upcoming.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <CategoryIcon category={item.category} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">{item.name}</p>
                <p className="text-xs text-ink-tertiary">{tCategory(item.category)}</p>
              </div>
              <div className="text-right">
                <p className={`font-numeric text-sm font-bold ${item.type === 'expense' ? 'text-negative' : 'text-positive'}`}>
                  {item.type === 'expense' ? '-' : '+'}
                  {format(item.amount)}
                </p>
                {item.isDue ? (
                  <Badge tone="warning">{t('recurring.dueToday')}</Badge>
                ) : (
                  <p className="text-xs text-ink-tertiary">{formatShortDate(item.nextOccurrenceDate)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-ink">
          <Repeat className="h-4 w-4 text-primary" /> {t('recurring.title')}
        </h3>
        <div className="flex flex-col divide-y divide-border">
          {series.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <CategoryIcon category={item.category} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">{item.name}</p>
                <p className="text-xs text-ink-tertiary">{t(recurringIntervalTranslationKey(item.interval))}</p>
              </div>
              <p className={`font-numeric text-sm font-bold ${item.type === 'expense' ? 'text-negative' : 'text-positive'}`}>
                {item.type === 'expense' ? '-' : '+'}
                {format(item.amount)}
              </p>
              {!item.active && <Badge tone="neutral">{t('recurring.paused')}</Badge>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
