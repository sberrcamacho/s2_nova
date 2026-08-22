import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Calendar, HeartPulse, Lightbulb, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { useAppData } from '@/state/AppDataContext'
import { useAuth } from '@/state/AuthContext'
import { useDashboardFilters } from '@/dashboard/DashboardFiltersContext'
import { analyticsService, type PeriodComparison, type PeriodComparisonEntry } from '@/services/analyticsService'
import { recurringService } from '@/services/recurringService'
import { useCurrency } from '@/state/useCurrency'
import { useTranslation } from '@/state/useTranslation'
import { formatShortDate, isSameMonth } from '@/lib/date'
import { getInsights, getFinancialHealth, type Insight, type FinancialHealth, type FinancialHealthCategory } from '@/services/insightsService'
import { healthCategoryTranslationKey, healthStatusTranslationKey, type TranslationKey } from '@/lib/i18n/translations'
import { cn } from '@/lib/cn'
import type { MonthlySummary, RecurringSeries } from '@/types'

const CHANGE_LABEL_KEY: Record<PeriodComparisonEntry['key'], TranslationKey> = {
  income: 'nav.income',
  expenses: 'nav.expenses',
  savings: 'overview.savings',
}

// pct > 0 reads as "good" for income/savings but "bad" for expenses — this
// flips the badge tone accordingly instead of always treating "up" as
// positive.
function changeTone(key: PeriodComparisonEntry['key'], pct: number | null): 'positive' | 'negative' | 'neutral' {
  if (pct === null) return 'neutral'
  const goodWhenUp = key === 'income' || key === 'savings'
  return goodWhenUp === pct >= 0 ? 'positive' : 'negative'
}

const HEALTH_DOT: Record<FinancialHealthCategory['tone'], string> = {
  positive: 'bg-positive',
  warning: 'bg-warning',
  negative: 'bg-negative',
  neutral: 'bg-[#3a3a4a]',
}

const INSIGHT_ACCENT: Record<Insight['tone'], string> = {
  negative: 'var(--color-negative)',
  warning: 'var(--color-warning)',
  positive: 'var(--color-primary)',
  neutral: 'var(--color-primary)',
}

export default function OverviewPage() {
  const { transactions } = useAppData()
  const { format } = useCurrency()
  const { t, language } = useTranslation()
  const { monthKeys } = useDashboardFilters()
  const { user } = useAuth()
  const hideAmounts = user?.preferences.hideAmounts ?? false
  const navigate = useNavigate()

  const [history, setHistory] = useState<MonthlySummary[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [health, setHealth] = useState<FinancialHealth | null>(null)
  const [comparison, setComparison] = useState<PeriodComparison | null>(null)
  const [upcoming, setUpcoming] = useState<RecurringSeries[]>([])

  useEffect(() => {
    analyticsService.getMonthlyHistory(6, language).then(setHistory)
    analyticsService.getPeriodComparison(language).then(setComparison)
    getInsights(language, format).then(setInsights)
    getFinancialHealth(language, format).then(setHealth)
    recurringService.getRecurringSeries().then((series) =>
      setUpcoming([...series.filter((s) => s.active)].sort((a, b) => (a.nextOccurrenceDate < b.nextOccurrenceDate ? -1 : 1)).slice(0, 4)),
    )
  }, [transactions, language, format])

  const balance = useMemo(
    () => transactions.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0),
    [transactions],
  )

  const periodTransactions = useMemo(
    () => transactions.filter((tx) => monthKeys.some((mk) => isSameMonth(tx.date, mk))),
    [transactions, monthKeys],
  )
  const netThisMonth = periodTransactions.reduce((s, tx) => s + (tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0), 0)

  const maxAbsSavings = Math.max(1, ...history.map((m) => Math.abs(m.savings)))

  const recent = transactions.slice(0, 4)

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Hero row */}
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[1.35fr_1fr]">
        <div
          className="relative overflow-hidden rounded-[20px] border border-border-strong p-[26px_20px] sm:p-[26px_28px]"
          style={{ background: 'linear-gradient(150deg, var(--color-bg) 0%, var(--hero-from) 55%, var(--hero-to) 100%)' }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-[70px] h-[220px] w-[220px] rounded-full"
            style={{ background: 'var(--hero-glow)', filter: 'blur(52px)' }}
          />
          <div className="relative">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-highlight">{t('overview.balance')}</p>
            <p
              className={cn(
                'font-numeric mt-2 text-[clamp(32px,5vw,48px)] font-extrabold leading-none tracking-[-0.03em] text-white transition-[filter] duration-150',
                hideAmounts && 'blur-md hover:blur-none focus:blur-none',
              )}
              tabIndex={hideAmounts ? 0 : undefined}
            >
              {format(balance)}
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              <Badge tone={netThisMonth >= 0 ? 'positive' : 'negative'}>{format(netThisMonth, { signed: true })}</Badge>
              <span className="text-xs font-medium text-white/60">{t('overview.netThisMonth')}</span>
            </div>

            <div className="mt-6 flex h-[66px] items-end gap-[5px]">
              {history.map((m, i) => {
                const isLast = i === history.length - 1
                const height = Math.max(6, Math.round((Math.abs(m.savings) / maxAbsSavings) * 66))
                const tier = i < 2 ? 0.22 : i < 4 ? 0.3 : isLast ? 1 : 0.38
                return (
                  <div
                    key={m.month}
                    className="flex-1 rounded-t-[3px]"
                    style={{ height, backgroundColor: isLast ? '#8578ff' : `rgba(165,157,255,${tier})` }}
                  />
                )
              })}
            </div>
            <div className="mt-1.5 flex justify-between">
              {history.map((m) => (
                <span key={m.month} className="text-[10px] text-white/45">
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {comparison?.overall.map((entry) => (
            <Card key={entry.key} className="flex items-center justify-between p-[16px_18px]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-tertiary">{t(CHANGE_LABEL_KEY[entry.key])}</p>
                <p className="font-numeric mt-1 text-2xl font-extrabold tracking-[-0.02em] text-ink">{format(entry.current)}</p>
              </div>
              <Badge tone={changeTone(entry.key, entry.pctChange)}>
                {entry.pctChange === null ? t('overview.noPreviousData') : `${entry.pctChange >= 0 ? '+' : ''}${entry.pctChange}%`}
              </Badge>
            </Card>
          ))}
        </div>
      </div>

      {/* Health + suggestions row */}
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[1fr_1.35fr]">
        <Card className="p-5 sm:p-6">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
            <HeartPulse className="h-4 w-4 text-primary" /> {t('overview.financialHealth')}
          </h3>
          <p className="mt-0.5 text-xs font-medium text-ink-tertiary">{t('overview.financialHealthSubtitle')}</p>
          {health && (
            <div className="mt-3 flex flex-col divide-y divide-[#16161f]/60">
              {health.categories.map((c) => (
                <div key={c.key} className="flex items-center gap-2.5 py-[11px] first:pt-0 last:pb-0">
                  <span className={cn('h-[7px] w-[7px] shrink-0 rounded-full', HEALTH_DOT[c.tone])} />
                  <span className="w-24 shrink-0 text-[12.5px] font-bold text-ink">{t(healthCategoryTranslationKey(c.key))}</span>
                  <span className="flex-1 truncate text-[11px] text-ink-tertiary">{c.detail}</span>
                  <span className="shrink-0 text-[11px] font-extrabold" style={{ color: `var(--color-${c.tone === 'neutral' ? 'text-tertiary' : c.tone})` }}>
                    {t(healthStatusTranslationKey(c.status))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {insights.length > 0 && (
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
                  <Lightbulb className="h-4 w-4 text-primary" /> {t('overview.insightsTitle')}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-ink-tertiary">{t('overview.insightsSubtitle')}</p>
              </div>
              <button onClick={() => navigate('/insights')} className="flex shrink-0 items-center gap-0.5 text-[11.5px] font-extrabold text-highlight">
                {t('insights.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {insights.slice(0, 3).map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-[12px] border border-border-strong bg-surface-elevated p-[13px_15px]"
                  style={{ borderLeft: `3px solid ${INSIGHT_ACCENT[insight.tone]}` }}
                >
                  <p className="text-[12.5px] font-bold text-ink">{insight.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11.5px] text-ink-tertiary">{insight.description}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Upcoming events */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <Calendar className="h-4 w-4 text-primary" /> {t('overview.upcomingEvents')}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-ink-tertiary">{t('overview.upcomingEventsSubtitle')}</p>
          </div>
          <span className="shrink-0 text-[11.5px] font-extrabold text-highlight">{t('overview.manageInApp')}</span>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-ink-tertiary">{t('overview.noUpcoming')}</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {upcoming.map((item) => {
              const isNextSalary = item.category === 'salary' && item.type === 'income'
              return (
                <div
                  key={item.id}
                  className={cn('rounded-[12px] border bg-surface-elevated p-3.5', isNextSalary ? 'border-primary' : 'border-border-strong')}
                >
                  <p className={cn('text-[10px] font-bold uppercase tracking-[0.08em]', isNextSalary ? 'text-highlight' : 'text-ink-tertiary')}>
                    {formatShortDate(item.nextOccurrenceDate, language)}
                  </p>
                  <p className="mt-1.5 truncate text-[12.5px] font-bold text-ink">{item.name}</p>
                  <p className={cn('font-numeric mt-1 text-sm font-extrabold', item.type === 'expense' ? 'text-negative' : 'text-positive')}>
                    {item.type === 'expense' ? '-' : '+'}
                    {format(item.amount)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Recent transactions */}
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-ink">{t('overview.recentTransactions')}</h3>
          <button onClick={() => navigate('/transactions')} className="flex items-center gap-0.5 text-[11.5px] font-extrabold text-highlight">
            {t('overview.viewAllTransactions')} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {recent.map((tx) => (
            <TransactionRow key={tx.id} transaction={tx} />
          ))}
        </div>
        {recent.length === 0 && (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t('overview.emptyTransactionsTitle')} description={t('overview.emptyTransactionsDescription')} />
        )}
      </Card>
    </div>
  )
}
