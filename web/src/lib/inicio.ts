// Pure presentation helpers for Inicio (and the "Nuevo movimiento" panel).
// Financial figures themselves — balances, budget progress, loan
// outstanding, alerts, monthly totals — come from the backend; these only
// arrange, label and project them for display.
import type { BudgetProgress } from '@/services/budgetService'
import type { AccountType, CategoryId, Goal, LanguageCode, RecurringSeries, Transaction } from '@/types'

export const MONTHS_SHORT: Record<LanguageCode, string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
}
export const MONTHS_LONG: Record<LanguageCode, string[]> = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

// "{0} de {1}" → fill(template, a, b)
export function fill(template: string, ...args: (string | number)[]): string {
  return template.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''))
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return [y, m, d]
}

function toUTC(iso: string): number {
  const [y, m, d] = parts(iso)
  return Date.UTC(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  return new Date(toUTC(iso) + days * 86_400_000).toISOString().slice(0, 10)
}

// "21 ago"
export function shortDate(iso: string, language: LanguageCode): string {
  const [, m, d] = parts(iso)
  return `${d} ${MONTHS_SHORT[language][m - 1]}`
}

// "Agosto 2026"
export function monthYear(monthKey: string, language: LanguageCode): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${capitalize(MONTHS_LONG[language][m - 1])} ${y}`
}

// Six-month bar labels: "Mar", "Abr", …
export function monthAbbr(monthKey: string, language: LanguageCode): string {
  const m = Number(monthKey.split('-')[1])
  return capitalize(MONTHS_SHORT[language][m - 1])
}

export function daysInMonth(iso: string): number {
  const [y, m] = parts(iso)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function daysLeftInMonth(today: string): number {
  return daysInMonth(today) - parts(today)[2]
}

// ── Wallets ────────────────────────────────────────────────────────────
export type WalletKind = 'savings' | 'debit' | 'credit' | 'digital' | 'cash' | 'crypto' | 'other'

export function walletKind(type: AccountType): WalletKind {
  switch (type) {
    case 'SAVINGS':
      return 'savings'
    case 'BANK_DEBIT':
      return 'debit'
    case 'BANK_CREDIT':
      return 'credit'
    case 'NEQUI':
    case 'DAVIPLATA':
      return 'digital'
    case 'CASH':
      return 'cash'
    case 'CRYPTO':
      return 'crypto'
    default:
      return 'other'
  }
}

// Stroke paths from the Web v2 mockup's ICONS (bank / phone / cash).
export const WALLET_ICON_PATHS: Record<'bank' | 'phone' | 'cash', string> = {
  bank: 'M3 10h18 M5 10v8 M9.5 10v8 M14.5 10v8 M19 10v8 M3 21h18 M12 3l9 5H3z',
  phone: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M11 18h2',
  cash: 'M2 6h20v12H2z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 12h.01 M18 12h.01',
}

export function walletIcon(type: AccountType): keyof typeof WALLET_ICON_PATHS {
  const kind = walletKind(type)
  if (kind === 'digital') return 'phone'
  if (kind === 'cash') return 'cash'
  return 'bank'
}

// ── Budgets ────────────────────────────────────────────────────────────
export type Tone = 'neg' | 'warn' | 'pos'

// Same rule as Android: ≥90 negative, ≥65 warning, else positive.
export function budgetTone(percentage: number): Tone {
  if (percentage >= 90) return 'neg'
  if (percentage >= 65) return 'warn'
  return 'pos'
}

export function sortByRisk(budgets: BudgetProgress[]): BudgetProgress[] {
  return budgets.slice().sort((a, b) => b.percentage - a.percentage)
}

export type BudgetNote =
  | { kind: 'over'; amount: number }
  | { kind: 'exceeds'; days: number }
  | { kind: 'closes'; amount: number }
  | { kind: 'relaxed' }

// Linear projection of this month's pace: spent so far ÷ days elapsed.
// "Se supera en ~N días" when the pace crosses the limit before month end,
// "Cerraría en ~$X" once the budget is at warning level, "Holgado" otherwise.
export function budgetNote(spent: number, limit: number, percentage: number, today: string): BudgetNote {
  if (spent > limit) return { kind: 'over', amount: spent - limit }
  const day = parts(today)[2]
  const perDay = day > 0 ? spent / day : 0
  const daysLeft = daysLeftInMonth(today)
  if (perDay > 0 && limit > spent) {
    const days = Math.ceil((limit - spent) / perDay)
    if (days <= daysLeft) return { kind: 'exceeds', days }
  }
  if (percentage >= 65) return { kind: 'closes', amount: Math.round((perDay * daysInMonth(today)) / 10_000) * 10_000 }
  return { kind: 'relaxed' }
}

// ── Goals ──────────────────────────────────────────────────────────────
export type GoalEta =
  | { kind: 'done' }
  | { kind: 'insufficient' }
  | { kind: 'estimate'; month: string } // YYYY-MM

// Projects completion from the goal's own contribution history: needs
// contributions in at least two distinct months (anything less is
// "Sin historial suficiente para estimar", never a fabricated date), then
// averages them per month since the first one.
export function goalEta(goal: Goal, transactions: Transaction[], today: string): GoalEta {
  if (goal.remaining <= 0) return { kind: 'done' }
  const contributions = transactions.filter((t) => t.goalId === goal.id && (t.status ?? 'completed') === 'completed')
  const months = new Set(contributions.map((t) => t.date.slice(0, 7)))
  if (months.size < 2) return { kind: 'insufficient' }
  const first = [...months].sort()[0]
  const [fy, fm] = first.split('-').map(Number)
  const [ty, tm] = parts(today)
  const span = (ty - fy) * 12 + (tm - fm) + 1
  const perMonth = contributions.reduce((s, t) => s + t.amount, 0) / span
  if (perMonth <= 0) return { kind: 'insufficient' }
  const ahead = Math.ceil(goal.remaining / perMonth)
  const index = ty * 12 + (tm - 1) + ahead
  return { kind: 'estimate', month: `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}` }
}

// ── Upcoming (Próximos 14 días) ──────────────────────────────────────
export interface UpcomingEvent {
  series: RecurringSeries
  date: string // the occurrence date shown (today for a due/overdue one)
  dueToday: boolean
  signed: number // negative for an expense
  running: number // projected balance after this event
}

// Active Programados whose next occurrence falls within `days` of today.
// Anything due today or overdue sorts first and is dated today; the running
// balance starts from the wallet total and applies each event in order.
export function upcomingWithin(series: RecurringSeries[], today: string, startBalance: number, days = 14): UpcomingEvent[] {
  const horizon = addDays(today, days)
  let running = startBalance
  return series
    .filter((s) => s.active && s.nextOccurrenceDate <= horizon)
    .map((s) => ({ s, dueToday: s.nextOccurrenceDate <= today }))
    .sort((a, b) => {
      if (a.dueToday !== b.dueToday) return a.dueToday ? -1 : 1
      return a.s.nextOccurrenceDate < b.s.nextOccurrenceDate ? -1 : a.s.nextOccurrenceDate > b.s.nextOccurrenceDate ? 1 : 0
    })
    .map(({ s, dueToday }) => {
      const signed = s.type === 'expense' ? -s.amount : s.amount
      running += signed
      return { series: s, date: dueToday ? today : s.nextOccurrenceDate, dueToday, signed, running }
    })
}

// Display-only: the occurrence after `iso` for the event dialog's
// "Siguiente" row. The real advance happens server-side on confirm/skip.
export function nextOccurrenceAfter(iso: string, interval: RecurringSeries['interval']): string {
  if (interval === 'weekly') return addDays(iso, 7)
  const [y, m, d] = parts(iso)
  const targetYear = interval === 'yearly' ? y + 1 : m === 12 ? y + 1 : y
  const targetMonth = interval === 'yearly' ? m : m === 12 ? 1 : m + 1
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`
}

// "marzo 2027" (lowercase in Spanish, as in "Estimada: marzo 2027")
export function monthYearLower(monthKey: string, language: LanguageCode): string {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTHS_LONG[language][m - 1]} ${y}`
}

// ── Loans ──────────────────────────────────────────────────────────────
export function openLoans(loans: Transaction[]): Transaction[] {
  return loans.filter((l) => (l.status ?? 'completed') === 'completed' && (l.outstanding ?? 0) > 0)
}

export function nextDueLoan(loans: Transaction[]): Transaction | undefined {
  return openLoans(loans)
    .filter((l) => l.dueDate)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))[0]
}

// ── Alert dismissals (per user, per browser) ──────────────────────────
const dismissedKey = (userId: string) => `s2nova.dismissedAlerts.${userId}`

export function loadDismissed(userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(dismissedKey(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function saveDismissed(userId: string, ids: string[]): void {
  try {
    window.localStorage.setItem(dismissedKey(userId), JSON.stringify(ids))
  } catch {
    // Storage unavailable (private mode) — dismissals just won't persist.
  }
}

// Drop remembered ids whose condition no longer exists, so storage can't
// grow forever and a condition that recurs later (new id) shows again.
export function pruneDismissed(dismissed: string[], liveIds: string[]): string[] {
  const live = new Set(liveIds)
  return dismissed.filter((id) => live.has(id))
}

// ── "Nuevo movimiento" category suggestion ────────────────────────────
// Keyword table verbatim from the Web v2 mockup (KEYWORDS/guessCat) — a
// presentation hint only; the user's explicit pick always wins.
const KEYWORDS: [CategoryId, string[]][] = [
  ['food', ['mercado', 'comida', 'almuerzo', 'desayuno', 'cena', 'restaurante', 'cafe', 'café', 'super', 'domicilio']],
  ['transportation', ['taxi', 'uber', 'gasolina', 'bus', 'metro', 'peaje', 'parqueadero', 'viaje en app']],
  ['bills', ['luz', 'agua', 'gas', 'internet', 'arriendo', 'celular', 'factura', 'administración', 'administracion']],
  ['subscriptions', ['netflix', 'spotify', 'suscrip', 'icloud', 'disney']],
  ['entertainment', ['cine', 'concierto', 'fiesta', 'viaje', 'hotel']],
  ['shopping', ['ropa', 'zapato', 'regalo', 'tecnolog']],
  ['health', ['farmacia', 'droguería', 'medico', 'médico', 'gym', 'gimnasio']],
  ['salary', ['salario', 'nómina', 'nomina', 'sueldo']],
  ['freelance', ['freelance', 'proyecto', 'honorarios']],
]

export function guessCategory(text: string): CategoryId | null {
  const n = text.toLowerCase()
  if (!n.trim()) return null
  return KEYWORDS.find(([, words]) => words.some((w) => n.includes(w)))?.[0] ?? null
}

export const EXPENSE_CATEGORY_IDS: CategoryId[] = ['food', 'transportation', 'shopping', 'health', 'education', 'entertainment', 'bills', 'subscriptions']
export const INCOME_CATEGORY_IDS: CategoryId[] = ['salary', 'freelance', 'other']
