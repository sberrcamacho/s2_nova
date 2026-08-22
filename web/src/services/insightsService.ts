import { accountService } from '@/services/accountService'
import { analyticsService } from '@/services/analyticsService'
import { budgetService } from '@/services/budgetService'
import { goalService } from '@/services/goalService'
import { recurringService } from '@/services/recurringService'
import { transactionService } from '@/services/transactionService'
import { categoryTranslationKey, translate, type TranslationKey } from '@/lib/i18n/translations'
import { currentMonthKey, isSameMonth } from '@/lib/date'
import type { CategoryId, LanguageCode, Transaction } from '@/types'

// Web-exclusive: prescriptive, data-driven suggestions — distinct from
// AnalyticsPage's charts/KPIs, which show numbers but don't turn them into
// advice. Every insight here is derived from real transaction/budget/goal
// data already in the app; none are fabricated. This is intentionally
// Web-only (macro-analysis) — Android stays focused on fast data entry,
// per root AGENTS.md's Android/Web split.

export type InsightTone = 'positive' | 'warning' | 'negative' | 'neutral'
export type InsightKind =
  | 'budgetPace'
  | 'categorySpike'
  | 'categoryShare'
  | 'subscriptions'
  | 'savingsRate'
  | 'goalTarget'
  | 'goalProgress'
  | 'unusualTransaction'
  | 'monthProjection'
  | 'upcomingExpenses'
  | 'spendingStreak'

export interface Insight {
  id: string
  kind: InsightKind
  tone: InsightTone
  title: string
  description: string
}

function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const d = new Date(year!, month! - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year!, month!, 0).getDate()
}

export async function getInsights(language: LanguageCode, format: (amount: number) => string): Promise<Insight[]> {
  const t = (key: TranslationKey) => translate(key, language)
  const tCategory = (id: CategoryId) => translate(categoryTranslationKey(id), language)

  const monthKey = currentMonthKey()
  const prevMonthKey = previousMonthKey(monthKey)
  const now = new Date()
  const dayOfMonth = now.getDate()
  const totalDays = daysInMonth(monthKey)
  const daysRemaining = Math.max(0, totalDays - dayOfMonth)

  const [budgets, goals, currentBreakdown, prevBreakdown, history, currentSummary, prevSummary, recurringSeries] = await Promise.all([
    budgetService.getBudgets(monthKey),
    goalService.getGoals(),
    analyticsService.getCategoryBreakdown(monthKey),
    analyticsService.getCategoryBreakdown(prevMonthKey),
    analyticsService.getMonthlyHistory(4, language),
    analyticsService.getMonthlySummary(monthKey, language),
    analyticsService.getMonthlySummary(prevMonthKey, language),
    recurringService.getRecurringSeries(),
  ])

  const insights: Insight[] = []

  // 1. Budget pace — will this budget be exceeded before month end at the
  // current daily spend rate?
  if (dayOfMonth >= 3) {
    for (const b of budgets) {
      if (b.percentage >= 100) continue // already over — the budget card's own badge covers this
      const dailyRate = b.spent / dayOfMonth
      if (dailyRate <= 0) continue
      const daysUntilOver = (b.limit - b.spent) / dailyRate
      if (daysUntilOver < daysRemaining) {
        const label = b.name ?? tCategory(b.category)
        insights.push({
          id: `budgetPace-${b.id}`,
          kind: 'budgetPace',
          tone: 'warning',
          title: t('insights.budgetPace.title'),
          description: `${t('insights.budgetPace.prefix')} "${label}" ${t('insights.budgetPace.middle')} ~${Math.max(1, Math.round(daysUntilOver))} ${t('insights.budgetPace.suffix')}`,
        })
      }
    }
  }

  // 2. Category spike — biggest month-over-month increase, ignoring
  // near-zero baselines so a new small category doesn't read as a "spike."
  const prevByCategory = new Map(prevBreakdown.map((e) => [e.category, e.amount]))
  let biggestSpike: { category: CategoryId; amount: number; prevAmount: number; pct: number } | null = null
  for (const entry of currentBreakdown) {
    const prevAmount = prevByCategory.get(entry.category) ?? 0
    if (prevAmount < 50_000) continue
    const pct = Math.round(((entry.amount - prevAmount) / prevAmount) * 100)
    if (pct >= 25 && (!biggestSpike || pct > biggestSpike.pct)) {
      biggestSpike = { category: entry.category, amount: entry.amount, prevAmount, pct }
    }
  }
  if (biggestSpike) {
    insights.push({
      id: 'categorySpike',
      kind: 'categorySpike',
      tone: 'warning',
      title: t('insights.categorySpike.title'),
      description: `${tCategory(biggestSpike.category)} +${biggestSpike.pct}% ${t('insights.categorySpike.suffix')} (${format(biggestSpike.amount)} ${t('insights.vs')} ${format(biggestSpike.prevAmount)})`,
    })
  }

  // 3. Subscription audit
  const subscriptionsTotal = currentBreakdown.find((e) => e.category === 'subscriptions')?.amount ?? 0
  if (subscriptionsTotal > 0) {
    insights.push({
      id: 'subscriptions',
      kind: 'subscriptions',
      tone: 'neutral',
      title: t('insights.subscriptions.title'),
      description: `${t('insights.subscriptions.prefix')} ${format(subscriptionsTotal)} ${t('insights.subscriptions.suffix')}`,
    })
  }

  // 4. Savings rate trend — first vs. last month in the recent window
  if (history.length >= 2) {
    const rateOf = (m: (typeof history)[number]) => (m.income > 0 ? (m.savings / m.income) * 100 : 0)
    const first = rateOf(history[0]!)
    const last = rateOf(history[history.length - 1]!)
    const delta = Math.round(last - first)
    if (Math.abs(delta) >= 5) {
      insights.push({
        id: 'savingsRate',
        kind: 'savingsRate',
        tone: delta >= 0 ? 'positive' : 'negative',
        title: t('insights.savingsRate.title'),
        description: `${t('insights.savingsRate.prefix')} ${delta >= 0 ? '+' : ''}${delta} ${t('insights.savingsRate.suffix')} (${Math.round(first)}% → ${Math.round(last)}%)`,
      })
    }
  }

  // 5. Required monthly contribution to hit a goal by its target date —
  // deliberately NOT a "projected completion at current pace" claim, since
  // there's no reliable per-period contribution history to derive a real
  // current rate from; this only uses the goal's own real numbers.
  for (const g of goals) {
    if (!g.targetDate) continue
    const remaining = g.targetAmount - g.currentAmount
    if (remaining <= 0) continue
    const target = new Date(`${g.targetDate}T00:00:00`)
    const monthsLeft = Math.max(1, Math.round((target.getTime() - now.getTime()) / (30 * 86_400_000)))
    const requiredMonthly = remaining / monthsLeft
    insights.push({
      id: `goalTarget-${g.id}`,
      kind: 'goalTarget',
      tone: 'neutral',
      title: t('insights.goalTarget.title'),
      description: `${t('insights.goalTarget.prefix')} ${format(requiredMonthly)} ${t('insights.goalTarget.middle')} "${g.name}" ${t('insights.goalTarget.suffix')}`,
    })
  }

  // 6. Unusual transaction — this month's biggest outlier vs. that
  // category's own historical average (needs at least 4 prior data points
  // per category to be a meaningful average, not a fluke).
  const allExpenses = transactionService._snapshot().filter((txn) => txn.type === 'expense')
  const amountsByCategory = new Map<CategoryId, number[]>()
  for (const txn of allExpenses) {
    const list = amountsByCategory.get(txn.category) ?? []
    list.push(txn.amount)
    amountsByCategory.set(txn.category, list)
  }
  let biggestOutlier: { txn: Transaction; avg: number } | null = null
  for (const txn of allExpenses.filter((txn) => isSameMonth(txn.date, monthKey))) {
    const amounts = amountsByCategory.get(txn.category) ?? []
    if (amounts.length < 4) continue
    const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length
    if (avg <= 0 || txn.amount < avg * 2) continue
    if (!biggestOutlier || txn.amount > biggestOutlier.txn.amount) biggestOutlier = { txn, avg }
  }
  if (biggestOutlier) {
    insights.push({
      id: `unusualTransaction-${biggestOutlier.txn.id}`,
      kind: 'unusualTransaction',
      tone: 'negative',
      title: t('insights.unusualTransaction.title'),
      description: `${format(biggestOutlier.txn.amount)} ${t('insights.unusualTransaction.middle')} ${tCategory(biggestOutlier.txn.category)} ${t('insights.unusualTransaction.suffix')} (${t('insights.avg')} ${format(biggestOutlier.avg)})`,
    })
  }

  // 7. End-of-month projection — this month's spend-to-date, pro-rated,
  // vs. last month's actual total. Distinct from AnalyticsPage's
  // "forecastNextMonth" KPI (a 3-month average), not a duplicate.
  if (dayOfMonth >= 5 && prevSummary.expenses > 0) {
    const dailyRate = currentSummary.expenses / dayOfMonth
    const projected = dailyRate * totalDays
    const delta = projected - prevSummary.expenses
    const pct = Math.round((delta / prevSummary.expenses) * 100)
    if (Math.abs(pct) >= 10) {
      insights.push({
        id: 'monthProjection',
        kind: 'monthProjection',
        tone: delta <= 0 ? 'positive' : 'negative',
        title: t('insights.monthProjection.title'),
        description: `${t('insights.monthProjection.prefix')} ${format(projected)} (${delta <= 0 ? '' : '+'}${pct}% ${t('insights.monthProjection.suffix')} ${format(prevSummary.expenses)})`,
      })
    }
  }

  // 8. Category share of total spend — distinct from categorySpike (which
  // is about month-over-month change): this is about concentration, e.g.
  // "Transportation is 14% of your expenses."
  const topShare = [...currentBreakdown].sort((a, b) => b.percentage - a.percentage)[0]
  if (topShare && topShare.percentage >= 20) {
    insights.push({
      id: `categoryShare-${topShare.category}`,
      kind: 'categoryShare',
      tone: 'neutral',
      title: t('insights.categoryShare.title'),
      description: `${tCategory(topShare.category)} ${t('insights.categoryShare.suffix')} ${topShare.percentage}% ${t('insights.categoryShare.ofExpenses')} (${format(topShare.amount)}).`,
    })
  }

  // 9. Direct goal progress — separate from goalTarget's "required monthly
  // contribution": this just states where the goal stands today.
  for (const g of goals) {
    const percentage = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0
    if (percentage >= 10 && percentage < 100) {
      insights.push({
        id: `goalProgress-${g.id}`,
        kind: 'goalProgress',
        tone: 'positive',
        title: t('insights.goalProgress.title'),
        description: `"${g.name}" ${t('insights.goalProgress.suffix')} ${percentage}% ${t('insights.goalProgress.complete')} (${format(g.currentAmount)} ${t('insights.vs')} ${format(g.targetAmount)}).`,
      })
    }
  }

  // 10. Upcoming expenses total — from active recurring definitions only
  // (real, scheduled obligations), not a forecast.
  const upcomingExpensesTotal = recurringSeries
    .filter((s) => s.active && s.type === 'expense')
    .reduce((sum, s) => sum + s.amount, 0)
  if (upcomingExpensesTotal > 0) {
    insights.push({
      id: 'upcomingExpenses',
      kind: 'upcomingExpenses',
      tone: 'neutral',
      title: t('insights.upcomingExpenses.title'),
      description: `${t('insights.upcomingExpenses.prefix')} ${format(upcomingExpensesTotal)} ${t('insights.upcomingExpenses.suffix')}`,
    })
  }

  // 11. Spending streak — 3+ consecutive months of rising expenses.
  if (history.length >= 3) {
    let streak = 1
    for (let i = history.length - 1; i > 0; i--) {
      if (history[i]!.expenses > history[i - 1]!.expenses) streak++
      else break
    }
    if (streak >= 3) {
      insights.push({
        id: 'spendingStreak',
        kind: 'spendingStreak',
        tone: 'warning',
        title: t('insights.spendingStreak.title'),
        description: `${t('insights.spendingStreak.prefix')} ${streak} ${t('insights.spendingStreak.suffix')}`,
      })
    }
  }

  return insights
}

// --- Financial health summary -------------------------------------------
//
// A qualitative, per-category status for Overview — deliberately NOT a
// single arbitrary 0-100 score. Each category (savings, budget, cash flow,
// goals, debt) gets a short status word plus a one-line, data-driven
// explanation, e.g. "Savings: Good — saving 22% of income this month."
// A category is only ever labeled from a real computed number; when there
// isn't enough data to say anything (no budgets, no goals), the category
// says so explicitly instead of guessing.

export type HealthCategoryKey = 'savings' | 'budget' | 'cashFlow' | 'goals' | 'debt'
export type HealthStatus = 'good' | 'fair' | 'low' | 'onTrack' | 'nearLimit' | 'overBudget' | 'positive' | 'tight' | 'negative' | 'attention' | 'moderate' | 'high' | 'none'

export interface FinancialHealthCategory {
  key: HealthCategoryKey
  status: HealthStatus
  tone: InsightTone
  detail: string
}

export interface FinancialHealth {
  categories: FinancialHealthCategory[]
}

export async function getFinancialHealth(language: LanguageCode, format: (amount: number) => string): Promise<FinancialHealth> {
  const t = (key: TranslationKey) => translate(key, language)

  const monthKey = currentMonthKey()
  const prevMonthKey = previousMonthKey(monthKey)

  const [budgets, goals, wallets, summary, prevSummary] = await Promise.all([
    budgetService.getBudgets(monthKey),
    goalService.getGoals(),
    accountService.getWallets(),
    analyticsService.getMonthlySummary(monthKey, language),
    analyticsService.getMonthlySummary(prevMonthKey, language),
  ])

  const categories: FinancialHealthCategory[] = []

  // 1. Savings — this month's savings rate.
  const savingsRate = summary.income > 0 ? summary.savings / summary.income : 0
  const savingsPct = Math.round(savingsRate * 100)
  const savingsStatus: HealthStatus = savingsRate >= 0.2 ? 'good' : savingsRate >= 0.1 ? 'fair' : 'low'
  categories.push({
    key: 'savings',
    status: savingsStatus,
    tone: savingsStatus === 'good' ? 'positive' : savingsStatus === 'fair' ? 'warning' : 'negative',
    detail: summary.income > 0
      ? `${t('health.savings.saving')} ${savingsPct}% ${t('health.savings.ofIncome')}`
      : t('health.savings.noIncome'),
  })

  // 2. Budget — share of this month's category budgets that are over/near.
  if (budgets.length === 0) {
    categories.push({ key: 'budget', status: 'none', tone: 'neutral', detail: t('health.budget.none') })
  } else {
    const overCount = budgets.filter((b) => b.status === 'over_budget').length
    const nearCount = budgets.filter((b) => b.status === 'near_limit').length
    const status: HealthStatus = overCount > 0 ? 'overBudget' : nearCount > 0 ? 'nearLimit' : 'onTrack'
    categories.push({
      key: 'budget',
      status,
      tone: status === 'onTrack' ? 'positive' : status === 'nearLimit' ? 'warning' : 'negative',
      detail:
        overCount > 0
          ? `${overCount} ${overCount === 1 ? t('health.budget.categoryOver') : t('health.budget.categoriesOver')}`
          : nearCount > 0
            ? `${nearCount} ${nearCount === 1 ? t('health.budget.categoryNear') : t('health.budget.categoriesNear')}`
            : t('health.budget.allOnTrack'),
    })
  }

  // 3. Cash flow — this month's net (income - expenses), and whether it
  // improved or worsened vs. last month.
  const net = summary.savings
  const prevNet = prevSummary.savings
  const cashFlowStatus: HealthStatus = net > 0 ? 'positive' : net === 0 ? 'tight' : 'negative'
  categories.push({
    key: 'cashFlow',
    status: cashFlowStatus,
    tone: cashFlowStatus === 'positive' ? 'positive' : cashFlowStatus === 'tight' ? 'warning' : 'negative',
    detail:
      net >= prevNet
        ? `${t('health.cashFlow.net')} ${format(net)} ${t('health.cashFlow.improved')}`
        : `${t('health.cashFlow.net')} ${format(net)} ${t('health.cashFlow.worsened')}`,
  })

  // 4. Goals — flags a goal only when its deadline is close (within 90
  // days) and it's still well short of complete. This only reads a goal's
  // own real fields (currentAmount, targetAmount, targetDate); it doesn't
  // assume a start date or a contribution rate the data doesn't have, so
  // it can't mislabel a goal that simply hasn't been worked on long yet.
  if (goals.length === 0) {
    categories.push({ key: 'goals', status: 'none', tone: 'neutral', detail: t('health.goals.none') })
  } else {
    const now = Date.now()
    let attentionCount = 0
    for (const g of goals) {
      if (!g.targetDate || g.targetAmount <= 0) continue
      const daysLeft = (new Date(`${g.targetDate}T00:00:00`).getTime() - now) / 86_400_000
      const fraction = clamp01(g.currentAmount / g.targetAmount)
      if (daysLeft <= 90 && fraction < 0.7) attentionCount++
    }
    const status: HealthStatus = attentionCount === 0 ? 'onTrack' : 'attention'
    categories.push({
      key: 'goals',
      status,
      tone: status === 'onTrack' ? 'positive' : 'warning',
      detail: status === 'onTrack' ? t('health.goals.onTrack') : `${attentionCount} ${attentionCount === 1 ? t('health.goals.oneBehind') : t('health.goals.multipleBehind')}`,
    })
  }

  // 5. Debt — outstanding borrowed money relative to net assets (wallet
  // balances plus outstanding money lent out).
  const transactions = transactionService._snapshot()
  const outstandingBorrowed = transactions.filter((t) => t.loanKind === 'borrowed' && !t.loanSettled).reduce((sum, t) => sum + t.amount, 0)
  const outstandingLent = transactions.filter((t) => t.loanKind === 'lent' && !t.loanSettled).reduce((sum, t) => sum + t.amount, 0)
  const netAssets = wallets.reduce((sum, w) => sum + w.currentBalance, 0) + outstandingLent
  if (outstandingBorrowed === 0) {
    categories.push({ key: 'debt', status: 'none', tone: 'positive', detail: t('health.debt.none') })
  } else {
    const ratio = netAssets > 0 ? outstandingBorrowed / netAssets : 1
    const status: HealthStatus = ratio < 0.2 ? 'low' : ratio < 0.5 ? 'moderate' : 'high'
    categories.push({
      key: 'debt',
      status,
      tone: status === 'low' ? 'positive' : status === 'moderate' ? 'warning' : 'negative',
      detail: `${t('health.debt.outstanding')} ${format(outstandingBorrowed)}`,
    })
  }

  return { categories }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}
