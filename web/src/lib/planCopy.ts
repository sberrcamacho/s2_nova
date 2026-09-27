import type { MoneyTemplate } from '@/components/v2/Money'
import { currentLanguage, tr, type TranslationKey } from '@/lib/i18n/translations'
import { MONTHS_LONG, budgetNote, fill, goalEta, monthYearLower } from '@/lib/inicio'
import { fmtDate, fmtDateLong } from '@/lib/nuevoMovimiento'
import { categoryLabel, categoryName, categoryNode } from '@/lib/backendCategories'
import type { BudgetProgress } from '@/services/budgetService'
import type { Goal, GoalPlan, Transaction } from '@/types'

// Copy shared by Inicio's plan cards and Planes: a budget's pace note and a
// goal's estimated date.

export function budgetNoteText(note: ReturnType<typeof budgetNote>, t: (k: TranslationKey) => string): MoneyTemplate {
  switch (note.kind) {
    case 'over':
      return { template: t('inicio.budgets.over'), args: [] }
    case 'exceeds':
      return note.days === 1 ? { template: t('inicio.budgets.exceedsOne'), args: [] } : { template: t('inicio.budgets.exceeds'), args: [note.days] }
    case 'closes':
      return { template: t('inicio.budgets.closes'), args: [{ amount: note.amount }] }
    default:
      return { template: t('inicio.budgets.relaxed'), args: [] }
  }
}

export function goalEtaText(goal: Goal, transactions: Transaction[], today: string, language: 'es' | 'en', t: (k: TranslationKey) => string): string {
  const eta = goalEta(goal, transactions, today)
  const target = goal.targetDate ? fill(t('inicio.goals.target'), monthYearLower(goal.targetDate.slice(0, 7), language)) : ''
  if (eta.kind === 'done') return t('inicio.goals.done')
  if (eta.kind === 'insufficient') return t('inicio.goals.insufficient')
  return fill(t('inicio.goals.eta'), monthYearLower(eta.month, language)) + target
}

const dayMonth = fmtDate

// "Entretenimiento · Streaming", "Vivienda · Todas" (+ " · solo Nequi"),
// "Personalizado · 3 movimientos asignados" — the mockup's budget scope.
export function budgetScope(b: BudgetProgress, walletName: (id: string) => string): string {
  if (b.kind === 'custom') return fill(tr('plan.scope.custom'), b.assignedCount ?? 0)
  const node = categoryNode(b.category)
  const label = node?.parentId ? categoryLabel(b.category) : `${categoryName(b.category)} · ${tr('bud.all')}`
  return label + (b.walletIds.length ? fill(tr('plan.scope.only'), b.walletIds.map(walletName).join(', ')) : '')
}

export function budgetStateNote(b: BudgetProgress, today: string, format: (v: number) => string): string {
  if (b.period === 'custom' && b.kind === 'category' && b.startDate && b.startDate > today) return tr('plan.state.notStarted')
  if (b.spent > b.limit) return fill(tr('plan.state.over'), format(b.spent - b.limit))
  return tr(b.percentage >= 90 ? 'plan.state.near' : b.percentage >= 65 ? 'plan.state.watch' : 'plan.state.ok')
}

export function budgetPeriodLabel(b: BudgetProgress): string {
  return b.period === 'custom' && b.startDate && b.endDate ? fill(tr('plan.period.custom'), dayMonth(b.startDate), dayMonth(b.endDate)) : tr('plan.period.monthly')
}

// "Aporte semanal de $100.000 desde Nequi · automático"
export function planText(plan: GoalPlan, walletName: string, format: (v: number) => string): string {
  return fill(tr(`plan.text.${plan.frequency}` as TranslationKey), format(plan.amount), walletName) + ' · ' + tr(plan.autoConfirm ? 'nm.automatic' : 'nm.withConfirmation')
}

export function shortDayMonth(iso: string): string {
  return dayMonth(iso)
}

// "30 de junio de 2027" — the mockup's fmtDateLong.
export const longDate = fmtDateLong

// The mockup's addIso(): `k` steps of the frequency after `iso`.
export function addSteps(iso: string, frequency: GoalPlan['frequency'], k: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (frequency === 'daily') dt.setDate(dt.getDate() + k)
  else if (frequency === 'weekly') dt.setDate(dt.getDate() + 7 * k)
  else dt.setMonth(dt.getMonth() + k)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function monthYearLong(iso: string): { month: string; year: number } {
  const [y, m] = iso.split('-').map(Number)
  return { month: MONTHS_LONG[currentLanguage()][m - 1], year: y }
}
