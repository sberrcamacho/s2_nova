import type { CategoryId, PaymentMethod, Transaction } from '@/types'
import { generateId } from '@/lib/id'
import { DEFAULT_ACCOUNT_ID } from '@/data/accounts'

// Deterministic PRNG (mulberry32) — the seed dataset should look organic but
// stay identical across reloads so the demo experience is stable.
function mulberry32(seed: number) {
  return function random() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20260814)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
const range = (min: number, max: number, step = 500) => {
  const raw = min + rand() * (max - min)
  return Math.round(raw / step) * step
}

interface Template {
  desc: string
  merchant: string
  category: CategoryId
  min: number
  max: number
  methods: PaymentMethod[]
}

const expenseTemplates: Template[] = [
  { desc: 'Mercado semanal', merchant: 'Éxito', category: 'food', min: 95_000, max: 210_000, methods: ['debit_card', 'cash'] },
  { desc: 'Mercado', merchant: 'Carulla', category: 'food', min: 80_000, max: 180_000, methods: ['debit_card'] },
  { desc: 'Domicilio', merchant: 'Rappi', category: 'food', min: 28_000, max: 65_000, methods: ['nequi', 'credit_card'] },
  { desc: 'Almuerzo', merchant: 'Crepes & Waffles', category: 'food', min: 22_000, max: 48_000, methods: ['debit_card', 'cash'] },
  { desc: 'Comida rápida', merchant: 'El Corral', category: 'food', min: 18_000, max: 38_000, methods: ['cash', 'nequi'] },
  { desc: 'Café', merchant: 'Tostao', category: 'food', min: 6_000, max: 14_000, methods: ['cash', 'nequi'] },
  { desc: 'Viaje en app', merchant: 'Uber', category: 'transportation', min: 9_000, max: 32_000, methods: ['credit_card', 'nequi'] },
  { desc: 'Recarga tarjeta SITP', merchant: 'TransMilenio', category: 'transportation', min: 15_000, max: 40_000, methods: ['cash'] },
  { desc: 'Gasolina', merchant: 'Terpel', category: 'transportation', min: 60_000, max: 120_000, methods: ['debit_card'] },
  { desc: 'Parqueadero', merchant: 'Parqueadero Centro', category: 'transportation', min: 6_000, max: 18_000, methods: ['cash'] },
  { desc: 'Compra en línea', merchant: 'Mercado Libre', category: 'shopping', min: 40_000, max: 220_000, methods: ['credit_card'] },
  { desc: 'Ropa', merchant: 'Zara', category: 'shopping', min: 90_000, max: 260_000, methods: ['credit_card'] },
  { desc: 'Artículos para el hogar', merchant: 'Homecenter', category: 'shopping', min: 35_000, max: 150_000, methods: ['debit_card'] },
  { desc: 'Tecnología', merchant: 'Falabella', category: 'shopping', min: 60_000, max: 320_000, methods: ['credit_card'] },
  { desc: 'Droguería', merchant: 'Farmatodo', category: 'health', min: 15_000, max: 90_000, methods: ['debit_card', 'cash'] },
  { desc: 'Copago EPS', merchant: 'EPS Sura', category: 'health', min: 15_000, max: 45_000, methods: ['bank_transfer'] },
  { desc: 'Plan de gimnasio', merchant: 'Smart Fit', category: 'health', min: 45_000, max: 45_000, methods: ['debit_card'] },
  { desc: 'Curso en línea', merchant: 'Platzi', category: 'education', min: 39_000, max: 89_000, methods: ['credit_card'] },
  { desc: 'Materiales de estudio', merchant: 'Librería Nacional', category: 'education', min: 20_000, max: 70_000, methods: ['cash', 'debit_card'] },
  { desc: 'Cine', merchant: 'Cine Colombia', category: 'entertainment', min: 16_000, max: 45_000, methods: ['credit_card', 'nequi'] },
  { desc: 'Salida con amigos', merchant: 'Andrés Carne de Res', category: 'entertainment', min: 60_000, max: 150_000, methods: ['credit_card'] },
  { desc: 'Concierto', merchant: 'Movistar Arena', category: 'entertainment', min: 90_000, max: 220_000, methods: ['credit_card'] },
  { desc: 'Energía eléctrica', merchant: 'EPM', category: 'bills', min: 90_000, max: 160_000, methods: ['bank_transfer'] },
  { desc: 'Acueducto y aseo', merchant: 'EPM', category: 'bills', min: 55_000, max: 95_000, methods: ['bank_transfer'] },
  { desc: 'Internet y celular', merchant: 'Claro', category: 'bills', min: 89_000, max: 129_000, methods: ['bank_transfer', 'nequi'] },
  { desc: 'Administración', merchant: 'Conjunto Res. Altos', category: 'bills', min: 180_000, max: 260_000, methods: ['bank_transfer'] },
  { desc: 'Regalo', merchant: 'Detalles y Flores', category: 'other', min: 40_000, max: 120_000, methods: ['nequi', 'cash'] },
  { desc: 'Donación', merchant: 'Banco de Alimentos', category: 'other', min: 20_000, max: 60_000, methods: ['nequi'] },
]

const subscriptionTemplates: Template[] = [
  { desc: 'Netflix', merchant: 'Netflix', category: 'subscriptions', min: 44_900, max: 44_900, methods: ['credit_card'] },
  { desc: 'Spotify Premium', merchant: 'Spotify', category: 'subscriptions', min: 19_900, max: 19_900, methods: ['credit_card'] },
  { desc: 'iCloud+', merchant: 'Apple', category: 'subscriptions', min: 12_900, max: 12_900, methods: ['credit_card'] },
  { desc: 'Disney+', merchant: 'Disney+', category: 'subscriptions', min: 34_900, max: 34_900, methods: ['credit_card'] },
]

const incomeTemplates: Template[] = [
  { desc: 'Salario mensual', merchant: 'Nómina — Grupo Éxito', category: 'salary', min: 4_200_000, max: 4_600_000, methods: ['bank_transfer'] },
  { desc: 'Proyecto freelance', merchant: 'Cliente — Estudio Andina', category: 'freelance', min: 350_000, max: 1_200_000, methods: ['bank_transfer', 'nequi'] },
]

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function makeTransaction(
  template: Template,
  type: 'income' | 'expense',
  date: string,
): Transaction {
  return {
    id: generateId('txn'),
    accountId: DEFAULT_ACCOUNT_ID,
    description: template.desc,
    merchant: template.merchant,
    amount: range(template.min, template.max, template.min === template.max ? 1 : 500),
    type,
    category: template.category,
    date,
    paymentMethod: pick(template.methods),
  }
}

function buildMonth(year: number, month: number, maxDay?: number): Transaction[] {
  const lastDay = maxDay ?? daysInMonth(year, month)
  const items: Transaction[] = []

  // Salary lands on the 1st, like a real payroll deposit.
  items.push(makeTransaction(incomeTemplates[0], 'income', toISO(year, month, 1)))

  // Occasional freelance income, most months.
  if (rand() > 0.25) {
    items.push(makeTransaction(incomeTemplates[1], 'income', toISO(year, month, range(6, Math.min(24, lastDay), 1))))
  }

  // Recurring subscriptions charge around the same day each month.
  for (const sub of subscriptionTemplates) {
    if (rand() > 0.12) {
      items.push(makeTransaction(sub, 'expense', toISO(year, month, Math.min(5, lastDay))))
    }
  }

  // Fixed bills, once each.
  for (const bill of expenseTemplates.filter((t) => t.category === 'bills')) {
    items.push(makeTransaction(bill, 'expense', toISO(year, month, range(3, Math.min(20, lastDay), 1))))
  }

  // A varied spread of everyday spending.
  const dailySpendPool = expenseTemplates.filter((t) => t.category !== 'bills')
  const count = Math.min(lastDay, Math.round(range(16, 24, 1)))
  for (let i = 0; i < count; i++) {
    const template = pick(dailySpendPool)
    items.push(makeTransaction(template, 'expense', toISO(year, month, range(1, lastDay, 1))))
  }

  return items
}

const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth() + 1 // 1-indexed
const currentDay = today.getDate()

const months: Array<[number, number, number | undefined]> = []
for (let back = 5; back >= 0; back--) {
  let y = currentYear
  let m = currentMonth - back
  while (m <= 0) {
    m += 12
    y -= 1
  }
  months.push([y, m, back === 0 ? currentDay : undefined])
}

export const transactions: Transaction[] = months
  .flatMap(([y, m, maxDay]) => buildMonth(y, m, maxDay))
  .sort((a, b) => (a.date < b.date ? 1 : -1))
