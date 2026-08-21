import type { RecurringSeries } from '@/types'
import { DEFAULT_ACCOUNT_ID } from '@/data/accounts'
import { todayISO } from '@/lib/date'

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const today = todayISO()

// Seed recurring definitions — mirrors the shape Android creates via
// RecurringSeriesRepository / backend's RecurringSeries model.
export const recurringSeries: RecurringSeries[] = [
  {
    id: 'rec_salary',
    name: 'Salario',
    type: 'income',
    amount: 3_800_000,
    accountId: DEFAULT_ACCOUNT_ID,
    category: 'salary',
    interval: 'monthly',
    nextOccurrenceDate: addDays(today, 3),
    isDue: false,
    active: true,
  },
  {
    id: 'rec_netflix',
    name: 'Netflix',
    type: 'expense',
    amount: 45_000,
    accountId: DEFAULT_ACCOUNT_ID,
    category: 'subscriptions',
    interval: 'monthly',
    nextOccurrenceDate: addDays(today, -1),
    isDue: true,
    active: true,
  },
  {
    id: 'rec_rent',
    name: 'Arriendo',
    type: 'expense',
    amount: 1_200_000,
    accountId: DEFAULT_ACCOUNT_ID,
    category: 'bills',
    interval: 'monthly',
    nextOccurrenceDate: addDays(today, 6),
    isDue: false,
    active: true,
  },
  {
    id: 'rec_gym',
    name: 'Gimnasio',
    type: 'expense',
    amount: 90_000,
    accountId: DEFAULT_ACCOUNT_ID,
    category: 'health',
    interval: 'monthly',
    nextOccurrenceDate: addDays(today, 2),
    isDue: false,
    active: true,
  },
]
