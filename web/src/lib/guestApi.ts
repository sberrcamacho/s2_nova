import { ApiError } from '@/lib/apiClient'
import { CURRENCY_CATALOG, currencyInfo, referenceRate } from '@/lib/currency'
import { todayISO } from '@/lib/date'
import { TAX_NODES, visColor } from '@/lib/taxonomy'

// Guest mode ("Continuar como invitado", ONBOARDING.md §1): an in-memory
// stand-in for the backend, answering every request apiClient makes with
// the same wire shapes. It holds the v2 mockup's example account — the same
// seed as Android's DemoData (wallets incl. a USD wallet, movements with
// receipts, budgets, goals with periodic contributions, loans,
// Programados). Everything is interactive; nothing reaches the server and
// nothing survives signing out or reloading. The backend's balance,
// progress, alert and summary rules (backend/src/lib, routes/alerts.ts,
// routes/summary.ts) are mirrored here so a guest sees what a real account
// would, the way Android's DemoLedger does.

type Method = string
type Row = Record<string, unknown>

interface GAccount {
  id: string
  name: string
  type: string
  currency: string
  initialBalance: number
  currentBalance: number
}

interface GAttachment {
  id: string
  kind: 'IMAGE' | 'PDF'
  mime: string
  name: string
  size: number
  createdAt: string
  data?: string // base64, for files added during the session
}

interface GTx {
  id: string
  accountId: string
  transferToAccountId: string | null
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  status: 'COMPLETED' | 'PLANNED'
  amount: number
  currency: string
  fxRate: number | null
  walletAmount: number | null
  categoryId: string
  subcategoryId: string | null
  productId: string | null
  budgetId: string | null
  customBudgetId: string | null
  goalId: string | null
  recurringSeriesId: string | null
  loanKind: 'LENT' | 'BORROWED' | null
  counterpartyName: string | null
  counterpartyKind: string | null
  dueDate: string | null
  loanSettledAt: string | null
  settledByTransactionId: string | null
  parentLoanId: string | null
  paymentMethod: string
  description: string
  merchant: string | null
  note: string | null
  date: string
  time: string
  seq: number
  attachment: GAttachment | null
}

interface GCategory {
  id: string
  slug: string
  name: string
  defaultName: string
  icon: string
  color: string
  kind: 'EXPENSE' | 'INCOME'
  parentId: string | null
  isCustom: boolean
  hidden: boolean
}

interface GBudget {
  id: string
  name: string | null
  kind: 'CATEGORY' | 'CUSTOM'
  categoryId: string | null
  icon: string | null
  walletIds: string[]
  period: 'MONTHLY' | 'WEEKLY' | 'CUSTOM'
  startDate: string | null
  endDate: string | null
  amount: number
  // The seed's spending that has no movement behind it (the mockup's
  // MONTH_SPEND ledger), so the example budgets show the mockup's progress.
  baseSpent: number
}

interface GPlan {
  amount: number
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  accountId: string
  startDate: string
  endMode: 'GOAL' | 'COUNT' | 'DATE'
  count: number | null
  endDate: string | null
  autoConfirm: boolean
  nextDate: string
  doneCount: number
  active: boolean
}

interface GGoal {
  id: string
  name: string
  icon: string
  targetAmount: number
  initialAmount: number
  targetDate: string | null
  // Earlier contributions of the example account, per wallet (principal).
  base: Record<string, number>
  plan: GPlan | null
}

interface GSeries {
  id: string
  name: string
  type: 'INCOME' | 'EXPENSE'
  amount: number
  currency: string
  accountId: string
  categoryId: string
  subcategoryId: string | null
  customBudgetId: string | null
  paymentMethod: string
  interval: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  nextOccurrenceDate: string
  occurrences: number | null
  occurrencesDone: number
  endDate: string | null
  autoConfirm: boolean
  active: boolean
}

interface GuestState {
  me: {
    name: string
    email: string
    phone: string | null
    city: string | null
    createdAt: string
    preferences: Row & { guidesSeen: string[]; guidesOff: boolean }
  }
  principal: string
  currencies: string[]
  categories: GCategory[]
  accounts: GAccount[]
  txs: GTx[]
  budgets: GBudget[]
  goals: GGoal[]
  series: GSeries[]
}

// ---- Dates (local calendar days, 'YYYY-MM-DD') ---------------------------

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parse(day: string): Date {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(day: string, n: number): string {
  const d = parse(day)
  d.setDate(d.getDate() + n)
  return iso(d)
}

function addInterval(day: string, interval: string, k = 1): string {
  const d = parse(day)
  if (interval === 'DAILY') d.setDate(d.getDate() + k)
  else if (interval === 'WEEKLY') d.setDate(d.getDate() + 7 * k)
  else if (interval === 'MONTHLY') d.setMonth(d.getMonth() + k)
  else d.setFullYear(d.getFullYear() + k)
  return iso(d)
}

const monthOf = (day: string) => day.slice(0, 7)

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthEnd(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${key}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}

// ---- Money ----------------------------------------------------------------

function round(amount: number, code: string): number {
  const f = 10 ** currencyInfo(code).decimals
  return Math.round(amount * f) / f
}

function convert(amount: number, from: string, to: string): number {
  return from === to ? amount : round(amount * referenceRate(from, to), to)
}

// ---- Seed -----------------------------------------------------------------

// The mockup's "today"; seed dates keep their distance from it relative to
// the real today, so the month views populate (as Android's DemoData does).
const MOCK_TODAY = '2026-08-21'
const BANCOLOMBIA = 'guest-bancolombia'
const NEQUI = 'guest-nequi'
const EFECTIVO = 'guest-efectivo'
const WISE = 'guest-wise'

let seq = 0
let nextId = 0
const newId = (prefix: string) => `guest-new-${prefix}-${++nextId}`

function seed(): GuestState {
  const shift = Math.round((parse(todayISO()).getTime() - parse(MOCK_TODAY).getTime()) / 86_400_000)
  const d = (day: string) => addDays(day, shift)
  const today = todayISO()

  const categories: GCategory[] = TAX_NODES.map((n) => ({
    id: n.id,
    slug: n.id,
    name: n.name,
    defaultName: n.name,
    icon: n.vis,
    color: n.color,
    kind: n.type === 'income' ? 'INCOME' : 'EXPENSE',
    parentId: n.parentId,
    isCustom: false,
    hidden: false,
  }))

  const accounts: GAccount[] = [
    { id: BANCOLOMBIA, name: 'Bancolombia — Ahorros', type: 'SAVINGS', currency: 'COP', initialBalance: 13_740_000, currentBalance: 13_740_000 },
    { id: NEQUI, name: 'Nequi', type: 'NEQUI', currency: 'COP', initialBalance: 1_982_300, currentBalance: 1_982_300 },
    { id: EFECTIVO, name: 'Efectivo', type: 'CASH', currency: 'COP', initialBalance: 425_000, currentBalance: 425_000 },
    { id: WISE, name: 'Wise — Dólares', type: 'SAVINGS', currency: 'USD', initialBalance: 320, currentBalance: 320 },
  ]

  const tx = (p: Partial<GTx> & Pick<GTx, 'id' | 'accountId' | 'amount' | 'categoryId' | 'date'>): GTx => {
    const wallet = accounts.find((a) => a.id === p.accountId)!
    const currency = p.currency ?? wallet.currency
    const foreign = currency !== wallet.currency
    return {
      transferToAccountId: null,
      type: 'EXPENSE',
      status: 'COMPLETED',
      currency,
      fxRate: foreign ? referenceRate(currency, wallet.currency) : null,
      walletAmount: foreign ? convert(p.amount, currency, wallet.currency) : null,
      subcategoryId: null,
      productId: null,
      budgetId: null,
      customBudgetId: null,
      goalId: null,
      recurringSeriesId: null,
      loanKind: null,
      counterpartyName: null,
      counterpartyKind: null,
      loanSettledAt: null,
      settledByTransactionId: null,
      parentLoanId: null,
      paymentMethod: paymentMethodFor(wallet.type),
      description: '',
      merchant: null,
      note: null,
      time: '12:00',
      seq: ++seq,
      attachment: null,
      ...p,
      date: d(p.date),
      dueDate: p.dueDate ? d(p.dueDate) : null,
    }
  }
  const attach = (id: string, kind: 'IMAGE' | 'PDF', name: string, size: number, day: string): GAttachment => ({
    id,
    kind,
    mime: kind === 'PDF' ? 'application/pdf' : 'image/jpeg',
    name,
    size,
    createdAt: `${d(day)}T12:00:00.000Z`,
  })

  const txs: GTx[] = [
    tx({ id: 'guest-tx-101', accountId: BANCOLOMBIA, amount: 1_450_000, categoryId: 'exp.housing', subcategoryId: 'exp.housing.rent', date: '2026-09-01', time: '08:00', status: 'PLANNED', description: 'Arriendo', recurringSeriesId: 'guest-series-rent' }),
    tx({ id: 'guest-tx-102', accountId: NEQUI, amount: 180_000, categoryId: 'exp.education', subcategoryId: 'exp.education.courses', date: '2026-08-28', time: '09:00', status: 'PLANNED', description: 'Cuota del curso de inglés' }),
    tx({ id: 'guest-tx-1', accountId: BANCOLOMBIA, amount: 168_500, categoryId: 'exp.food', subcategoryId: 'exp.food.groceries', date: '2026-08-21', time: '09:12', description: 'Mercado semanal', merchant: 'Éxito', attachment: attach('guest-att-1', 'IMAGE', 'recibo-exito.jpg', 1_200_000, '2026-08-21') }),
    tx({ id: 'guest-tx-2', accountId: EFECTIVO, amount: 21_000, categoryId: 'exp.food', subcategoryId: 'exp.food.cafes', date: '2026-08-21', time: '07:48', description: 'Café', merchant: 'Tostao' }),
    tx({ id: 'guest-tx-3', accountId: BANCOLOMBIA, amount: 5.99, currency: 'USD', categoryId: 'exp.entertainment', subcategoryId: 'exp.entertainment.streaming', date: '2026-08-20', time: '22:15', description: 'Spotify', merchant: 'Spotify' }),
    tx({ id: 'guest-tx-4', accountId: BANCOLOMBIA, amount: 109_000, categoryId: 'exp.utilities', subcategoryId: 'exp.utilities.internet', date: '2026-08-20', time: '10:30', description: 'Internet y celular', merchant: 'Claro', attachment: attach('guest-att-4', 'PDF', 'factura-claro-ago.pdf', 240_000, '2026-08-20') }),
    tx({ id: 'guest-tx-5', accountId: WISE, type: 'INCOME', amount: 200, categoryId: 'inc.work', subcategoryId: 'inc.work.freelance', date: '2026-08-18', time: '16:05', description: 'Diseño de logo', counterpartyName: 'Andrés Gómez', counterpartyKind: 'CLIENT' }),
    tx({ id: 'guest-tx-6', accountId: BANCOLOMBIA, type: 'INCOME', amount: 4_400_000, categoryId: 'inc.work', subcategoryId: 'inc.work.salary', date: '2026-08-01', time: '06:00', description: 'Salario mensual', counterpartyName: 'Grupo Éxito', counterpartyKind: 'EMPLOYER' }),
    // The automatic weekly aporte to "Fondo de emergencia" ("Aporte automático registrado").
    tx({ id: 'guest-tx-7', accountId: NEQUI, amount: 100_000, categoryId: 'exp.other', date: '2026-08-17', time: '08:00', description: 'Aporte a Fondo de emergencia', goalId: 'guest-goal-1' }),
    // Préstamos (Planes › Préstamos).
    tx({ id: 'guest-loan-1', accountId: BANCOLOMBIA, amount: 420_000, categoryId: 'exp.other', date: '2026-08-05', description: 'Préstamo a Camilo', loanKind: 'LENT', counterpartyName: 'Camilo Restrepo', dueDate: '2026-09-15' }),
    tx({ id: 'guest-loan-2', accountId: NEQUI, amount: 200_000, categoryId: 'exp.other', date: '2026-07-10', description: 'Préstamo a Ana María', loanKind: 'LENT', counterpartyName: 'Ana María Ruiz', loanSettledAt: `${d('2026-08-02')}T12:00:00.000Z`, settledByTransactionId: 'guest-loan-2-pay' }),
    tx({ id: 'guest-loan-2-pay', accountId: NEQUI, type: 'INCOME', amount: 200_000, categoryId: 'exp.other', date: '2026-08-02', description: 'Pago recibido de Ana María Ruiz', counterpartyName: 'Ana María Ruiz', parentLoanId: 'guest-loan-2' }),
  ]

  // The eleven months before this one, from the mockup's BAR_DATA (millions
  // of income, expenses), so Inicio's chart and Reportes have a history.
  const HISTORY = [[4.05, 2.2], [4.12, 2.31], [4.18, 2.75], [5.6, 3.42], [4.1, 2.05], [4.16, 1.88], [4.21, 1.91], [4.38, 2.14], [4.25, 2.42], [4.42, 1.78], [4.41, 2.03]]
  HISTORY.forEach(([income, expenses], i) => {
    const month = shiftMonth(monthOf(today), i - HISTORY.length)
    const million = (m: number) => Math.round((m * 1_000_000) / 100) * 100
    const food = million(expenses * 0.4)
    const transport = million(expenses * 0.12)
    const past = (day: string, p: Omit<Parameters<typeof tx>[0], 'date'>) => ({ ...tx({ ...p, date: MOCK_TODAY }), date: `${month}-${day}` })
    txs.push(
      past('01', { id: `guest-hist-${i}-salary`, accountId: BANCOLOMBIA, type: 'INCOME', amount: million(income), categoryId: 'inc.work', subcategoryId: 'inc.work.salary', time: '06:00', description: 'Salario mensual', counterpartyName: 'Grupo Éxito', counterpartyKind: 'EMPLOYER' }),
      past('06', { id: `guest-hist-${i}-food`, accountId: BANCOLOMBIA, amount: food, categoryId: 'exp.food', subcategoryId: 'exp.food.groceries', time: '10:20', description: 'Mercado del mes', merchant: 'Éxito' }),
      past('12', { id: `guest-hist-${i}-internet`, accountId: BANCOLOMBIA, amount: 109_000, categoryId: 'exp.utilities', subcategoryId: 'exp.utilities.internet', time: '10:30', description: 'Internet y celular', merchant: 'Claro' }),
      past('17', { id: `guest-hist-${i}-transport`, accountId: NEQUI, amount: transport, categoryId: 'exp.transportation', time: '18:40', description: 'Transporte' }),
      past('24', { id: `guest-hist-${i}-shopping`, accountId: BANCOLOMBIA, amount: million(expenses) - food - transport - 109_000, categoryId: 'exp.shopping', time: '15:10', description: 'Compras' }),
    )
  })

  const monthStart = `${monthOf(today)}-01`
  const budget = (p: Partial<GBudget> & Pick<GBudget, 'id' | 'amount'>, spent: number): GBudget & { target: number } => ({
    name: null,
    kind: 'CATEGORY',
    categoryId: null,
    icon: null,
    walletIds: [],
    period: 'MONTHLY',
    startDate: monthStart,
    endDate: null,
    baseSpent: 0,
    ...p,
    target: spent,
  })
  const budgets = [
    budget({ id: 'guest-budget-1', categoryId: 'exp.housing', amount: 250_000 }, 232_000),
    budget({ id: 'guest-budget-2', categoryId: 'exp.entertainment.streaming', amount: 90_000 }, 84_800),
    budget({ id: 'guest-budget-3', categoryId: 'exp.food', amount: 900_000 }, 612_400),
    budget({ id: 'guest-budget-4', categoryId: 'exp.utilities', amount: 200_000 }, 180_000),
    budget({ id: 'guest-budget-5', categoryId: 'exp.transportation', amount: 150_000 }, 95_500),
    budget({ id: 'guest-budget-6', categoryId: 'exp.shopping', amount: 780_000 }, 318_500),
    budget({ id: 'guest-budget-7', kind: 'CUSTOM', name: 'Viaje de fin de año', icon: 'travel', period: 'CUSTOM', startDate: d('2026-12-01'), endDate: d('2027-01-15'), amount: 2_500_000 }, 640_000),
    budget({ id: 'guest-budget-8', kind: 'CUSTOM', name: 'Cumpleaños de Sofía', icon: 'events', period: 'CUSTOM', startDate: d('2026-08-10'), endDate: d('2026-08-31'), amount: 300_000 }, 120_000),
  ]

  const goals: GGoal[] = [
    {
      id: 'guest-goal-1', name: 'Fondo de emergencia', icon: 'savings', targetAmount: 12_000_000, initialAmount: 0, targetDate: null,
      base: { [BANCOLOMBIA]: 6_000_000, [NEQUI]: 1_700_000, [EFECTIVO]: 600_000 },
      plan: { amount: 100_000, frequency: 'WEEKLY', accountId: NEQUI, startDate: d('2026-06-01'), endMode: 'GOAL', count: null, endDate: null, autoConfirm: true, nextDate: d('2026-08-24'), doneCount: 12, active: true },
    },
    {
      id: 'guest-goal-2', name: 'Viaje a Perú', icon: 'travel', targetAmount: 4_500_000, initialAmount: 500_000, targetDate: d('2027-06-30'),
      base: { [BANCOLOMBIA]: 700_000, [NEQUI]: 780_000 },
      plan: { amount: 250_000, frequency: 'MONTHLY', accountId: BANCOLOMBIA, startDate: d('2026-05-21'), endMode: 'GOAL', count: null, endDate: null, autoConfirm: false, nextDate: d('2026-08-21'), doneCount: 3, active: true },
    },
    { id: 'guest-goal-3', name: 'Portátil nuevo', icon: 'technology', targetAmount: 5_200_000, initialAmount: 1_000_000, targetDate: d('2026-10-31'), base: { [BANCOLOMBIA]: 3_680_000 }, plan: null },
    { id: 'guest-goal-4', name: 'Especialización', icon: 'education', targetAmount: 3_000_000, initialAmount: 0, targetDate: null, base: { [NEQUI]: 300_000, [EFECTIVO]: 150_000 }, plan: null },
  ]

  const series = (p: Partial<GSeries> & Pick<GSeries, 'id' | 'name' | 'amount' | 'categoryId' | 'nextOccurrenceDate'>): GSeries => ({
    type: 'EXPENSE',
    currency: 'COP',
    accountId: BANCOLOMBIA,
    subcategoryId: null,
    customBudgetId: null,
    paymentMethod: 'BANK_TRANSFER',
    interval: 'MONTHLY',
    occurrences: null,
    occurrencesDone: 1,
    endDate: null,
    autoConfirm: false,
    active: true,
    ...p,
    nextOccurrenceDate: d(p.nextOccurrenceDate),
  })

  const state: GuestState = {
    me: {
      name: 'Invitado',
      email: 'invitado@s2nova.local',
      phone: null,
      city: null,
      createdAt: `${today}T12:00:00.000Z`,
      // Guides are on for guests.
      preferences: {
        language: 'es',
        currency: 'COP',
        theme: 'SYSTEM',
        notifications: true,
        biometricLogin: false,
        blurBalance: false,
        onboardingCompleted: true,
        tutorialCompleted: true,
        guidesSeen: [],
        guidesOff: false,
      },
    },
    principal: 'COP',
    currencies: ['COP', 'USD', 'EUR'],
    categories,
    accounts,
    txs,
    budgets: [],
    goals,
    series: [
      series({ id: 'guest-series-1', name: 'Netflix', amount: 45_000, categoryId: 'exp.entertainment', subcategoryId: 'exp.entertainment.streaming', nextOccurrenceDate: '2026-08-24' }),
      series({ id: 'guest-series-2', name: 'Internet y celular', amount: 109_000, categoryId: 'exp.utilities', subcategoryId: 'exp.utilities.internet', nextOccurrenceDate: '2026-08-26' }),
      series({ id: 'guest-series-3', name: 'Administración', amount: 232_000, categoryId: 'exp.housing', subcategoryId: 'exp.housing.maintenance', nextOccurrenceDate: '2026-08-21' }),
      series({ id: 'guest-series-4', name: 'Salario mensual', type: 'INCOME', amount: 4_400_000, categoryId: 'inc.work', subcategoryId: 'inc.work.salary', nextOccurrenceDate: '2026-09-01' }),
      series({ id: 'guest-series-5', name: 'Gimnasio', amount: 89_000, categoryId: 'exp.health', nextOccurrenceDate: '2026-09-05', active: false }),
      series({ id: 'guest-series-rent', name: 'Arriendo', amount: 1_450_000, categoryId: 'exp.housing', subcategoryId: 'exp.housing.rent', nextOccurrenceDate: '2026-10-01' }),
    ],
  }
  // The part of each budget's example spending no movement explains.
  state.budgets = budgets.map(({ target, ...b }) => ({ ...b, baseSpent: Math.max(0, target - movementSpent(state, b, monthOf(today))) }))
  return state
}

// ---- Rules (mirroring backend/src/lib) ------------------------------------

function paymentMethodFor(type: string): string {
  return type === 'CASH' ? 'CASH' : type === 'NEQUI' ? 'NEQUI' : type === 'DAVIPLATA' ? 'DAVIPLATA' : 'BANK_TRANSFER'
}

function account(s: GuestState, id: string): GAccount {
  const found = s.accounts.find((a) => a.id === id)
  if (!found) throw new ApiError('Unknown or inaccessible account.', 422)
  return found
}

function walletCurrency(s: GuestState, id: string): string {
  return s.accounts.find((a) => a.id === id)?.currency ?? s.principal
}

// A movement's wallet amount in the principal currency.
function principalAmount(s: GuestState, t: GTx): number {
  return convert(t.walletAmount ?? t.amount, walletCurrency(s, t.accountId), s.principal)
}

// direction 1 applies a COMPLETED movement to the wallets, -1 reverses it.
function applyEffect(s: GuestState, t: Pick<GTx, 'status' | 'type' | 'accountId' | 'transferToAccountId' | 'amount' | 'walletAmount'>, direction: 1 | -1) {
  if (t.status !== 'COMPLETED') return
  const move = (id: string, delta: number) => {
    const a = s.accounts.find((w) => w.id === id)
    if (a) a.currentBalance = round(a.currentBalance + delta * direction, a.currency)
  }
  if (t.type === 'TRANSFER') {
    move(t.accountId, -t.amount)
    if (t.transferToAccountId) move(t.transferToAccountId, t.walletAmount ?? t.amount)
    return
  }
  const wallet = t.walletAmount ?? t.amount
  move(t.accountId, t.type === 'EXPENSE' ? -wallet : wallet)
}

function priced(amount: number, currency: string, wallet: string) {
  if (currency === wallet) return { fxRate: null, walletAmount: null }
  return { fxRate: referenceRate(currency, wallet), walletAmount: convert(amount, currency, wallet) }
}

function repaid(s: GuestState, loanId: string): number {
  return s.txs.filter((t) => t.parentLoanId === loanId).reduce((sum, t) => sum + t.amount, 0)
}

function outstanding(s: GuestState, loan: GTx): number {
  return Math.max(0, round(loan.amount - repaid(s, loan.id), loan.currency))
}

function serializeTx(s: GuestState, t: GTx) {
  const { seq: _seq, time, attachment, ...rest } = t
  return {
    ...rest,
    date: `${t.date}T00:00:00.000Z`,
    occurredAt: `${t.date}T${time}:00.000Z`,
    outstanding: t.loanKind ? outstanding(s, t) : null,
    attachment: attachment && { id: attachment.id, kind: attachment.kind, mime: attachment.mime, name: attachment.name, size: attachment.size, createdAt: attachment.createdAt },
  }
}

function newTx(s: GuestState, p: Partial<GTx> & Pick<GTx, 'accountId' | 'type' | 'amount' | 'currency' | 'categoryId' | 'date'>): GTx {
  const wallet = account(s, p.accountId)
  return {
    id: newId('tx'),
    transferToAccountId: null,
    status: 'COMPLETED',
    fxRate: null,
    walletAmount: null,
    subcategoryId: null,
    productId: null,
    budgetId: null,
    customBudgetId: null,
    goalId: null,
    recurringSeriesId: null,
    loanKind: null,
    counterpartyName: null,
    counterpartyKind: null,
    dueDate: null,
    loanSettledAt: null,
    settledByTransactionId: null,
    parentLoanId: null,
    paymentMethod: paymentMethodFor(wallet.type),
    description: '',
    merchant: null,
    note: null,
    time: new Date().toTimeString().slice(0, 5),
    seq: ++seq,
    attachment: null,
    ...p,
  }
}

// Budget window and the movements it counts (PLANS.md §4).
function windowOf(b: GBudget, month: string): [string, string] {
  return b.period === 'CUSTOM' ? [b.startDate!, b.endDate ?? monthEnd(month)] : [`${month}-01`, monthEnd(month)]
}

function movementSpent(s: GuestState, b: GBudget, month: string): number {
  const [from, to] = windowOf(b, month)
  return s.txs
    .filter((t) => t.type === 'EXPENSE' && t.status === 'COMPLETED')
    .filter((t) =>
      t.budgetId === b.id ||
      (!t.budgetId &&
        t.date >= from &&
        t.date <= to &&
        (b.kind === 'CUSTOM'
          ? t.customBudgetId === b.id
          : (t.categoryId === b.categoryId || t.subcategoryId === b.categoryId) && (!b.walletIds.length || b.walletIds.includes(t.accountId)))),
    )
    .reduce((sum, t) => sum + principalAmount(s, t), 0)
}

function budgetStatus(pct: number) {
  return pct > 100 ? 'OVER_BUDGET' : pct >= 90 ? 'AT_RISK' : pct >= 65 ? 'NEAR_LIMIT' : 'ON_TRACK'
}

function serializeBudget(s: GuestState, b: GBudget, month = monthOf(todayISO())) {
  const monthly = b.period !== 'CUSTOM'
  const spent = round(movementSpent(s, b, month) + (monthly && month !== monthOf(todayISO()) ? 0 : b.baseSpent), s.principal)
  const percentage = b.amount > 0 ? Math.min(999, Math.round((spent / b.amount) * 100)) : 0
  const { baseSpent: _base, ...rest } = b
  return {
    ...rest,
    amount: b.amount,
    spent,
    remaining: round(b.amount - spent, s.principal),
    percentage,
    status: budgetStatus(percentage),
    assignedCount: b.kind === 'CUSTOM' ? s.txs.filter((t) => t.customBudgetId === b.id).length : null,
    month: b.period === 'CUSTOM' ? monthOf(b.startDate!) : month,
  }
}

function goalContributions(s: GuestState, g: GGoal): Record<string, number> {
  const byWallet: Record<string, number> = { ...g.base }
  for (const t of s.txs) {
    if (t.goalId !== g.id || t.status !== 'COMPLETED') continue
    byWallet[t.accountId] = (byWallet[t.accountId] ?? 0) + principalAmount(s, t)
  }
  return byWallet
}

function goalCurrent(s: GuestState, g: GGoal): number {
  return g.initialAmount + Object.values(goalContributions(s, g)).reduce((a, b) => a + b, 0)
}

function serializeGoal(s: GuestState, g: GGoal, today = todayISO()) {
  const current = round(goalCurrent(s, g), s.principal)
  const percentage = g.targetAmount > 0 ? Math.min(999, Math.round((current / g.targetAmount) * 100)) : 0
  return {
    id: g.id,
    name: g.name,
    icon: g.icon,
    currency: s.principal,
    targetAmount: g.targetAmount,
    initialAmount: g.initialAmount,
    currentAmount: current,
    remaining: round(g.targetAmount - current, s.principal),
    percentage,
    contributions: Object.entries(goalContributions(s, g))
      .filter(([, amount]) => amount > 0)
      .map(([accountId, amount]) => ({ accountId, amount })),
    plan: g.plan && { ...g.plan, due: g.plan.active && !g.plan.autoConfirm && g.plan.nextDate <= today },
    targetDate: g.targetDate,
  }
}

// One "Aporte": a real EXPENSE out of its wallet, linked to the goal.
function recordContribution(s: GuestState, g: GGoal, accountId: string, amount: number, date: string) {
  const wallet = account(s, accountId)
  const foreign = wallet.currency !== s.principal
  const t = newTx(s, {
    accountId,
    type: 'EXPENSE',
    amount,
    currency: s.principal,
    fxRate: foreign ? referenceRate(s.principal, wallet.currency) : null,
    walletAmount: foreign ? convert(amount, s.principal, wallet.currency) : null,
    categoryId: 'exp.other',
    goalId: g.id,
    description: `Aporte a ${g.name}`,
    date,
  })
  s.txs.push(t)
  applyEffect(s, t, 1)
}

function advancePlan(s: GuestState, g: GGoal, counted: boolean) {
  const plan = g.plan!
  plan.nextDate = addInterval(plan.nextDate, plan.frequency)
  if (counted) plan.doneCount += 1
  const ended =
    plan.endMode === 'GOAL'
      ? goalCurrent(s, g) >= g.targetAmount
      : plan.endMode === 'COUNT'
        ? plan.count !== null && plan.doneCount >= plan.count
        : plan.endDate !== null && plan.nextDate > plan.endDate
  if (ended) plan.active = false
}

// "Automático" plans and Programados record their due dates when read.
function processDue(s: GuestState, today: string) {
  for (const g of s.goals) {
    for (let i = 0; i < 400 && g.plan?.active && g.plan.autoConfirm && g.plan.nextDate <= today; i++) {
      if (!s.accounts.some((a) => a.id === g.plan!.accountId)) break
      recordContribution(s, g, g.plan.accountId, g.plan.amount, g.plan.nextDate)
      advancePlan(s, g, true)
    }
  }
  for (const series of s.series) {
    for (let i = 0; i < 400 && series.active && series.autoConfirm && series.nextOccurrenceDate <= today; i++) {
      materialize(s, series, series.nextOccurrenceDate)
      advanceSeries(series)
    }
  }
}

function materialize(s: GuestState, series: GSeries, date: string) {
  const wallet = account(s, series.accountId)
  const t = newTx(s, {
    accountId: series.accountId,
    type: series.type,
    amount: series.amount,
    currency: series.currency,
    ...priced(series.amount, series.currency, wallet.currency),
    categoryId: series.categoryId,
    subcategoryId: series.subcategoryId,
    customBudgetId: series.customBudgetId,
    paymentMethod: series.paymentMethod,
    description: series.name,
    recurringSeriesId: series.id,
    date,
  })
  s.txs.push(t)
  applyEffect(s, t, 1)
}

function advanceSeries(series: GSeries) {
  series.nextOccurrenceDate = addInterval(series.nextOccurrenceDate, series.interval)
  series.occurrencesDone += 1
  const ended =
    (series.occurrences !== null && series.occurrencesDone >= series.occurrences) ||
    (series.endDate !== null && series.nextOccurrenceDate > series.endDate)
  if (ended) series.active = false
}

function serializeSeries(series: GSeries, today = todayISO()) {
  return { ...series, isDue: series.active && series.nextOccurrenceDate <= today }
}

function categoryRows(s: GuestState) {
  const usage = new Map<string, number>()
  for (const t of s.txs) {
    usage.set(t.categoryId, (usage.get(t.categoryId) ?? 0) + 1)
    if (t.subcategoryId) usage.set(t.subcategoryId, (usage.get(t.subcategoryId) ?? 0) + 1)
  }
  return s.categories.map((c) => ({ ...c, usage: usage.get(c.id) ?? 0 }))
}

// ---- Summaries (backend/src/routes/summary.ts) ----------------------------

function completedIncomeExpense(s: GuestState) {
  return s.txs.filter((t) => t.status === 'COMPLETED' && t.type !== 'TRANSFER')
}

function monthTotals(s: GuestState, keys: string[]) {
  const totals = new Map(keys.map((k) => [k, { income: 0, expenses: 0 }]))
  for (const t of completedIncomeExpense(s)) {
    const bucket = totals.get(monthOf(t.date))
    if (!bucket) continue
    if (t.type === 'INCOME') bucket.income += principalAmount(s, t)
    else bucket.expenses += principalAmount(s, t)
  }
  return keys.map((month) => {
    const { income, expenses } = totals.get(month)!
    return { month, income, expenses, net: income - expenses }
  })
}

function report(s: GuestState, range: number, today: string) {
  const current = monthOf(today)
  const previous = shiftMonth(current, -1)
  const rangeKeys = Array.from({ length: range }, (_, i) => shiftMonth(current, i - range + 1))
  const previousKeys = rangeKeys.map((k) => shiftMonth(k, -range))
  const rows = completedIncomeExpense(s)
  const byMonth = new Map<string, { income: number; expenses: number }>()
  const bucketOf = (k: string) => byMonth.get(k) ?? byMonth.set(k, { income: 0, expenses: 0 }).get(k)!
  const categoryMonth = new Map<string, number>()
  const leafMonth = new Map<string, number>()
  const weekdays = Array.from({ length: 7 }, () => 0)
  const fixedIds = new Set(['exp.housing', 'exp.utilities', 'exp.debt', ...s.series.filter((x) => x.active && x.type === 'EXPENSE').map((x) => x.categoryId)])
  let rangeFixed = 0
  const sources = new Map<string, { categoryId: string; merchant: string | null; amount: number; monthly: Map<string, number> }>()
  let after = 0

  for (const t of rows) {
    const amount = principalAmount(s, t)
    const month = monthOf(t.date)
    if (month > current) {
      after += t.type === 'INCOME' ? amount : -amount
      continue
    }
    const bucket = bucketOf(month)
    if (t.type === 'INCOME') bucket.income += amount
    else {
      bucket.expenses += amount
      const key = `${t.categoryId}|${month}`
      categoryMonth.set(key, (categoryMonth.get(key) ?? 0) + amount)
      if (month === current) {
        const leaf = t.subcategoryId ?? t.categoryId
        leafMonth.set(leaf, (leafMonth.get(leaf) ?? 0) + amount)
      }
    }
    if (!rangeKeys.includes(month)) continue
    if (t.type === 'EXPENSE') {
      weekdays[parse(t.date).getDay()] += amount
      if (fixedIds.has(t.categoryId)) rangeFixed += amount
    } else {
      const leaf = t.subcategoryId ?? t.categoryId
      const merchant = t.counterpartyName?.trim() || t.merchant?.trim() || null
      const key = `${leaf}|${merchant ?? ''}`
      const source = sources.get(key) ?? sources.set(key, { categoryId: leaf, merchant, amount: 0, monthly: new Map() }).get(key)!
      source.amount += amount
      source.monthly.set(month, (source.monthly.get(month) ?? 0) + amount)
    }
  }

  const sumOf = (keys: string[]) => {
    const income = keys.reduce((sum, k) => sum + (byMonth.get(k)?.income ?? 0), 0)
    const expenses = keys.reduce((sum, k) => sum + (byMonth.get(k)?.expenses ?? 0), 0)
    const savings = income - expenses
    return { income, expenses, savings, savingsRate: income > 0 ? Math.round((savings / income) * 100) : 0 }
  }
  const totals = sumOf(rangeKeys)
  const walletTotal = s.accounts.reduce((sum, a) => sum + convert(a.currentBalance, a.currency, s.principal), 0)
  const peak = weekdays.reduce((best, amount, day) => (amount > weekdays[best] ? day : best), 0)
  const average = totals.expenses / range

  const history: { month: string; balance: number }[] = []
  for (let i = 0; i < 6; i++) {
    const key = shiftMonth(current, -i)
    history.unshift({ month: key, balance: walletTotal - after })
    const bucket = byMonth.get(key)
    after += (bucket?.income ?? 0) - (bucket?.expenses ?? 0)
  }

  const loans = s.txs.filter((t) => t.status === 'COMPLETED' && t.loanKind)
  const loanSide = (kind: 'LENT' | 'BORROWED') => {
    const own = loans.filter((l) => l.loanKind === kind)
    const open = own.filter((l) => outstanding(s, l) > 0)
    return {
      outstanding: open.reduce((sum, l) => sum + outstanding(s, l), 0),
      people: new Set(open.map((l) => l.counterpartyName?.trim().toLowerCase() ?? l.id)).size,
      settled: own.length - open.length,
    }
  }

  return {
    range,
    month: current,
    months: rangeKeys.map((month) => {
      const { income, expenses } = byMonth.get(month) ?? { income: 0, expenses: 0 }
      return { month, income, expenses, net: income - expenses }
    }),
    totals,
    previousTotals: sumOf(previousKeys),
    categories: [...categoryMonth.entries()]
      .filter(([key]) => key.endsWith(`|${current}`))
      .map(([key, amount]) => {
        const categoryId = key.split('|')[0]
        const previousAmount = categoryMonth.get(`${categoryId}|${previous}`) ?? 0
        const change = previousAmount > 0 ? Math.round(((amount - previousAmount) / previousAmount) * 100) : null
        return { categoryId, amount, previousAmount, change, rising: change !== null && change >= 50 }
      })
      .sort((a, b) => b.amount - a.amount),
    subcategories: [...leafMonth.entries()].map(([categoryId, amount]) => ({ categoryId, amount })).sort((a, b) => b.amount - a.amount),
    dailyAverage: Math.round((byMonth.get(current)?.expenses ?? 0) / parse(today).getDate()),
    peakWeekday: weekdays[peak] > 0 ? peak : null,
    fixedShare: totals.expenses > 0 ? Math.round((rangeFixed / totals.expenses) * 100) : null,
    runwayMonths: average > 0 ? Math.round((walletTotal / average) * 10) / 10 : null,
    incomeSources: [...sources.values()]
      .sort((a, b) => b.amount - a.amount)
      .map((src) => {
        const monthly = rangeKeys.map((k) => src.monthly.get(k) ?? 0)
        return {
          categoryId: src.categoryId,
          merchant: src.merchant,
          amount: src.amount,
          percentage: totals.income > 0 ? Math.round((src.amount / totals.income) * 100) : 0,
          monthlyMin: Math.min(...monthly),
          monthlyMax: Math.max(...monthly),
        }
      }),
    netWorth: { wallets: walletTotal, lent: loanSide('LENT'), borrowed: loanSide('BORROWED'), history },
  }
}

// ---- Alerts (backend/src/routes/alerts.ts) ---------------------------------

function alerts(s: GuestState, today: string) {
  processDue(s, today)
  const month = monthOf(today)
  const weekAgo = addDays(today, -7)
  const weekAhead = addDays(today, 7)
  const walletName = (id: string) => s.accounts.find((a) => a.id === id)?.name ?? ''

  const seriesAlerts = s.series
    .filter((x) => x.active && !x.autoConfirm && x.nextOccurrenceDate <= today)
    .sort((a, b) => a.nextOccurrenceDate.localeCompare(b.nextOccurrenceDate))
    .map((x) => ({
      id: `series:${x.id}:${x.nextOccurrenceDate}`,
      kind: 'SERIES_DUE',
      seriesId: x.id,
      name: x.name,
      type: x.type,
      amount: x.amount,
      currency: x.currency,
      categoryId: x.categoryId,
      dueDate: x.nextOccurrenceDate,
      overdue: x.nextOccurrenceDate < today,
    }))

  const loanAlerts = s.txs
    .filter((t) => t.status === 'COMPLETED' && t.loanKind && !t.loanSettledAt && t.dueDate && outstanding(s, t) > 0)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    .map((t) => ({
      id: `loan:${t.id}`,
      kind: 'LOAN_OPEN',
      transactionId: t.id,
      loanKind: t.loanKind,
      counterpartyName: t.counterpartyName,
      outstanding: outstanding(s, t),
      dueDate: t.dueDate,
      overdue: t.dueDate! < today,
    }))

  const active = s.budgets.filter((b) => {
    const [from, to] = windowOf(b, month)
    return from <= monthEnd(month) && to >= `${month}-01`
  })
  const budgetAlerts = active
    .map((b) => serializeBudget(s, b, month))
    .filter((b) => b.percentage >= 90)
    .sort((a, b) => b.percentage - a.percentage)
    .map((b) => ({
      id: `budget:${b.id}:${b.month}`,
      kind: 'BUDGET_AT_RISK',
      budgetId: b.id,
      name: b.name,
      categoryId: b.categoryId,
      spent: b.spent,
      amount: b.amount,
      percentage: b.percentage,
    }))

  const goals = s.goals.map((g) => serializeGoal(s, g, today))
  const goalAlerts = goals
    .filter((g) => g.percentage >= 90 && g.percentage < 100)
    .sort((a, b) => b.percentage - a.percentage)
    .map((g) => ({ id: `goal:${g.id}`, kind: 'GOAL_NEAR', goalId: g.id, name: g.name, icon: g.icon, percentage: g.percentage, remaining: g.remaining }))

  const planDue = goals
    .filter((g) => g.plan?.due)
    .map((g) => ({
      id: `goalplan:${g.id}:${g.plan!.nextDate}`,
      kind: 'GOAL_PLAN_DUE',
      goalId: g.id,
      name: g.name,
      icon: g.icon,
      amount: g.plan!.amount,
      currency: s.principal,
      accountId: g.plan!.accountId,
      dueDate: g.plan!.nextDate,
      overdue: g.plan!.nextDate < today,
    }))

  const autoAlerts = s.txs
    .filter((t) => t.status === 'COMPLETED' && t.goalId && t.date >= weekAgo && t.date <= today)
    .map((t) => ({ t, g: s.goals.find((g) => g.id === t.goalId) }))
    .filter(({ g }) => g?.plan?.autoConfirm)
    .sort((a, b) => b.t.date.localeCompare(a.t.date))
    .map(({ t, g }) => ({
      id: `goalauto:${t.id}`,
      kind: 'GOAL_PLAN_AUTO',
      goalId: g!.id,
      name: g!.name,
      icon: g!.icon,
      amount: t.amount,
      currency: t.currency,
      accountId: t.accountId,
      walletName: walletName(t.accountId),
      date: t.date,
    }))

  const plannedAlerts = s.txs
    .filter((t) => t.status === 'PLANNED' && !t.loanKind && t.date >= today && t.date <= weekAhead)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => ({
      id: `planned:${t.id}`,
      kind: 'TX_PLANNED',
      transactionId: t.id,
      name: t.description || t.note || '',
      categoryId: t.subcategoryId ?? t.categoryId,
      amount: t.amount,
      currency: t.currency,
      walletName: walletName(t.accountId),
      dueDate: t.date,
    }))

  return [...seriesAlerts, ...loanAlerts, ...budgetAlerts, ...goalAlerts, ...planDue, ...autoAlerts, ...plannedAlerts]
}

// ---- Router ---------------------------------------------------------------

const NOT_FOR_GUESTS = 'No disponible en modo invitado. Crea una cuenta para usarlo.'

function listCurrencies(s: GuestState) {
  return [...s.currencies]
    .sort((a, b) => Number(b === s.principal) - Number(a === s.principal))
    .map((code) => {
      const c = currencyInfo(code)
      return {
        code,
        name: c.name,
        symbol: c.symbol,
        decimals: c.decimals,
        isPrincipal: code === s.principal,
        rate: referenceRate(code, s.principal),
        wallets: s.accounts.filter((a) => a.currency === code).length,
      }
    })
}

function me(s: GuestState) {
  return { id: 'guest', ...s.me, hasPassword: false, passwordChangedAt: null, principalCurrency: s.principal }
}

function serializeAccount(s: GuestState, a: GAccount) {
  return {
    ...a,
    principalBalance: convert(a.currentBalance, a.currency, s.principal),
    movements: s.txs.filter((t) => t.accountId === a.id).length,
  }
}

function tx(s: GuestState, id: string): GTx {
  const found = s.txs.find((t) => t.id === id)
  if (!found) throw new ApiError('Transaction not found.', 404)
  return found
}

function goal(s: GuestState, id: string): GGoal {
  const found = s.goals.find((g) => g.id === id)
  if (!found) throw new ApiError('Goal not found.', 404)
  return found
}

function listTransactions(s: GuestState, q: URLSearchParams) {
  const search = q.get('search')?.toLowerCase()
  const nameOf = (id: string | null) => (id ? (s.categories.find((c) => c.id === id)?.name ?? '') : '')
  const accountName = (id: string | null) => (id ? (s.accounts.find((a) => a.id === id)?.name ?? '') : '')
  const rows = s.txs
    .filter((t) => !q.get('type') || t.type === q.get('type'))
    .filter((t) => !q.get('status') || t.status === q.get('status'))
    .filter((t) => !q.get('accountId') || t.accountId === q.get('accountId'))
    .filter((t) => !q.get('customBudgetId') || t.customBudgetId === q.get('customBudgetId'))
    .filter((t) => !q.get('goalId') || t.goalId === q.get('goalId'))
    .filter((t) => !q.get('loanKind') || t.loanKind === q.get('loanKind'))
    .filter((t) => !q.get('categoryId') || t.categoryId === q.get('categoryId') || t.subcategoryId === q.get('categoryId'))
    .filter((t) => !q.get('from') || t.date >= q.get('from')!)
    .filter((t) => !q.get('to') || t.date <= q.get('to')!)
    .filter(
      (t) =>
        !search ||
        [t.description, t.note, t.merchant, t.counterpartyName, nameOf(t.categoryId), nameOf(t.subcategoryId), accountName(t.accountId), accountName(t.transferToAccountId)].some(
          (v) => v?.toLowerCase().includes(search),
        ),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || b.seq - a.seq)
  const offset = Number(q.get('offset') ?? 0)
  const limit = Number(q.get('limit') ?? 100)
  return rows.slice(offset, offset + limit).map((t) => serializeTx(s, t))
}

function createTransaction(s: GuestState, body: Row) {
  const wallet = account(s, body.accountId as string)
  const type = body.type as GTx['type']
  const destination = type === 'TRANSFER' ? account(s, body.transferToAccountId as string) : null
  const date = body.date as string
  const time = (body.time as string | undefined) ?? '12:00'
  const future = new Date(`${date}T${time}:00`).getTime() > Date.now()
  const status = (body.status as GTx['status'] | undefined) ?? (future ? 'PLANNED' : 'COMPLETED')
  const currency = type === 'TRANSFER' ? wallet.currency : ((body.currency as string | undefined) ?? wallet.currency)
  const amount = round(body.amount as number, currency)
  const categoryId = (body.categoryId as string | undefined) ?? 'transfer'
  const repeat = body.repeat as { interval: GSeries['interval']; occurrences?: number; endDate?: string; autoConfirm?: boolean } | undefined

  let recurringSeriesId: string | null = null
  if (repeat && type !== 'TRANSFER') {
    const series: GSeries = {
      id: newId('series'),
      name: (body.description as string | undefined) ?? '',
      type,
      amount,
      currency,
      accountId: wallet.id,
      categoryId,
      subcategoryId: (body.subcategoryId as string | undefined) ?? null,
      customBudgetId: (body.customBudgetId as string | undefined) ?? null,
      paymentMethod: paymentMethodFor(wallet.type),
      interval: repeat.interval,
      nextOccurrenceDate: addInterval(date, repeat.interval),
      occurrences: repeat.occurrences ?? null,
      occurrencesDone: 1,
      endDate: repeat.endDate ?? null,
      autoConfirm: repeat.autoConfirm ?? false,
      active: true,
    }
    if ((series.occurrences !== null && series.occurrencesDone >= series.occurrences) || (series.endDate !== null && series.nextOccurrenceDate > series.endDate)) {
      series.active = false
    }
    s.series.push(series)
    recurringSeriesId = series.id
  }

  const t = newTx(s, {
    accountId: wallet.id,
    transferToAccountId: destination?.id ?? null,
    type,
    status,
    amount,
    currency,
    ...priced(amount, currency, (destination ?? wallet).currency),
    categoryId,
    subcategoryId: (body.subcategoryId as string | undefined) ?? null,
    productId: (body.productId as string | undefined) ?? null,
    budgetId: (body.budgetId as string | undefined) ?? null,
    customBudgetId: (body.customBudgetId as string | undefined) ?? null,
    goalId: (body.goalId as string | undefined) ?? null,
    recurringSeriesId,
    loanKind: (body.loanKind as GTx['loanKind'] | undefined) ?? null,
    counterpartyName: (body.counterpartyName as string | undefined) ?? null,
    counterpartyKind: (body.counterpartyKind as string | undefined) ?? null,
    dueDate: (body.dueDate as string | undefined) ?? null,
    description: ((body.description as string | undefined) ?? '').trim(),
    merchant: (body.merchant as string | undefined) ?? null,
    note: (body.note as string | undefined) ?? null,
    date,
    time,
  })
  s.txs.push(t)
  applyEffect(s, t, 1)
  return serializeTx(s, t)
}

function updateTransaction(s: GuestState, id: string, body: Row) {
  const t = tx(s, id)
  applyEffect(s, t, -1)
  const set = <K extends keyof GTx>(key: K) => {
    if (body[key] !== undefined) t[key] = body[key] as GTx[K]
  }
  ;(['categoryId', 'subcategoryId', 'productId', 'budgetId', 'customBudgetId', 'goalId', 'status', 'counterpartyName', 'counterpartyKind', 'dueDate', 'merchant', 'note', 'date', 'time'] as const).forEach(set)
  if (body.description !== undefined) t.description = String(body.description).trim()
  if (body.accountId !== undefined) t.accountId = account(s, body.accountId as string).id
  if (body.loanKind !== undefined && t.loanKind) {
    t.loanKind = body.loanKind as GTx['loanKind']
    t.type = t.loanKind === 'LENT' ? 'EXPENSE' : 'INCOME'
  }
  if (t.type !== 'TRANSFER' && body.currency !== undefined) t.currency = body.currency as string
  if (body.amount !== undefined || body.currency !== undefined || body.accountId !== undefined) {
    t.amount = round((body.amount as number | undefined) ?? t.amount, t.currency)
    const walletId = t.type === 'TRANSFER' ? t.transferToAccountId! : t.accountId
    Object.assign(t, priced(t.amount, t.currency, walletCurrency(s, walletId)))
  }
  applyEffect(s, t, 1)
  return serializeTx(s, t)
}

function settleLoan(s: GuestState, id: string, body: Row) {
  const loan = tx(s, id)
  if (!loan.loanKind) throw new ApiError("This transaction isn't a Lent/Borrowed record.", 422)
  if (loan.status !== 'COMPLETED') throw new ApiError("This loan hasn't been confirmed yet — nothing to settle.", 422)
  if (loan.loanSettledAt) throw new ApiError('This loan has already been settled.', 409)
  const wallet = account(s, (body.accountId as string | undefined) ?? loan.accountId)
  const open = outstanding(s, loan)
  const amount = body.amount !== undefined ? round(body.amount as number, loan.currency) : open
  if (amount <= 0 || amount > open) throw new ApiError('Invalid settlement amount.', 422)
  const lent = loan.loanKind === 'LENT'
  const who = loan.counterpartyName
  const settlement = newTx(s, {
    accountId: wallet.id,
    type: lent ? 'INCOME' : 'EXPENSE',
    amount,
    currency: loan.currency,
    ...priced(amount, loan.currency, wallet.currency),
    categoryId: loan.categoryId,
    paymentMethod: loan.paymentMethod,
    description: who ? (lent ? `Pago recibido de ${who}` : `Pago realizado a ${who}`) : lent ? 'Pago de préstamo recibido' : 'Pago de préstamo realizado',
    counterpartyName: who,
    date: (body.date as string | undefined) ?? todayISO(),
    parentLoanId: loan.id,
  })
  s.txs.push(settlement)
  applyEffect(s, settlement, 1)
  if (amount === open) {
    loan.loanSettledAt = new Date().toISOString()
    loan.settledByTransactionId = settlement.id
  }
  return { original: serializeTx(s, loan), settlement: serializeTx(s, settlement) }
}

function deleteAccount(s: GuestState, id: string, body: Row) {
  const source = account(s, id)
  if (s.accounts.length <= 1) throw new ApiError('Necesitas al menos una billetera para usar S2 Nova.', 409)
  const reassign = body.reassignToAccountId as string | undefined
  if (reassign) {
    const destination = account(s, reassign)
    for (const t of s.txs) {
      if (t.accountId === id) t.accountId = destination.id
      if (t.transferToAccountId === id) t.transferToAccountId = destination.id
    }
    for (const x of s.series) if (x.accountId === id) x.accountId = destination.id
    for (const g of s.goals) if (g.plan?.accountId === id) g.plan.accountId = destination.id
    destination.currentBalance = round(destination.currentBalance + convert(source.currentBalance, source.currency, destination.currency), destination.currency)
  } else {
    const fallback = s.accounts.find((a) => a.id !== id)!
    for (const t of s.txs) {
      if (t.status !== 'COMPLETED' || t.type !== 'TRANSFER') continue
      if (t.accountId === id && t.transferToAccountId) applyEffect(s, { ...t, type: 'INCOME', accountId: t.transferToAccountId, transferToAccountId: null, walletAmount: t.walletAmount ?? t.amount }, -1)
      if (t.transferToAccountId === id) applyEffect(s, { ...t, type: 'EXPENSE', walletAmount: null, transferToAccountId: null }, -1)
    }
    s.txs = s.txs.filter((t) => t.accountId !== id && t.transferToAccountId !== id)
    for (const g of s.goals) if (g.plan?.accountId === id) g.plan.accountId = fallback.id
  }
  s.accounts = s.accounts.filter((a) => a.id !== id)
}

function deleteGoal(s: GuestState, id: string, body: Row) {
  const g = goal(s, id)
  const held = round(goalCurrent(s, g) - g.initialAmount, s.principal)
  if (held > 0) {
    let refunds: { accountId: string; amount: number }[]
    if (body.returnToOrigin) {
      refunds = Object.entries(goalContributions(s, g))
        .filter(([, amount]) => amount > 0)
        .map(([accountId, amount]) => ({ accountId, amount }))
      if (!refunds.length) throw new ApiError('The goal has no contributing wallet to return funds to.', 422)
    } else if (body.returnToAccountId) {
      refunds = [{ accountId: body.returnToAccountId as string, amount: held }]
    } else {
      throw new ApiError('returnToAccountId or returnToOrigin is required to delete a goal with remaining funds.', 422)
    }
    for (const r of refunds) {
      const wallet = account(s, r.accountId)
      const amount = convert(r.amount, s.principal, wallet.currency)
      const t = newTx(s, { accountId: wallet.id, type: 'INCOME', amount, currency: wallet.currency, categoryId: 'inc.other', description: `Fondos devueltos: ${g.name}`, date: todayISO() })
      s.txs.push(t)
      applyEffect(s, t, 1)
    }
  }
  s.goals = s.goals.filter((x) => x.id !== id)
  for (const t of s.txs) if (t.goalId === id) t.goalId = null
}

function budgetFields(body: Row): Partial<GBudget> {
  const out: Partial<GBudget> = {}
  if (body.name !== undefined) out.name = (body.name as string | null) ?? null
  if (body.categoryId !== undefined) out.categoryId = body.categoryId as string
  if (body.icon !== undefined) out.icon = body.icon as string
  if (body.walletIds !== undefined) out.walletIds = body.walletIds as string[]
  if (body.amount !== undefined) out.amount = body.amount as number
  if (body.period !== undefined) out.period = body.period as GBudget['period']
  if (body.startDate !== undefined) out.startDate = body.startDate as string
  if (body.endDate !== undefined) out.endDate = body.endDate as string
  return out
}

function createCategory(s: GuestState, body: Row) {
  const kind = body.type as 'EXPENSE' | 'INCOME'
  const parent = body.parentId ? s.categories.find((c) => c.id === body.parentId) : null
  const name = String(body.name).trim()
  if (s.categories.some((c) => c.parentId === (parent?.id ?? null) && c.kind === kind && c.name.toLowerCase() === name.toLowerCase())) {
    throw new ApiError('Ya existe una categoría con ese nombre.', 409)
  }
  const icon = parent ? parent.icon : ((body.icon as string | undefined) ?? 'other')
  const id = `${parent ? parent.slug : kind === 'EXPENSE' ? 'exp' : 'inc'}.${newId('cat')}`
  const row: GCategory = { id, slug: id, name, defaultName: name, icon, color: parent ? parent.color : visColor(icon), kind, parentId: parent?.id ?? null, isCustom: true, hidden: false }
  s.categories.push(row)
  return row
}

function updateCategory(s: GuestState, id: string, body: Row) {
  const row = s.categories.find((c) => c.id === id)
  if (!row) throw new ApiError('Category not found.', 404)
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (s.categories.some((c) => c.id !== id && c.parentId === row.parentId && c.kind === row.kind && c.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError('Ya existe una categoría con ese nombre.', 409)
    }
    row.name = name
  }
  if (body.icon !== undefined && !row.parentId) {
    row.icon = body.icon as string
    row.color = visColor(row.icon)
    for (const child of s.categories.filter((c) => c.parentId === id)) {
      child.icon = row.icon
      child.color = row.color
    }
  }
  if (body.hidden !== undefined) row.hidden = body.hidden as boolean
  return row
}

function deleteCategory(s: GuestState, id: string) {
  const row = s.categories.find((c) => c.id === id && c.isCustom)
  if (!row) throw new ApiError('Only custom categories can be deleted.', 404)
  const doomed = new Set([id, ...s.categories.filter((c) => c.parentId === id).map((c) => c.id)])
  const fallback = row.kind === 'INCOME' ? 'inc.other' : 'exp.other'
  for (const t of [...s.txs, ...s.series]) {
    if (row.parentId && t.subcategoryId === id) t.subcategoryId = null
    if (!row.parentId && t.categoryId === id) {
      t.categoryId = fallback
      t.subcategoryId = null
    }
  }
  for (const b of s.budgets) if (b.categoryId && doomed.has(b.categoryId)) b.categoryId = row.parentId ?? fallback
  s.categories = s.categories.filter((c) => !doomed.has(c.id))
}

function route(s: GuestState, method: Method, path: string, body: Row): unknown {
  const url = new URL(path, 'http://guest')
  const q = url.searchParams
  const p = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  const today = q.get('today') ?? todayISO()
  const at = (pattern: string) => {
    const parts = pattern.split('/').filter(Boolean)
    return parts.length === p.length && parts.every((part, i) => part.startsWith(':') || part === p[i])
  }
  const is = (m: Method, pattern: string) => method === m && at(pattern)

  // Session and profile
  if (is('POST', '/auth/logout')) return undefined
  if (p[0] === 'auth') throw new ApiError(NOT_FOR_GUESTS, 403)
  if (is('GET', '/me')) return me(s)
  if (is('PATCH', '/me')) {
    for (const key of ['name', 'phone', 'city'] as const) if (body[key] !== undefined) s.me[key] = body[key] as string
    return me(s)
  }
  if (is('PATCH', '/me/preferences')) {
    Object.assign(s.me.preferences, body)
    return undefined
  }
  if (is('GET', '/me/sessions')) return [{ id: 'guest', device: null, kind: 'desktop', lastActiveAt: new Date().toISOString(), current: true }]
  if (is('DELETE', '/me/sessions')) return undefined
  if (is('GET', '/me/footprint')) {
    return {
      transactions: s.txs.length,
      budgets: s.budgets.length,
      goals: s.goals.length,
      loans: s.txs.filter((t) => t.loanKind).length,
      wallets: s.accounts.length,
      recurringSeries: s.series.length,
    }
  }
  if (is('DOWNLOAD', '/me/export')) {
    return { data: new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }), fileName: 's2nova-invitado.json' }
  }
  if (p[0] === 'me' && (p[1] === 'password' || p[1] === 'sessions' || p.length === 1)) throw new ApiError(NOT_FOR_GUESTS, 403)

  // Currencies
  if (is('GET', '/currencies')) {
    return CURRENCY_CATALOG.map((c) => ({ code: c.code, name: c.name, symbol: c.symbol, decimals: c.decimals, rate: referenceRate(c.code, s.principal) }))
  }
  if (is('GET', '/me/currencies')) return listCurrencies(s)
  if (is('POST', '/me/currencies')) {
    if (!s.currencies.includes(body.code as string)) s.currencies.push(body.code as string)
    return listCurrencies(s)
  }
  if (is('PUT', '/me/currencies/principal')) {
    if (body.code !== s.principal && s.accounts.length) throw new ApiError('La moneda principal se elige antes de crear billeteras.', 409)
    return listCurrencies(s)
  }
  if (is('DELETE', '/me/currencies/:code')) {
    if (p[2] === s.principal) throw new ApiError('La moneda principal no se puede quitar.', 409)
    if (s.accounts.some((a) => a.currency === p[2])) throw new ApiError('Hay billeteras en esta moneda.', 409)
    s.currencies = s.currencies.filter((c) => c !== p[2])
    return listCurrencies(s)
  }

  // Categories
  if (is('GET', '/categories')) return categoryRows(s)
  if (is('POST', '/categories')) return createCategory(s, body)
  if (is('PATCH', '/categories/:id')) return updateCategory(s, p[1], body)
  if (is('DELETE', '/categories/:id')) return deleteCategory(s, p[1])

  // Wallets
  if (is('GET', '/accounts')) return s.accounts.map((a) => serializeAccount(s, a))
  if (is('POST', '/accounts')) {
    const currency = (body.currency as string | undefined) ?? s.principal
    const balance = round(body.initialBalance as number, currency)
    const a: GAccount = { id: newId('wallet'), name: String(body.name).trim(), type: body.type as string, currency, initialBalance: balance, currentBalance: balance }
    s.accounts.push(a)
    if (!s.currencies.includes(currency)) s.currencies.push(currency)
    return serializeAccount(s, a)
  }
  if (is('PATCH', '/accounts/:id')) {
    const a = account(s, p[1])
    if (body.name !== undefined) a.name = String(body.name).trim()
    if (body.type !== undefined) a.type = body.type as string
    return serializeAccount(s, a)
  }
  if (is('DELETE', '/accounts/:id')) return deleteAccount(s, p[1], body)

  // Movements
  if (is('GET', '/transactions')) return listTransactions(s, q)
  if (is('POST', '/transactions')) return createTransaction(s, body)
  if (is('GET', '/transactions/:id')) return serializeTx(s, tx(s, p[1]))
  if (is('PATCH', '/transactions/:id')) return updateTransaction(s, p[1], body)
  if (is('DELETE', '/transactions/:id')) {
    const t = tx(s, p[1])
    applyEffect(s, t, -1)
    s.txs = s.txs.filter((x) => x.id !== t.id)
    if (q.get('series') === 'delete' && t.recurringSeriesId) s.series = s.series.filter((x) => x.id !== t.recurringSeriesId)
    return undefined
  }
  if (is('POST', '/transactions/:id/settle-loan')) return settleLoan(s, p[1], body)
  if (is('PUT', '/transactions/:id/attachment')) {
    const t = tx(s, p[1])
    const data = String(body.data)
    t.attachment = {
      id: newId('attachment'),
      kind: body.mime === 'application/pdf' ? 'PDF' : 'IMAGE',
      mime: body.mime as string,
      name: body.name as string,
      size: Math.floor((data.length * 3) / 4),
      createdAt: new Date().toISOString(),
      data,
    }
    const { data: _data, ...meta } = t.attachment
    return meta
  }
  if (is('DOWNLOAD', '/transactions/:id/attachment')) {
    const a = tx(s, p[1]).attachment
    if (!a) throw new ApiError('Attachment not found.', 404)
    const bytes = a.data ? Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0)) : new Uint8Array()
    return { data: new Blob([bytes], { type: a.mime }), fileName: a.name }
  }
  if (is('DELETE', '/transactions/:id/attachment')) {
    tx(s, p[1]).attachment = null
    return undefined
  }

  // Budgets
  if (is('GET', '/budgets')) {
    const month = q.get('month') ?? monthOf(todayISO())
    return s.budgets
      .filter((b) => b.period !== 'CUSTOM' || b.endDate === null || b.endDate >= `${month}-01`)
      .map((b) => serializeBudget(s, b, month))
  }
  if (is('POST', '/budgets')) {
    if (body.kind === 'CATEGORY' && s.budgets.some((b) => b.kind === 'CATEGORY' && b.categoryId === body.categoryId && b.period === body.period && b.period !== 'CUSTOM')) {
      throw new ApiError('A budget for this category and period already exists.', 409)
    }
    const b: GBudget = {
      id: newId('budget'),
      name: null,
      kind: body.kind as GBudget['kind'],
      categoryId: null,
      icon: null,
      walletIds: [],
      period: 'MONTHLY',
      startDate: `${monthOf(todayISO())}-01`,
      endDate: null,
      amount: 0,
      baseSpent: 0,
      ...budgetFields(body),
    }
    if (b.kind === 'CUSTOM') b.icon ??= 'other'
    s.budgets.push(b)
    return serializeBudget(s, b)
  }
  if (is('PATCH', '/budgets/:id')) {
    const b = s.budgets.find((x) => x.id === p[1])
    if (!b) throw new ApiError('Budget not found.', 404)
    Object.assign(b, budgetFields(body))
    return serializeBudget(s, b)
  }
  if (is('DELETE', '/budgets/:id')) {
    s.budgets = s.budgets.filter((x) => x.id !== p[1])
    for (const t of s.txs) if (t.customBudgetId === p[1]) t.customBudgetId = null
    return undefined
  }

  // Goals
  if (is('GET', '/goals')) {
    processDue(s, today)
    return s.goals.map((g) => serializeGoal(s, g, today))
  }
  if (is('POST', '/goals')) {
    const g: GGoal = {
      id: newId('goal'),
      name: String(body.name).trim(),
      icon: (body.icon as string | undefined) ?? 'other',
      targetAmount: body.targetAmount as number,
      initialAmount: (body.initialAmount as number | undefined) ?? 0,
      targetDate: (body.targetDate as string | undefined) ?? null,
      base: {},
      plan: null,
    }
    s.goals.push(g)
    return serializeGoal(s, g)
  }
  if (is('PATCH', '/goals/:id')) {
    const g = goal(s, p[1])
    if (body.name !== undefined) g.name = String(body.name).trim()
    if (body.icon !== undefined) g.icon = body.icon as string
    if (body.targetAmount !== undefined) g.targetAmount = body.targetAmount as number
    if (body.initialAmount !== undefined) g.initialAmount = body.initialAmount as number
    if (body.targetDate !== undefined) g.targetDate = (body.targetDate as string | null) ?? null
    return serializeGoal(s, g)
  }
  if (is('POST', '/goals/:id/contribute')) {
    const g = goal(s, p[1])
    recordContribution(s, g, body.accountId as string, body.amount as number, (body.date as string | undefined) ?? todayISO())
    return serializeGoal(s, g)
  }
  if (is('PUT', '/goals/:id/plan')) {
    const g = goal(s, p[1])
    account(s, body.accountId as string)
    g.plan = {
      amount: body.amount as number,
      frequency: body.frequency as GPlan['frequency'],
      accountId: body.accountId as string,
      startDate: body.startDate as string,
      endMode: body.endMode as GPlan['endMode'],
      count: body.endMode === 'COUNT' ? (body.count as number) : null,
      endDate: body.endMode === 'DATE' ? (body.endDate as string) : null,
      autoConfirm: !!body.autoConfirm,
      nextDate: body.startDate as string,
      doneCount: 0,
      active: true,
    }
    return serializeGoal(s, g)
  }
  if (is('DELETE', '/goals/:id/plan')) {
    const g = goal(s, p[1])
    g.plan = null
    return serializeGoal(s, g)
  }
  if (is('POST', '/goals/:id/plan/confirm') || is('POST', '/goals/:id/plan/skip')) {
    const g = goal(s, p[1])
    if (!g.plan) throw new ApiError('Goal plan not found.', 404)
    const confirm = p[3] === 'confirm'
    if (confirm) {
      if (!g.plan.active) throw new ApiError('This plan has ended.', 422)
      recordContribution(s, g, g.plan.accountId, (body.amount as number | undefined) ?? g.plan.amount, todayISO())
    }
    advancePlan(s, g, confirm)
    return serializeGoal(s, g)
  }
  if (is('DELETE', '/goals/:id')) return deleteGoal(s, p[1], body)

  // Programados
  if (is('GET', '/recurring-series')) {
    processDue(s, today)
    return s.series.map((x) => serializeSeries(x, today))
  }
  const series = () => {
    const found = s.series.find((x) => x.id === p[1])
    if (!found) throw new ApiError('Recurring series not found.', 404)
    return found
  }
  if (is('POST', '/recurring-series/:id/confirm')) {
    const x = series()
    materialize(s, x, (body.date as string | undefined) ?? x.nextOccurrenceDate)
    advanceSeries(x)
    return serializeSeries(x)
  }
  if (is('POST', '/recurring-series/:id/skip')) {
    const x = series()
    advanceSeries(x)
    return serializeSeries(x)
  }
  if (is('DELETE', '/recurring-series/:id')) {
    series()
    s.series = s.series.filter((x) => x.id !== p[1])
    for (const t of s.txs) if (t.recurringSeriesId === p[1]) t.recurringSeriesId = null
    return undefined
  }

  // Inicio, Reportes
  if (is('GET', '/alerts')) return alerts(s, today)
  if (is('GET', '/summary/months')) {
    const count = Number(q.get('count') ?? 6)
    const current = monthOf(today)
    return monthTotals(s, Array.from({ length: count }, (_, i) => shiftMonth(current, i - count + 1)))
  }
  if (is('GET', '/summary/categories')) {
    const month = q.get('month') ?? monthOf(today)
    const byCategory = new Map<string, number>()
    for (const t of completedIncomeExpense(s)) {
      if (t.type !== 'EXPENSE' || monthOf(t.date) !== month) continue
      byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + principalAmount(s, t))
    }
    const total = [...byCategory.values()].reduce((a, b) => a + b, 0)
    const categories = [...byCategory.entries()]
      .map(([categoryId, amount]) => ({ categoryId, amount, percentage: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount)
    return { month, total, categories }
  }
  if (is('GET', '/summary/report')) return report(s, Number(q.get('range') ?? 6), today)

  throw new ApiError(NOT_FOR_GUESTS, 404)
}

// A fresh example account per guest session.
export function createGuestApi(): (method: string, path: string, body: unknown) => Promise<unknown> {
  const state = seed()
  return async (method, path, body) => route(state, method, path, (body ?? {}) as Row)
}
