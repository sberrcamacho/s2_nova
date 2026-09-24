import type { MoneyTemplate } from '@/components/v2/Money'
import type { TranslationKey } from '@/lib/i18n/translations'
import { budgetNote, fill, goalEta, monthYearLower } from '@/lib/inicio'
import type { Goal, Transaction } from '@/types'

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

// Goal categories (backend GOAL_CATEGORY_IDS, stored in Goal.themeIcon), in
// Android's order, with the Android mockup's name keywords (GOAL_KEYWORDS).
export const GOAL_CATEGORY_IDS = ['EMERGENCY', 'TRAVEL', 'EDUCATION', 'HOUSING', 'VEHICLE', 'TECHNOLOGY', 'HEALTH', 'DEBT', 'RETIREMENT', 'OTHER'] as const
export type GoalCategoryId = (typeof GOAL_CATEGORY_IDS)[number]

const GOAL_KEYWORDS: [GoalCategoryId, string[]][] = [
  ['EMERGENCY', ['emergencia', 'fondo', 'imprevisto', 'colchon', 'colchón', 'respaldo']],
  ['TRAVEL', ['viaje', 'vacacion', 'peru', 'perú', 'europa', 'vuelo', 'tiquete', 'hotel', 'crucero', 'paseo']],
  ['EDUCATION', ['estudio', 'universidad', 'semestre', 'maestr', 'especializa', 'curso', 'diplomado', 'posgrado', 'ingles', 'inglés', 'matricula', 'matrícula']],
  ['HOUSING', ['casa', 'apartamento', 'apto', 'vivienda', 'cuota inicial', 'remodel', 'mudanza', 'arriendo', 'lote']],
  ['VEHICLE', ['carro', 'moto', 'vehiculo', 'vehículo', 'bicicleta', 'bici', 'soat', 'llantas']],
  ['TECHNOLOGY', ['portatil', 'portátil', 'laptop', 'computador', 'celular', 'tablet', 'consola', 'camara', 'cámara', 'tecnolog', 'monitor']],
  ['HEALTH', ['salud', 'cirug', 'odont', 'brackets', 'ortodoncia', 'gimnasio', 'gym', 'lentes', 'terapia']],
  ['DEBT', ['deuda', 'tarjeta', 'credito', 'crédito', 'prestamo', 'préstamo', 'saldar', 'libranza']],
  ['RETIREMENT', ['retiro', 'pension', 'pensión', 'jubila', 'inversion', 'inversión', 'futuro', 'largo plazo']],
]

export function guessGoalCategory(name: string): GoalCategoryId | null {
  const n = name.toLowerCase().trim()
  if (!n) return null
  return GOAL_KEYWORDS.find(([, words]) => words.some((w) => n.includes(w)))?.[0] ?? null
}
