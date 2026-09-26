import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoryMark, Glyph, GlyphMark } from '@/components/v2/CategoryMark'
import { ICON_PATHS, StrokeIcon } from '@/components/v2/icons'
import { Money, MoneyText } from '@/components/v2/Money'
import { RowButton, RowSkeletons, SkeletonBar, SyncBanner } from '@/components/v2/Rows'
import { EventDialog } from '@/dashboard/components/EventDialog'
import { accountService } from '@/services/accountService'
import { alertService, type AppAlert } from '@/services/alertService'
import { goalService } from '@/services/goalService'
import { recurringService } from '@/services/recurringService'
import { summaryService, type CategorySummary, type MonthTotals } from '@/services/summaryService'
import { transactionService } from '@/services/transactionService'
import { useAppData } from '@/state/AppDataContext'
import { useAuth } from '@/state/AuthContext'
import { useCurrency } from '@/state/useCurrency'
import { useHideAmounts } from '@/state/useHideAmounts'
import { useTranslation } from '@/state/useTranslation'
import { alertCopy } from '@/lib/alertCopy'
import { budgetScope, budgetStateNote, planText, shortDayMonth } from '@/lib/planCopy'
import { shortWallet } from '@/lib/movimientos'
import { useToast } from '@/state/ToastContext'
import { goalMark, categoryColor } from '@/lib/categoryGlyphs'
import { todayISO } from '@/lib/date'
import {
  MONTHS_LONG,
  MONTHS_SHORT,
  WALLET_ICON_PATHS,
  budgetNote,
  budgetTone,
  daysLeftInMonth,
  fill,
  loadDismissed,
  monthAbbr,
  monthYear,
  nextDueLoan,
  openLoans,
  pruneDismissed,
  saveDismissed,
  shortDate,
  sortByRisk,
  upcomingWithin,
  walletIcon,
  walletKind,
  type Tone,
} from '@/lib/inicio'
import type { TranslationKey } from '@/lib/i18n/translations'
import type { Goal, RecurringSeries, Transaction, Wallet } from '@/types'
import { cn } from '@/lib/cn'

const TONE_VAR: Record<Tone, string> = { neg: 'var(--v2-neg)', warn: 'var(--v2-warn)', pos: 'var(--v2-pos)' }

interface InicioData {
  wallets: Wallet[] | null
  months: MonthTotals[] | null
  categories: CategorySummary | null
  alerts: AppAlert[] | null
  goals: Goal[] | null
  loans: Transaction[] | null
  series: RecurringSeries[] | null
}

const EMPTY: InicioData = { wallets: null, months: null, categories: null, alerts: null, goals: null, loans: null, series: null }

// Each block keeps its last loaded data when a refresh fails (the sync
// banner says so), per STAGE-2-INICIO §4 "Sync or network error".
function useInicioData(version: number) {
  const [data, setData] = useState<InicioData>(EMPTY)
  const [syncFailed, setSyncFailed] = useState(false)

  const refresh = useCallback(async () => {
    const today = todayISO()
    const results = await Promise.allSettled([
      accountService.getWallets(),
      summaryService.getMonths(6, today),
      summaryService.getCategories(today),
      alertService.getAlerts(today),
      goalService.getGoals(),
      transactionService.getLoans(),
      recurringService.getRecurringSeries(),
    ])
    const keys = ['wallets', 'months', 'categories', 'alerts', 'goals', 'loans', 'series'] as const
    setData((prev) => {
      const next = { ...prev } as Record<(typeof keys)[number], unknown>
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') next[keys[i]] = r.value
      })
      return next as unknown as InicioData
    })
    setSyncFailed(results.some((r) => r.status === 'rejected'))
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, version])

  return { data, syncFailed, refresh }
}

export default function InicioPage() {
  const { t, tCategory, language } = useTranslation()
  const { format, formatIn, currency: principal } = useCurrency()
  const { hidden, toggle } = useHideAmounts()
  const { showToast } = useToast()
  const { user } = useAuth()
  const { budgets, isLoading: appLoading, version, refresh: refreshAppData } = useAppData()
  const { data, syncFailed, refresh } = useInicioData(version)
  const navigate = useNavigate()
  const today = todayISO()
  const [openSeriesId, setOpenSeriesId] = useState<string | null>(null)

  const userId = user?.id ?? 'anon'
  const [dismissed, setDismissed] = useState<string[]>(() => loadDismissed(userId))
  useEffect(() => setDismissed(loadDismissed(userId)), [userId])
  useEffect(() => {
    if (!data.alerts) return
    const pruned = pruneDismissed(dismissed, data.alerts.map((a) => a.id))
    if (pruned.length !== dismissed.length) {
      setDismissed(pruned)
      saveDismissed(userId, pruned)
    }
  }, [data.alerts, dismissed, userId])
  const setAndSaveDismissed = (ids: string[]) => {
    setDismissed(ids)
    saveDismissed(userId, ids)
  }

  const walletTotal = data.wallets?.reduce((s, w) => s + w.principalBalance, 0) ?? null
  const walletName = (id: string) => shortWallet(data.wallets?.find((w) => w.id === id)?.name ?? '')
  const thisMonth = data.months?.[data.months.length - 1]
  // The Web mockup lists goal contributions and upcoming Programados first,
  // and leaves "meta casi cumplida" to the Metas card.
  const FIRST = ['goal_plan_due', 'goal_plan_auto', 'tx_planned']
  const visibleAlerts = (data.alerts ?? [])
    .filter((a) => !dismissed.includes(a.id) && a.kind !== 'goal_near')
    .sort((a, b) => Number(FIRST.includes(b.kind)) - Number(FIRST.includes(a.kind)))
  const monthKey = today.slice(0, 7)
  const upcoming = useMemo(
    () => (data.series && walletTotal !== null ? upcomingWithin(data.series, today, walletTotal, 14) : null),
    [data.series, walletTotal, today],
  )
  const openSeries = openSeriesId ? data.series?.find((s) => s.id === openSeriesId) : undefined

  const retry = () => {
    void refresh()
    void refreshAppData()
  }

  const openAlert = (alert: AppAlert) => {
    switch (alert.kind) {
      case 'series_due':
        return setOpenSeriesId(alert.seriesId)
      case 'loan_open':
        return navigate(`/planes?tab=prestamos&side=${alert.loanKind}`)
      case 'budget_at_risk':
        return navigate('/planes?tab=presupuestos')
      case 'goal_near':
      case 'goal_plan_due':
      case 'goal_plan_auto':
        return navigate('/planes?tab=metas')
      case 'tx_planned':
        return navigate(`/movimientos?tx=${alert.transactionId}`)
    }
  }

  const resolvePlan = async (alert: Extract<AppAlert, { kind: 'goal_plan_due' }>, confirm: boolean) => {
    try {
      if (confirm) await goalService.confirmPlan(alert.goalId)
      else await goalService.skipPlan(alert.goalId)
      showToast(confirm ? `Aporte de ${format(alert.amount)} registrado` : 'Aporte omitido')
      void refresh()
      void refreshAppData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-[18px] px-4 pb-10 pt-[26px] min-[760px]:px-7">
      {syncFailed && (
        <SyncBanner onRetry={retry} />
      )}

      <div className="grid grid-cols-1 items-stretch gap-[18px] min-[1100px]:grid-cols-[1.35fr_1fr]">
        {/* Balance hero */}
        <section
          className="relative overflow-hidden rounded-[20px] border border-v2-line2 px-7 py-[26px] text-white"
          style={{ background: 'linear-gradient(150deg,var(--v2-hero-a) 0%,var(--v2-hero-b) 55%,var(--v2-hero-c) 100%)' }}
        >
          <div aria-hidden="true" className="pointer-events-none absolute right-[-40px] top-[-70px] h-[220px] w-[220px] rounded-full bg-[rgba(108,92,231,.35)] blur-[52px]" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10.5px] font-bold tracking-[.11em] text-[#a69dff]">{t('inicio.balance')}</div>
              <div className="flex items-center gap-2">
                {data.wallets && (
                  <div className="rounded-full bg-white/[.08] px-2.5 py-1 text-[10.5px] font-bold text-white/70">
                    {data.wallets.length === 1 ? t('inicio.walletsOne') : fill(t('inicio.walletsMany'), data.wallets.length)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={toggle}
                  title={hidden ? t('inicio.showAmounts') : t('inicio.hideAmounts')}
                  aria-label={hidden ? t('inicio.showAmounts') : t('inicio.hideAmounts')}
                  aria-pressed={hidden}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[10px] bg-white/[.08] text-white/75 hover:bg-white/[.14]"
                >
                  <StrokeIcon paths={hidden ? ICON_PATHS.eyeOff : ICON_PATHS.eye} size={16} />
                </button>
              </div>
            </div>
            {walletTotal === null ? (
              <SkeletonBar className="mt-[18px] h-[40px] w-[60%]" dark />
            ) : (
              <Money hidden={hidden} className="mt-2.5 block text-[48px] font-extrabold leading-[1.2] tracking-[-.03em]">
                {format(walletTotal)}
              </Money>
            )}
            <div className="mt-4 flex gap-3">
              <HeroStat label={t('inicio.monthIncome')} value={thisMonth ? format(thisMonth.income) : null} color="#32c98a" hidden={hidden} />
              <HeroStat label={t('inicio.monthExpenses')} value={thisMonth ? format(thisMonth.expenses) : null} color="#ff6262" hidden={hidden} />
            </div>
            <MonthBars months={data.months} language={language} />
          </div>
        </section>

        {/* Billeteras */}
        <Card className="flex flex-col">
          <CardHead title={t('inicio.wallets.title')} subtitle={t('inicio.wallets.subtitle')} />
          <div className="mt-2.5 flex flex-1 flex-col justify-center">
            {data.wallets === null ? (
              <RowSkeletons count={3} />
            ) : data.wallets.length === 0 ? (
              <div className="py-3 text-[12.5px] text-v2-dim">{t('inicio.wallets.empty')}</div>
            ) : (
              data.wallets.map((w, i, arr) => (
                <RowButton key={w.id} last={i === arr.length - 1} onClick={() => navigate('/billeteras')}>
                  <div
                    className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-white"
                    style={{ background: 'linear-gradient(150deg,var(--v2-hero-b),var(--v2-accent))' }}
                  >
                    <StrokeIcon paths={WALLET_ICON_PATHS[walletIcon(w.accountType)]} size={17} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-[12.5px] font-bold">{w.name}</div>
                    <div className="text-[11px] text-v2-dim">{t(`inicio.walletKind.${walletKind(w.accountType)}` as TranslationKey)}</div>
                  </div>
                  <div className="text-right">
                    <Money hidden={hidden} className="block text-[13.5px] font-extrabold">
                      {formatIn(w.currentBalance, w.currency)}
                    </Money>
                    <div className="font-numeric text-[10.5px] text-v2-dim">
                      {w.currency !== principal && (
                        <Money hidden={hidden} inline>
                          {`≈ ${format(w.principalBalance)} · `}
                        </Money>
                      )}
                      {fill(t('inicio.wallets.share'), walletTotal && walletTotal > 0 ? Math.round((w.principalBalance / walletTotal) * 100) : 0)}
                    </div>
                  </div>
                  <span className="flex text-v2-dim">
                    <StrokeIcon paths={ICON_PATHS.chevronRight} size={14} />
                  </span>
                </RowButton>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Alertas */}
      {data.alerts !== null &&
        (visibleAlerts.length > 0 ? (
          <Card>
            <CardHead
              title={t('inicio.alerts.title')}
              subtitle={visibleAlerts.length === 1 ? t('inicio.alerts.oneOpen') : fill(t('inicio.alerts.manyOpen'), visibleAlerts.length)}
            />
            <div className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2.5">
              {visibleAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  today={today}
                  hidden={hidden}
                  wallets={data.wallets ?? []}
                  onOpen={() => openAlert(alert)}
                  onConfirm={alert.kind === 'goal_plan_due' ? () => void resolvePlan(alert, true) : undefined}
                  onSkip={alert.kind === 'goal_plan_due' ? () => void resolvePlan(alert, false) : undefined}
                  onDismiss={() => setAndSaveDismissed([...dismissed, alert.id])}
                />
              ))}
            </div>
          </Card>
        ) : (
          <div className="px-1 text-[12px] text-v2-dim">
            {t('inicio.alerts.none')}{' '}
            {dismissed.length > 0 && (
              <button type="button" onClick={() => setAndSaveDismissed([])} className="cursor-pointer font-bold text-v2-accent2">
                {t('inicio.alerts.restore')}
              </button>
            )}
          </div>
        ))}

      <div className="grid grid-cols-1 gap-[18px] min-[1100px]:grid-cols-[1.35fr_1fr]">
        {/* Presupuestos */}
        <Card>
          <CardHead
            title={t('inicio.budgets.title')}
            subtitle={budgetsSubtitle(today, language, t)}
            link={t('inicio.seeInPlanes')}
            onLink={() => navigate('/planes?tab=presupuestos')}
          />
          <div className="mt-2.5 flex flex-col">
            {appLoading && homeBudgets(budgets).length === 0 ? (
              <RowSkeletons count={4} />
            ) : homeBudgets(budgets).length === 0 ? (
              <div className="py-3 text-[12.5px] text-v2-dim">{t('inicio.budgets.empty')}</div>
            ) : (
              homeBudgets(budgets).map((b, i, arr) => {
                const tone = TONE_VAR[budgetTone(b.percentage)]
                return (
                  <RowButton key={b.id} last={i === arr.length - 1} gap={12} onClick={() => navigate('/planes?tab=presupuestos')}>
                    <CategoryMark category={b.category!} box={34} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-left">
                      <div className="flex items-baseline justify-between gap-2.5">
                        <span className="text-[12.5px] font-bold">{budgetScope(b, walletName)}</span>
                        <Money hidden={hidden} className="text-[11.5px] text-v2-muted">
                          {`${format(b.spent)} / ${format(b.limit)}`}
                        </Money>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-[3px] bg-v2-line">
                        <div className="h-full" style={{ width: `${Math.min(100, b.percentage)}%`, background: tone }} />
                      </div>
                      <div className="flex justify-between gap-2.5 text-[11px] text-v2-dim">
                        <span>{budgetStateNote(b, today, format)}</span>
                        <Money hidden={hidden}>
                          {b.remaining >= 0 ? fill(t('inicio.budgets.available'), format(b.remaining)) : fill(t('inicio.budgets.overBy'), format(-b.remaining))}
                        </Money>
                      </div>
                    </div>
                    <span
                      className="font-numeric min-w-[34px] flex-none rounded-full px-2 py-[3px] text-center text-[11.5px] font-extrabold"
                      style={{ color: tone, background: `color-mix(in oklab, ${tone} 14%, transparent)` }}
                    >
                      {b.percentage}%
                    </span>
                  </RowButton>
                )
              })
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-[18px]">
          {/* Metas */}
          <Card>
            <CardHead title={t('inicio.goals.title')} subtitle={t('inicio.goals.subtitle')} link={t('inicio.seeInPlanes')} onLink={() => navigate('/planes?tab=metas')} />
            <div className="mt-2.5 flex flex-col">
              {data.goals === null ? (
                <RowSkeletons count={2} />
              ) : data.goals.length === 0 ? (
                <div className="py-3 text-[12.5px] text-v2-dim">{t('inicio.goals.empty')}</div>
              ) : (
                data.goals.map((g, i, arr) => {
                  const mark = goalMark(g.icon)
                  const pct = Math.min(100, g.percentage)
                  return (
                    <RowButton key={g.id} last={i === arr.length - 1} onClick={() => navigate('/planes?tab=metas')}>
                      <div
                        className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-full"
                        style={{ background: `conic-gradient(${mark.color} ${pct}%, var(--v2-line) 0)` }}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-v2-surface">
                          <Glyph paths={mark.glyph} size={17} color={mark.color} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="text-[12.5px] font-bold">{g.name}</div>
                        <Money hidden={hidden} className="mt-0.5 block text-[11.5px] text-v2-muted">
                          {fill(t('inicio.goals.progress'), format(g.currentAmount), format(g.targetAmount))}
                        </Money>
                        <div className="mt-0.5 text-[11px] text-v2-dim">
                          {g.plan ? planText(g.plan, walletName(g.plan.accountId), format) : g.targetDate ? `Fecha objetivo ${shortDayMonth(g.targetDate)}` : 'Sin fecha objetivo'}
                        </div>
                      </div>
                      <span className="font-numeric text-[12px] font-extrabold text-v2-muted">{g.percentage}%</span>
                    </RowButton>
                  )
                })
              )}
            </div>
          </Card>

          {/* Préstamos */}
          <LoansCard loans={data.loans} wallets={data.wallets} hidden={hidden} onOpen={(side) => navigate(`/planes?tab=prestamos${side ? `&side=${side}` : ''}`)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[18px] min-[1100px]:grid-cols-[1fr_1.35fr]">
        {/* Gasto por categoría */}
        <Card>
          <CardHead
            title={t('inicio.categories.title')}
            subtitle={monthYear(data.categories?.month ?? monthKey, language)}
            link={t('inicio.seeInReportes')}
            onLink={() => navigate('/reportes')}
          />
          <div className="mt-4 flex flex-col gap-[13px]">
            {data.categories === null ? (
              <RowSkeletons count={4} />
            ) : data.categories.categories.length === 0 ? (
              <div className="text-[12.5px] text-v2-dim">{t('inicio.categories.empty')}</div>
            ) : (
              data.categories.categories.map((c, _, arr) => (
                <div key={c.category} className="flex items-center gap-3">
                  <CategoryMark category={c.category} box={30} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex justify-between gap-2.5 text-[12px]">
                      <span className="font-bold">{tCategory(c.category)}</span>
                      <Money hidden={hidden} className="text-v2-muted">
                        {format(c.amount)}
                      </Money>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-[3px] bg-v2-line">
                      <div className="h-full" style={{ width: `${Math.round((c.amount / arr[0].amount) * 100)}%`, background: categoryColor(c.category) }} />
                    </div>
                  </div>
                  <span className="font-numeric w-[34px] text-right text-[11px] font-extrabold text-v2-dim">{c.percentage}%</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Próximos 14 días */}
        <Card>
          <CardHead
            title={t('inicio.upcoming.title')}
            subtitle={t('inicio.upcoming.subtitle')}
            link={t('inicio.seeInMovimientos')}
            onLink={() => navigate('/movimientos')}
          />
          <div className="mt-2.5 flex flex-col">
            {upcoming === null ? (
              <RowSkeletons count={3} />
            ) : upcoming.length === 0 ? (
              <div className="pb-1 pt-3.5 text-[12.5px] text-v2-dim">{t('inicio.upcoming.empty')}</div>
            ) : (
              upcoming.map((ev, i, arr) => {
                const [, m, d] = ev.date.split('-').map(Number)
                const wallet = data.wallets?.find((w) => w.id === ev.series.accountId)
                return (
                  <RowButton key={ev.series.id} last={i === arr.length - 1} onClick={() => setOpenSeriesId(ev.series.id)}>
                    <div className="w-[42px] flex-none text-center">
                      <div className={cn('text-[9.5px] font-bold tracking-[.06em]', ev.dueToday ? 'text-v2-warn' : 'text-v2-dim')}>
                        {ev.dueToday ? t('inicio.upcoming.today') : MONTHS_SHORT[language][m - 1].toUpperCase()}
                      </div>
                      <div className="font-numeric text-[15px] font-extrabold">{String(d).padStart(2, '0')}</div>
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-[12.5px] font-bold">{ev.series.name}</div>
                      <div className="text-[11px] text-v2-dim">
                        {ev.dueToday ? t('inicio.upcoming.dueToday') : `${tCategory(ev.series.category)} · ${wallet?.name ?? ''}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <Money hidden={hidden} className={cn('block text-[13px] font-extrabold', ev.signed < 0 ? 'text-v2-neg' : 'text-v2-pos')}>
                        {`${ev.signed < 0 ? '−' : '+'}${format(Math.abs(ev.signed))}`}
                      </Money>
                      <Money hidden={hidden} className="block text-[10.5px] text-v2-dim">
                        {fill(t('inicio.upcoming.balance'), format(ev.running))}
                      </Money>
                    </div>
                  </RowButton>
                )
              })
            )}
          </div>
        </Card>
      </div>

      {openSeries && (
        <EventDialog
          series={openSeries}
          walletName={data.wallets?.find((w) => w.id === openSeries.accountId)?.name ?? ''}
          today={today}
          hidden={hidden}
          onClose={() => setOpenSeriesId(null)}
          onChanged={() => {
            setOpenSeriesId(null)
            void refresh()
            void refreshAppData()
          }}
        />
      )}
    </div>
  )
}

function budgetsSubtitle(today: string, language: 'es' | 'en', t: (k: TranslationKey) => string): string {
  const left = daysLeftInMonth(today)
  const month = MONTHS_LONG[language][Number(today.slice(5, 7)) - 1]
  if (left === 0) return fill(t('inicio.budgets.subtitleLast'), month)
  if (left === 1) return fill(t('inicio.budgets.subtitleOne'), month)
  return fill(t('inicio.budgets.subtitle'), left, month)
}

// ── Pieces ──────────────────────────────────────────────────────────────

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-[16px] border border-v2-line bg-v2-surface p-5', className)}>{children}</section>
}

function CardHead({ title, subtitle, link, onLink }: { title: string; subtitle?: string; link?: string; onLink?: () => void }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div>
        <h2 className="text-[14px] font-extrabold tracking-[-.01em]">{title}</h2>
        {subtitle && <div className="mt-0.5 text-[11.5px] text-v2-dim">{subtitle}</div>}
      </div>
      {link && (
        <button type="button" onClick={onLink} className="cursor-pointer whitespace-nowrap text-[11.5px] font-extrabold text-v2-accent2">
          {link}
        </button>
      )}
    </div>
  )
}

function HeroStat({ label, value, color, hidden }: { label: string; value: string | null; color: string; hidden: boolean }) {
  return (
    <div className="flex-1 rounded-[14px] bg-white/[.06] px-3.5 py-[11px]">
      <div className="text-[10.5px] text-white/[.62]">{label}</div>
      {value === null ? (
        <SkeletonBar className="mt-1.5 h-4 w-[60%]" dark />
      ) : (
        <Money hidden={hidden} className="mt-[3px] block text-[16px] font-extrabold" style={{ color }}>
          {value}
        </Money>
      )}
    </div>
  )
}

// Six months of net savings (income − expenses), oldest first; the current
// month is the solid accent bar, as in the mockup.
function MonthBars({ months, language }: { months: MonthTotals[] | null; language: 'es' | 'en' }) {
  if (!months) return <SkeletonBar className="mt-[22px] h-14 w-full" dark />
  const max = Math.max(1, ...months.map((m) => Math.abs(m.net)))
  return (
    <div aria-hidden="true">
      <div className="mt-[22px] flex h-14 items-end gap-[5px]">
        {months.map((m, i) => {
          const last = i === months.length - 1
          return (
            <div
              key={m.month}
              className="flex-1 rounded-[3px]"
              style={{
                height: `${Math.max(4, Math.round((Math.abs(m.net) / max) * 83))}%`,
                background: last ? 'var(--v2-accent3)' : `rgba(165,157,255,${(0.22 + i * 0.035).toFixed(2)})`,
              }}
            />
          )
        })}
      </div>
      <div className="mt-2 flex gap-[5px] text-[10px] text-white/50">
        {months.map((m) => (
          <span key={m.month} className="flex-1 text-center">
            {monthAbbr(m.month, language)}
          </span>
        ))}
      </div>
    </div>
  )
}

function AlertCard({
  alert,
  today,
  hidden,
  wallets,
  onOpen,
  onConfirm,
  onSkip,
  onDismiss,
}: {
  alert: AppAlert
  today: string
  hidden: boolean
  wallets: Wallet[]
  onOpen: () => void
  onConfirm?: () => void
  onSkip?: () => void
  onDismiss: () => void
}) {
  const { t, tCategory, language } = useTranslation()
  const { format } = useCurrency()
  const copy = alertCopy(alert, today, language, t, tCategory, wallets)
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-v2-line bg-v2-surface2 py-[13px] pl-[13px] pr-2.5 hover:border-v2-line2"
    >
      <GlyphMark paths={copy.glyph} color={copy.color} box={32} />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-bold">{copy.title}</div>
        <div className="mt-[3px] text-[11.5px] leading-[1.45] text-v2-dim">
          <MoneyText parts={copy.body} hidden={hidden} format={format} />
        </div>
        {onConfirm && onSkip && (
          <div className="mt-[9px] flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12px] font-extrabold">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onConfirm()
              }}
              className="cursor-pointer text-v2-accent2"
            >
              Confirmar aporte
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSkip()
              }}
              className="cursor-pointer text-v2-muted"
            >
              Omitir esta vez
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        title={t('inicio.alerts.dismiss')}
        aria-label={t('inicio.alerts.dismiss')}
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
        className="flex h-[26px] w-[26px] flex-none cursor-pointer items-center justify-center rounded-[8px] text-v2-dim hover:bg-v2-subtle hover:text-v2-text"
      >
        <StrokeIcon paths={ICON_PATHS.close} size={13} />
      </button>
    </div>
  )
}

function LoansCard({ loans, wallets, hidden, onOpen }: { loans: Transaction[] | null; wallets: Wallet[] | null; hidden: boolean; onOpen: (side?: 'lent' | 'borrowed') => void }) {
  const { t, language } = useTranslation()
  const { format } = useCurrency()
  const open = loans ? openLoans(loans) : []
  const settled = loans ? loans.filter((l) => (l.status ?? 'completed') === 'completed' && (l.outstanding ?? 0) === 0).length : 0
  const sum = (kind: 'lent' | 'borrowed') => open.filter((l) => l.loanKind === kind).reduce((s, l) => s + (l.outstanding ?? 0), 0)
  const next = loans ? nextDueLoan(loans) : undefined
  return (
    <Card>
      <CardHead
        title={t('inicio.loans.title')}
        subtitle={loans ? fill(t('inicio.loans.subtitle'), open.length, settled) : undefined}
        link={t('inicio.seeInPlanes')}
        onLink={() => onOpen()}
      />
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <LoanBox label={t('inicio.loans.owedToYou')} value={loans ? format(sum('lent')) : null} color="var(--v2-pos)" hidden={hidden} />
        <LoanBox label={t('inicio.loans.youOwe')} value={loans ? format(sum('borrowed')) : null} color="var(--v2-neg)" hidden={hidden} />
      </div>
      {next && (
        <button
          type="button"
          onClick={() => onOpen(next.loanKind)}
          className="mx-[-8px] mt-1 flex w-[calc(100%+16px)] cursor-pointer items-center gap-3 px-2 pt-3 text-left text-v2-text"
        >
          <CategoryMark category="other" box={34} />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-bold">
              {fill(t(next.loanKind === 'lent' ? 'alert.loanLent.title' : 'alert.loanBorrowed.title'), next.counterpartyName ?? t('loans.unknownPerson'))}
            </div>
            <div className="text-[11px] text-v2-dim">
              {fill(t('inicio.loans.due'), shortDate(next.dueDate!, language), wallets?.find((w) => w.id === next.accountId)?.name ?? '')}
            </div>
          </div>
          <Money hidden={hidden} className="text-[13px] font-extrabold">
            {format(next.outstanding ?? 0)}
          </Money>
        </button>
      )}
    </Card>
  )
}

function LoanBox({ label, value, color, hidden }: { label: string; value: string | null; color: string; hidden: boolean }) {
  return (
    <div className="rounded-[12px] border border-v2-line bg-v2-surface2 px-[13px] py-[11px]">
      <div className="text-[10.5px] text-v2-dim">{label}</div>
      {value === null ? (
        <SkeletonBar className="mt-1.5 h-4 w-[60%]" />
      ) : (
        <Money hidden={hidden} className="mt-0.5 block text-[16px] font-extrabold" style={{ color }}>
          {value}
        </Money>
      )}
    </div>
  )
}

// Inicio shows up to six monthly category budgets, riskiest first.
function homeBudgets(budgets: ReturnType<typeof useAppData>['budgets']) {
  return sortByRisk(budgets.filter((b) => b.kind === 'category' && b.period === 'monthly')).slice(0, 6)
}
