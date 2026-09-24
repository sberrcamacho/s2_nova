import type { Transaction } from '@/types'

export type MovementFilter = 'all' | 'expenses' | 'income'

// How many months the period selector offers, newest first (the Web v2
// mockup shows the current month and the ones before it).
export const PERIOD_MONTHS = 6

// "YYYY-MM" keys for the current month and the n-1 before it.
export function recentMonths(today: string, n = PERIOD_MONTHS): string[] {
  const [y, m] = today.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

// Mockup shortWallet: "Bancolombia — Ahorros" reads as "Bancolombia".
export function shortWallet(name: string): string {
  return name.split('—')[0].trim()
}

// The mockup's Movimientos filter: type pill plus a search over what the
// row shows — description, merchant, category and wallet. Transfers count
// as neither income nor expense.
export function filterMovements(
  txns: Transaction[],
  filter: MovementFilter,
  query: string,
  labels: { category: (t: Transaction) => string; wallet: (t: Transaction) => string },
): Transaction[] {
  const q = query.trim().toLowerCase()
  return txns.filter((t) => {
    if (filter === 'expenses' && t.type !== 'expense') return false
    if (filter === 'income' && t.type !== 'income') return false
    if (!q) return true
    return `${t.description} ${t.merchant ?? ''} ${labels.category(t)} ${labels.wallet(t)}`.toLowerCase().includes(q)
  })
}
