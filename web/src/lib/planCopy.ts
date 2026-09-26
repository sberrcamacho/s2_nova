import type { MoneyTemplate } from '@/components/v2/Money'
import type { TranslationKey } from '@/lib/i18n/translations'
import { budgetNote, fill, goalEta, monthYearLower } from '@/lib/inicio'
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

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const dayMonth = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS_ES[m - 1]}`
}

// "Entretenimiento · Streaming", "Vivienda · Todas" (+ " · solo Nequi"),
// "Personalizado · 3 movimientos asignados" — the mockup's budget scope.
export function budgetScope(b: BudgetProgress, walletName: (id: string) => string): string {
  if (b.kind === 'custom') return `Personalizado · ${b.assignedCount ?? 0} movimientos asignados`
  const node = categoryNode(b.category)
  const label = node?.parentId ? categoryLabel(b.category) : `${categoryName(b.category)} · Todas`
  return label + (b.walletIds.length ? ` · solo ${b.walletIds.map(walletName).join(', ')}` : '')
}

export function budgetStateNote(b: BudgetProgress, today: string, format: (v: number) => string): string {
  if (b.period === 'custom' && b.kind === 'category' && b.startDate && b.startDate > today) return 'Aún no empieza'
  if (b.spent > b.limit) return `Superado por ${format(b.spent - b.limit)}`
  return b.percentage >= 90 ? 'Cerca del límite' : b.percentage >= 65 ? 'Vigílalo' : 'Holgado'
}

export function budgetPeriodLabel(b: BudgetProgress): string {
  return b.period === 'custom' && b.startDate && b.endDate ? `${dayMonth(b.startDate)} – ${dayMonth(b.endDate)} · no se reinicia` : 'Mensual · se reinicia el 1'
}

// "Aporte semanal de $100.000 desde Nequi · automático"
export function planText(plan: GoalPlan, walletName: string, format: (v: number) => string): string {
  const freq = plan.frequency === 'daily' ? 'diario' : plan.frequency === 'weekly' ? 'semanal' : 'mensual'
  return `Aporte ${freq} de ${format(plan.amount)} desde ${walletName} · ${plan.autoConfirm ? 'automático' : 'con confirmación'}`
}

export function shortDayMonth(iso: string): string {
  return dayMonth(iso)
}

const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// "30 de junio de 2027" — the mockup's fmtDateLong.
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} de ${MONTHS_LONG[m - 1]} de ${y}`
}

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
  return { month: MONTHS_LONG[m - 1], year: y }
}
