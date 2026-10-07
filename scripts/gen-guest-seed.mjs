#!/usr/bin/env node
// The guest account ("Continuar como invitado") for both clients, described
// once. Writes the same JSON to web/src/lib/guestSeed.json and
// android/app/src/main/assets/guest_seed.json; never edit those by hand.
//
//   node scripts/gen-guest-seed.mjs
//
// Dates are relative so the account is always current. Each client resolves
// them against today when the guest session starts:
//   "M:o:d"  day d (or "L", the last day) of the month o months from today's
//   "T:o"    o days from today
//   "D:o"    today's day of the month, o months from today (clamped)
//   "N:d"    the first day-d date strictly after today (a monthly
//            Programado's next occurrence)
// A movement dated after today is dropped unless it is `planned` (then it is
// a PLANNED movement). Wallet balances, goal progress, how many times a
// Programado or a goal plan has run, and whether a loan is settled are all
// derived from the movements that remain, so they always add up.

import { deflateSync, crc32 } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ---- Deterministic variation ----------------------------------------------

let state = 20261007
function rand() {
  state = (state * 1103515245 + 12345) % 2147483648
  return state / 2147483648
}
const between = (lo, hi, step = 100) => Math.round((lo + rand() * (hi - lo)) / step) * step
const pick = (list) => list[Math.floor(rand() * list.length)]

// ---- Wallets ----------------------------------------------------------------

const BANCO = 'guest-bancolombia'
const NEQUI = 'guest-nequi'
const CASH = 'guest-efectivo'
const VISA = 'guest-visa'
const WISE = 'guest-wise'
const EURW = 'guest-revolut'

// `opening` is each wallet's balance (in its currency) before the first
// month of the seed; today's balance follows from the movements.
const wallets = [
  { id: BANCO, name: 'Bancolombia — Ahorros', type: 'SAVINGS', currency: 'COP', opening: 6_850_000 },
  { id: NEQUI, name: 'Nequi', type: 'NEQUI', currency: 'COP', opening: 640_000 },
  { id: CASH, name: 'Efectivo', type: 'CASH', currency: 'COP', opening: 210_000 },
  { id: VISA, name: 'Visa Bancolombia', type: 'BANK_CREDIT', currency: 'COP', opening: 0 },
  { id: WISE, name: 'Wise — Dólares', type: 'SAVINGS', currency: 'USD', opening: 180 },
  { id: EURW, name: 'Revolut — Euros', type: 'SAVINGS', currency: 'EUR', opening: 60 },
]

// ---- Custom categories --------------------------------------------------------

const categories = [
  { id: 'exp.u_regalos', parentId: null, kind: 'EXPENSE', name: 'Regalos', nameEn: 'Gifts', vis: 'events' },
  { id: 'exp.education.u_guitarra', parentId: 'exp.education', kind: 'EXPENSE', name: 'Clases de guitarra', nameEn: 'Guitar lessons', vis: 'education' },
]

// ---- Movements -----------------------------------------------------------------

const movements = []
let n = 0
function mv(p) {
  const m = {
    id: p.id ?? `guest-mv-${++n}`,
    wallet: p.wallet,
    type: p.type ?? 'EXPENSE',
    amount: p.amount,
    category: p.category,
    date: p.date,
    time: p.time ?? '12:00',
    title: p.title,
  }
  for (const k of ['currency', 'sub', 'merchant', 'note', 'counterparty', 'counterpartyKind', 'to', 'planned', 'series', 'goal', 'goalPlan', 'customBudget', 'loan', 'parentLoan', 'attachment']) {
    if (p[k] !== undefined) m[k] = p[k]
  }
  movements.push(m)
  return m
}
const M = (o, d) => `M:${o}:${d}`
const T = (o) => `T:${o}`
const D = (o) => `D:${o}`
const MONTHS = [-11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0]

for (const o of MONTHS) {
  const raise = o >= -4
  // Income: the salary on the 1st, interest at the end of the month.
  mv({ wallet: BANCO, type: 'INCOME', amount: raise ? 4_650_000 : 4_400_000, category: 'inc.work', sub: 'inc.work.salary', date: M(o, 1), time: '06:00', title: 'Salario mensual', counterparty: 'Grupo Éxito', counterpartyKind: 'EMPLOYER', series: 'guest-series-salary' })
  mv({ wallet: BANCO, type: 'INCOME', amount: between(14_000, 22_000), category: 'inc.investments', sub: 'inc.investments.interest', date: M(o, 'L'), time: '23:30', title: 'Intereses de la cuenta de ahorros', merchant: 'Bancolombia' })

  // Housing and bills.
  mv({ wallet: BANCO, amount: 1_450_000, category: 'exp.housing', sub: 'exp.housing.rent', date: M(o, 5), time: '08:00', title: 'Arriendo', counterparty: 'Inmobiliaria Laureles', series: 'guest-series-rent' })
  if (o < 0) mv({ wallet: BANCO, amount: 232_000, category: 'exp.housing', sub: 'exp.housing.maintenance', date: M(o, 10), time: '09:30', title: 'Administración', series: 'guest-series-admin' })
  mv({
    wallet: BANCO, amount: 109_000, category: 'exp.utilities', sub: 'exp.utilities.internet', date: M(o, 12), time: '10:30', title: 'Internet y celular', merchant: 'Claro', series: 'guest-series-claro',
    ...(o === -1 ? { attachment: { kind: 'PDF', name: 'factura-claro.pdf', file: 'factura-claro.pdf' } } : {}),
  })
  mv({ wallet: BANCO, amount: between(148_000, 196_000), category: 'exp.utilities', sub: 'exp.utilities.electricity', date: M(o, 16), time: '11:05', title: 'Energía y agua', merchant: 'EPM' })
  mv({ wallet: BANCO, amount: 14_900, category: 'exp.financial', sub: 'exp.financial.bank_fees', date: M(o, 'L'), time: '23:50', title: 'Cuota de manejo', merchant: 'Bancolombia' })

  // Subscriptions: Spotify in dollars from the peso account, Netflix on the card.
  mv({ wallet: BANCO, amount: 5.99, currency: 'USD', category: 'exp.entertainment', sub: 'exp.entertainment.streaming', date: M(o, 20), time: '22:15', title: 'Spotify', merchant: 'Spotify', series: 'guest-series-spotify' })
  mv({ wallet: VISA, amount: 44_900, category: 'exp.entertainment', sub: 'exp.entertainment.streaming', date: M(o, 24), time: '21:00', title: 'Netflix', merchant: 'Netflix', series: 'guest-series-netflix' })

  // Groceries every week, alternating account and card.
  ;[3, 10, 17, 24].forEach((day, i) => {
    const store = pick(['Éxito', 'Carulla', 'D1', 'Ara'])
    mv({
      wallet: i % 2 ? VISA : BANCO, amount: between(store === 'D1' || store === 'Ara' ? 70_000 : 140_000, store === 'D1' || store === 'Ara' ? 120_000 : 230_000), category: 'exp.food', sub: 'exp.food.groceries', date: M(o, day), time: pick(['09:12', '10:40', '17:25', '19:05']), title: i === 0 ? 'Mercado del mes' : 'Mercado', merchant: store,
      ...(o === 0 && i === 0 ? { attachment: { kind: 'IMAGE', name: 'recibo-mercado.png', file: 'recibo-mercado.png' } } : {}),
    })
  })
  // Eating out, coffee and delivery.
  for (const day of [7, 21]) mv({ wallet: VISA, amount: between(58_000, 145_000), category: 'exp.food', sub: 'exp.food.restaurants', date: M(o, day), time: '20:10', title: pick(['Cena', 'Almuerzo']), merchant: pick(['Crepes & Waffles', 'El Cielo', 'Mondongo’s', 'Hatoviejo']) })
  for (const day of [2, 9, 13, 19, 26]) mv({ wallet: CASH, amount: between(8_000, 16_000), category: 'exp.food', sub: 'exp.food.cafes', date: M(o, day), time: '07:48', title: 'Café', merchant: pick(['Tostao', 'Juan Valdez', 'Pergamino']) })
  for (const day of [11, 27]) mv({ wallet: NEQUI, amount: between(32_000, 64_000), category: 'exp.food', sub: 'exp.food.delivery', date: M(o, day), time: '21:20', title: 'Domicilio', merchant: 'Rappi' })

  // Getting around.
  for (const day of [1, 8, 15, 22]) mv({ wallet: NEQUI, amount: 40_000, category: 'exp.transportation', sub: 'exp.transportation.public_transit', date: M(o, day), time: '07:15', title: 'Recarga Cívica', merchant: 'Metro de Medellín' })
  for (const day of [6, 18]) mv({ wallet: NEQUI, amount: between(14_000, 32_000), category: 'exp.transportation', sub: 'exp.transportation.rideshare', date: M(o, day), time: '23:10', title: 'Viaje en DiDi', merchant: 'DiDi' })

  // Health, personal care and fun.
  mv({ wallet: BANCO, amount: between(38_000, 72_000), category: 'exp.shopping', sub: 'exp.shopping.personal_care', date: M(o, 14), time: '18:30', title: 'Cuidado personal', merchant: pick(['Cruz Verde', 'Falabella']) })
  if (o % 2 === 0) mv({ wallet: VISA, amount: between(32_000, 58_000), category: 'exp.entertainment', sub: 'exp.entertainment.cinema', date: M(o, 23), time: '19:40', title: 'Cine', merchant: 'Cinépolis' })
  if (o % 3 === 0) mv({ wallet: BANCO, amount: between(60_000, 95_000), category: 'exp.health', sub: 'exp.health.medication', date: M(o, 9), time: '12:20', title: 'Droguería', merchant: 'Pasteur' })
  if (o % 3 === -1) mv({ wallet: VISA, amount: between(120_000, 260_000), category: 'exp.shopping', sub: 'exp.shopping.clothing', date: M(o, 19), time: '16:45', title: 'Ropa', merchant: pick(['Arturo Calle', 'Zara', 'Studio F']) })
  mv({ wallet: CASH, amount: 120_000, category: 'exp.education', sub: 'exp.education.u_guitarra', date: M(o, 4), time: '17:00', title: 'Clases de guitarra', counterparty: 'Escuela La Bemol' })

  // Card interest some months, and paying the card from the account.
  if (o % 4 === 0) mv({ wallet: VISA, amount: between(18_000, 32_000), category: 'exp.debt', sub: 'exp.debt.interest', date: M(o, 2), time: '00:10', title: 'Intereses de la tarjeta', merchant: 'Bancolombia' })
  if (o > -11) mv({ wallet: BANCO, type: 'TRANSFER', to: VISA, amount: o === -10 ? 1_150_000 : between(1_050_000, 1_250_000, 1_000), category: 'transfer', date: M(o, 8), time: '08:30', title: 'Pago de la tarjeta Visa' })

  // Moving money between accounts.
  mv({ wallet: BANCO, type: 'TRANSFER', to: NEQUI, amount: 400_000, category: 'transfer', date: M(o, 2), time: '09:00', title: 'Recarga a Nequi' })
  mv({ wallet: BANCO, type: 'TRANSFER', to: CASH, amount: o <= -6 ? 450_000 : o <= -3 ? 200_000 : 330_000, category: 'transfer', date: M(o, 3), time: '13:00', title: 'Retiro en cajero' })
}

// A second income source, in dollars, most months; a third one now and then.
for (const [o, usd, who] of [[-11, 250, 'Andrés Gómez'], [-9, 400, 'Estudio Andina'], [-8, 180, 'Andrés Gómez'], [-6, 520, 'Estudio Andina'], [-4, 300, 'Andrés Gómez'], [-3, 260, 'Estudio Andina'], [-1, 450, 'Estudio Andina']]) {
  mv({ wallet: WISE, type: 'INCOME', amount: usd, category: 'inc.work', sub: 'inc.work.freelance', date: M(o, 18), time: '16:05', title: pick(['Diseño de logo', 'Landing page', 'Piezas para redes']), counterparty: who, counterpartyKind: 'CLIENT' })
}
mv({ wallet: BANCO, type: 'INCOME', amount: 2_250_000, category: 'inc.work', sub: 'inc.work.bonuses', date: M(-6, 20), time: '06:00', title: 'Prima de servicios', counterparty: 'Grupo Éxito', counterpartyKind: 'EMPLOYER', note: 'La mitad va al fondo de emergencia.' })
mv({ wallet: EURW, type: 'INCOME', amount: 80, category: 'inc.transfers', sub: 'inc.transfers.gifts', date: M(-5, 12), time: '10:00', title: 'Regalo de cumpleaños', counterparty: 'Tía Clara', counterpartyKind: 'FAMILY' })
mv({ wallet: NEQUI, type: 'INCOME', amount: 160_000, category: 'inc.business', sub: 'inc.business.sales', date: M(-2, 15), time: '15:30', title: 'Venta de la bicicleta vieja', counterparty: 'Marketplace' })
// Money changed into dollars, and spending abroad.
mv({ wallet: BANCO, type: 'TRANSFER', to: WISE, amount: 790_000, category: 'transfer', date: M(-2, 6), time: '11:00', title: 'Cambio a dólares', note: 'Para la suscripción de diseño y viajes.' })
mv({ wallet: WISE, type: 'TRANSFER', to: BANCO, amount: 1_500, category: 'transfer', date: M(-5, 21), time: '10:15', title: 'Cambio a pesos' })
mv({ wallet: WISE, amount: 24, category: 'exp.business', sub: 'exp.business.tools', date: M(-1, 9), time: '08:00', title: 'Figma', merchant: 'Figma' })
mv({ wallet: EURW, amount: 18.5, category: 'exp.entertainment', sub: 'exp.entertainment.games', date: M(-3, 22), time: '21:30', title: 'Juego en Steam', merchant: 'Steam' })

// Once a year: the SOAT; a one-off purchase; a concert.
mv({ wallet: BANCO, amount: 743_000, category: 'exp.transportation', sub: 'exp.transportation.maintenance', date: M(-9, 14), time: '10:00', title: 'SOAT de la moto', merchant: 'Sura', series: 'guest-series-soat' })
mv({ wallet: VISA, amount: 389_000, category: 'exp.shopping', sub: 'exp.shopping.technology', date: M(-7, 26), time: '18:00', title: 'Audífonos inalámbricos', merchant: 'Alkosto' })
mv({ wallet: VISA, amount: 280_000, category: 'exp.entertainment', sub: 'exp.entertainment.events', date: M(-5, 16), time: '20:00', title: 'Concierto en el Atanasio', note: 'Con Sofía y Mateo.' })
mv({ wallet: CASH, amount: 95_000, category: 'exp.u_regalos', date: M(-5, 11), time: '17:30', title: 'Regalo para mamá' })
mv({ wallet: BANCO, amount: 180_000, category: 'exp.health', sub: 'exp.health.dental', date: M(-2, 13), time: '15:00', title: 'Limpieza dental', merchant: 'Odontología Laureles' })

// The Cartagena trip four months ago, under its own (custom) budget.
for (const [day, amount, sub, title, merchant] of [
  [10, 640_000, 'exp.travel.transport', 'Vuelo Medellín–Cartagena', 'Avianca'],
  [12, 820_000, 'exp.travel.accommodation', 'Hotel en Getsemaní', 'Booking'],
  [13, 260_000, 'exp.travel.food', 'Comidas en Cartagena', null],
  [14, 380_000, 'exp.travel.activities', 'Paseo a las Islas del Rosario', null],
]) {
  mv({ wallet: VISA, amount, category: 'exp.travel', sub, date: M(-4, day), time: '12:00', title, ...(merchant ? { merchant } : {}), customBudget: 'guest-budget-cartagena' })
}

// The last few days: a birthday (custom budget), eating out over the card
// limit, and things coming up.
mv({ wallet: BANCO, amount: 120_000, category: 'exp.u_regalos', date: T(-3), time: '18:20', title: 'Regalo para Sofía', customBudget: 'guest-budget-sofia' })
mv({ wallet: NEQUI, amount: 65_000, category: 'exp.food', sub: 'exp.food.delivery', date: T(-1), time: '19:30', title: 'Torta de cumpleaños', merchant: 'Astor', customBudget: 'guest-budget-sofia' })
mv({ wallet: VISA, amount: 140_000, category: 'exp.food', sub: 'exp.food.restaurants', date: T(-1), time: '21:00', title: 'Cena de cumpleaños', merchant: 'Carmen' })
mv({ wallet: VISA, amount: 118_000, category: 'exp.food', sub: 'exp.food.restaurants', date: T(0), time: '13:10', title: 'Almuerzo con el equipo', merchant: 'Hatoviejo', note: 'Se divide entre cuatro.' })
mv({ wallet: NEQUI, amount: 180_000, category: 'exp.education', sub: 'exp.education.courses', date: T(4), time: '09:00', title: 'Cuota del curso de inglés', planned: true })
mv({ wallet: VISA, amount: 1_380_000, category: 'exp.travel', sub: 'exp.travel.transport', date: T(6), time: '10:00', title: 'Tiquetes Bogotá–Lima', planned: true, customBudget: 'guest-budget-peru' })

// ---- Loans ---------------------------------------------------------------------

// Lent to Camilo, half paid back.
mv({ id: 'guest-loan-camilo', wallet: BANCO, amount: 420_000, category: 'exp.other', date: M(-1, 5), time: '19:00', title: 'Préstamo a Camilo', counterparty: 'Camilo Restrepo', loan: { kind: 'LENT', due: M(1, 15) } })
mv({ wallet: NEQUI, type: 'INCOME', amount: 150_000, category: 'exp.other', date: T(-6), time: '12:30', title: 'Pago recibido de Camilo Restrepo', counterparty: 'Camilo Restrepo', parentLoan: 'guest-loan-camilo' })
// Lent to Ana María, paid back in full.
mv({ id: 'guest-loan-ana', wallet: NEQUI, amount: 200_000, category: 'exp.other', date: M(-3, 10), time: '18:00', title: 'Préstamo a Ana María', counterparty: 'Ana María Ruiz', loan: { kind: 'LENT', due: M(-2, 10) } })
mv({ wallet: NEQUI, type: 'INCOME', amount: 200_000, category: 'exp.other', date: M(-2, 2), time: '12:00', title: 'Pago recibido de Ana María Ruiz', counterparty: 'Ana María Ruiz', parentLoan: 'guest-loan-ana' })
// Borrowed from Dad, paid back a bit each month.
mv({ id: 'guest-loan-papa', wallet: BANCO, type: 'INCOME', amount: 1_500_000, category: 'inc.other', date: M(-8, 3), time: '10:00', title: 'Préstamo de papá', counterparty: 'Papá', counterpartyKind: 'FAMILY', note: 'Para el depósito del apartamento.', loan: { kind: 'BORROWED' } })
for (const o of [-7, -6, -5, -4]) mv({ wallet: BANCO, amount: 250_000, category: 'inc.other', date: M(o, 4), time: '10:00', title: 'Pago realizado a Papá', counterparty: 'Papá', parentLoan: 'guest-loan-papa' })
// Borrowed from Daniela, overdue.
mv({ id: 'guest-loan-daniela', wallet: NEQUI, type: 'INCOME', amount: 300_000, category: 'inc.other', date: M(-2, 20), time: '14:00', title: 'Préstamo de Daniela', counterparty: 'Daniela Ortiz', counterpartyKind: 'FRIEND', loan: { kind: 'BORROWED', due: T(-5) } })

// ---- Goals and their contributions -----------------------------------------------

const goals = [
  {
    id: 'guest-goal-emergencia', name: 'Fondo de emergencia', icon: 'savings', target: 12_000_000, initial: 2_000_000, targetDate: null,
    plan: { amount: 100_000, frequency: 'WEEKLY', wallet: NEQUI, start: T(-81), endMode: 'GOAL', count: null, endDate: null, autoConfirm: true, next: T(3), active: true },
  },
  {
    id: 'guest-goal-peru', name: 'Viaje a Perú', icon: 'travel', target: 4_500_000, initial: 500_000, targetDate: M(8, 'L'),
    plan: { amount: 250_000, frequency: 'MONTHLY', wallet: BANCO, start: D(-5), endMode: 'GOAL', count: null, endDate: null, autoConfirm: false, next: D(0), active: true },
  },
  {
    id: 'guest-goal-portatil', name: 'Portátil nuevo', icon: 'technology', target: 5_200_000, initial: 1_000_000, targetDate: M(3, 'L'),
    plan: { amount: 400_000, frequency: 'MONTHLY', wallet: BANCO, start: M(-6, 20), endMode: 'COUNT', count: 8, endDate: null, autoConfirm: false, next: 'N:20', active: true },
  },
  {
    id: 'guest-goal-especializacion', name: 'Especialización', icon: 'education', target: 8_000_000, initial: 0, targetDate: M(10, 'L'),
    plan: { amount: 300_000, frequency: 'MONTHLY', wallet: NEQUI, start: M(-3, 28), endMode: 'DATE', count: null, endDate: M(10, 'L'), autoConfirm: false, next: 'N:28', active: true },
  },
  { id: 'guest-goal-bici', name: 'Bicicleta', icon: 'transportation', target: 1_800_000, initial: 300_000, targetDate: M(-1, 'L'), plan: null },
]
const aporte = (goal, wallet, amount, date, plan = false, extra = {}) =>
  mv({ wallet, amount, currency: 'COP', category: 'exp.other', date, time: '08:00', title: `Aporte a ${goals.find((g) => g.id === goal).name}`, goal, ...(plan ? { goalPlan: true } : {}), ...extra })

// Fondo de emergencia: an automatic weekly aporte for twelve weeks, plus half the prima.
for (let w = 11; w >= 0; w--) aporte('guest-goal-emergencia', NEQUI, 100_000, T(-4 - 7 * w), true)
aporte('guest-goal-emergencia', BANCO, 1_100_000, M(-6, 21), false, { note: 'La mitad de la prima.' })
// Viaje a Perú: monthly, confirmed each time; due today. One aporte from the dollar account.
for (const o of [-5, -4, -3, -2, -1]) aporte('guest-goal-peru', BANCO, 250_000, D(o), true)
aporte('guest-goal-peru', WISE, 100, M(-2, 7), false, { currency: 'USD' })
// Portátil nuevo: six of eight monthly aportes, plus a lump sum (it is close to done).
for (const o of [-6, -5, -4, -3, -2, -1]) aporte('guest-goal-portatil', BANCO, 400_000, M(o, 20), true)
aporte('guest-goal-portatil', BANCO, 1_350_000, M(-1, 25))
// Especialización: monthly until a date.
for (const o of [-3, -2, -1]) aporte('guest-goal-especializacion', NEQUI, 300_000, M(o, 28), true)
// Bicicleta: done.
for (const o of [-11, -10, -9, -8, -7, -6]) aporte('guest-goal-bici', CASH, 250_000, M(o, 25))

// ---- Budgets ---------------------------------------------------------------------

const budgets = [
  { id: 'guest-budget-food', kind: 'CATEGORY', category: 'exp.food', amount: 1_300_000 },
  { id: 'guest-budget-restaurants', kind: 'CATEGORY', category: 'exp.food.restaurants', walletIds: [VISA], amount: 200_000 },
  { id: 'guest-budget-transport', kind: 'CATEGORY', category: 'exp.transportation', amount: 280_000 },
  { id: 'guest-budget-utilities', kind: 'CATEGORY', category: 'exp.utilities', amount: 330_000 },
  { id: 'guest-budget-entertainment', kind: 'CATEGORY', category: 'exp.entertainment', amount: 160_000 },
  { id: 'guest-budget-shopping', kind: 'CATEGORY', category: 'exp.shopping', amount: 350_000 },
  { id: 'guest-budget-sofia', kind: 'CUSTOM', name: 'Cumpleaños de Sofía', icon: 'events', period: 'CUSTOM', start: T(-6), end: T(10), amount: 300_000 },
  { id: 'guest-budget-cartagena', kind: 'CUSTOM', name: 'Viaje a Cartagena', icon: 'travel', period: 'CUSTOM', start: M(-4, 1), end: M(-4, 'L'), amount: 2_000_000 },
  { id: 'guest-budget-peru', kind: 'CUSTOM', name: 'Viaje a Perú', icon: 'travel', period: 'CUSTOM', start: M(2, 15), end: M(3, 10), amount: 3_500_000 },
].map((b) => ({ period: 'MONTHLY', walletIds: [], ...b }))

// ---- Programados ----------------------------------------------------------------------

const series = [
  { id: 'guest-series-salary', name: 'Salario mensual', type: 'INCOME', amount: 4_650_000, wallet: BANCO, category: 'inc.work', sub: 'inc.work.salary', interval: 'MONTHLY', next: 'N:1' },
  { id: 'guest-series-rent', name: 'Arriendo', amount: 1_450_000, wallet: BANCO, category: 'exp.housing', sub: 'exp.housing.rent', interval: 'MONTHLY', next: 'N:5' },
  // Due today: Inicio's "vence hoy" alert.
  { id: 'guest-series-admin', name: 'Administración', amount: 232_000, wallet: BANCO, category: 'exp.housing', sub: 'exp.housing.maintenance', interval: 'MONTHLY', next: T(0) },
  { id: 'guest-series-claro', name: 'Internet y celular', amount: 109_000, wallet: BANCO, category: 'exp.utilities', sub: 'exp.utilities.internet', interval: 'MONTHLY', next: 'N:12', autoConfirm: true },
  { id: 'guest-series-spotify', name: 'Spotify', amount: 5.99, currency: 'USD', wallet: BANCO, category: 'exp.entertainment', sub: 'exp.entertainment.streaming', interval: 'MONTHLY', next: 'N:20', autoConfirm: true },
  { id: 'guest-series-netflix', name: 'Netflix', amount: 44_900, wallet: VISA, category: 'exp.entertainment', sub: 'exp.entertainment.streaming', interval: 'MONTHLY', next: 'N:24' },
  { id: 'guest-series-yoga', name: 'Clase de yoga', amount: 35_000, wallet: CASH, category: 'exp.health', sub: 'exp.health.appointments', interval: 'WEEKLY', next: T(2) },
  { id: 'guest-series-soat', name: 'SOAT de la moto', amount: 743_000, wallet: BANCO, category: 'exp.transportation', sub: 'exp.transportation.maintenance', interval: 'YEARLY', next: M(3, 14) },
  { id: 'guest-series-guitarra', name: 'Clases de guitarra', amount: 120_000, wallet: CASH, category: 'exp.education', sub: 'exp.education.u_guitarra', interval: 'MONTHLY', next: 'N:4', endDate: M(4, 4) },
  { id: 'guest-series-gym', name: 'Gimnasio', amount: 89_000, wallet: BANCO, category: 'exp.health', interval: 'MONTHLY', next: 'N:15', active: false },
].map((s) => ({ currency: 'COP', autoConfirm: false, active: true, occurrences: null, endDate: null, ...s }))

// The weekly yoga class: the last eight weeks.
for (let w = 1; w <= 8; w++) mv({ wallet: CASH, amount: 35_000, category: 'exp.health', sub: 'exp.health.appointments', date: T(2 - 7 * w), time: '07:00', title: 'Clase de yoga', series: 'guest-series-yoga' })
// The guitar lessons started as a Programado with an end date.
for (const m of movements) if (m.title === 'Clases de guitarra') m.series = 'guest-series-guitarra'

// The card is paid on the 8th with what was spent on it the month before.
for (const pay of movements.filter((m) => m.type === 'TRANSFER' && m.to === VISA)) {
  const o = Number(pay.date.split(':')[1])
  pay.amount = movements
    .filter((m) => m.wallet === VISA && m.type === 'EXPENSE' && m.date.startsWith(`M:${o - 1}:`))
    .reduce((sum, m) => sum + m.amount, 0)
}

// ---- Receipt files ------------------------------------------------------------------------

// A small grey receipt as a PNG: paper, a header bar and lines of "text".
function receiptPng(width = 240, height = 360) {
  const rows = []
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3)
    for (let x = 0; x < width; x++) {
      const inPaper = x >= 20 && x < width - 20 && y >= 16 && y < height - 16
      const header = inPaper && y >= 36 && y < 52 && x >= 60 && x < width - 60
      const line = inPaper && y >= 76 && y < height - 60 && (y - 76) % 22 < 6 && x >= 36 && x < (y % 44 < 22 ? width - 36 : width - 90)
      const total = inPaper && y >= height - 44 && y < height - 32 && x >= width - 110 && x < width - 36
      const v = header || total ? 40 : line ? 120 : inPaper ? 250 : 214
      row[1 + x * 3] = v
      row[2 + x * 3] = v
      row[3 + x * 3] = v
    }
    rows.push(row)
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))])
}

// A one-page PDF invoice.
function invoicePdf() {
  const text = [
    'BT /F1 18 Tf 72 760 Td (Claro Colombia) Tj ET',
    'BT /F1 12 Tf 72 730 Td (Factura de servicios - Internet y celular) Tj ET',
    'BT /F1 12 Tf 72 700 Td (Plan Hogar 300 Mbps + Movil 30 GB) Tj ET',
    'BT /F1 12 Tf 72 670 Td (Total a pagar: $109.000) Tj ET',
    'BT /F1 10 Tf 72 640 Td (Documento de ejemplo del modo invitado de S2 Nova.) Tj ET',
  ].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let out = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((body, i) => {
    offsets.push(out.length)
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}

const files = {
  'recibo-mercado.png': receiptPng().toString('base64'),
  'factura-claro.pdf': invoicePdf().toString('base64'),
}

// ---- Self-check ------------------------------------------------------------------------------

// The same date rules the clients apply, to check the account for any
// "today": no wallet but the card dips below zero and the card is never in
// credit.
const RATES = { COP: 1, USD: 3950, EUR: 4300 }
const fmt = (d) => d.toISOString().slice(0, 10)
function resolve(spec, today) {
  const [kind, a, b] = spec.split(':')
  const t = new Date(`${today}T00:00:00Z`)
  const monthDay = (o, day) => {
    const first = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + o, 1))
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
    return fmt(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), day === 'L' ? last : Math.min(Number(day), last))))
  }
  if (kind === 'T') return fmt(new Date(t.getTime() + Number(a) * 86_400_000))
  if (kind === 'M') return monthDay(Number(a), b)
  if (kind === 'D') return monthDay(Number(a), t.getUTCDate())
  if (kind === 'N') {
    const here = monthDay(0, a)
    return here > today ? here : monthDay(1, a)
  }
  throw new Error(`bad date ${spec}`)
}
function check(today) {
  const kept = movements
    .map((m) => ({ ...m, on: resolve(m.date, today) }))
    .filter((m) => m.on <= today || m.planned)
    .filter((m) => !m.planned)
    .sort((x, y) => x.on.localeCompare(y.on))
  const bal = Object.fromEntries(wallets.map((w) => [w.id, w.opening]))
  const cur = Object.fromEntries(wallets.map((w) => [w.id, w.currency]))
  const low = { ...bal }
  const high = { ...bal }
  for (const m of kept) {
    const conv = (amount, from, to) => (amount * RATES[from]) / RATES[to]
    const inWallet = conv(m.amount, m.currency ?? cur[m.wallet], cur[m.wallet])
    if (m.type === 'INCOME') bal[m.wallet] += inWallet
    else bal[m.wallet] -= inWallet
    if (m.type === 'TRANSFER') bal[m.to] += conv(m.amount, cur[m.wallet], cur[m.to])
    for (const id of Object.keys(bal)) {
      low[id] = Math.min(low[id], bal[id])
      high[id] = Math.max(high[id], bal[id])
    }
  }
  for (const w of wallets) {
    if (w.type === 'BANK_CREDIT' ? high[w.id] > 0.5 : low[w.id] < 0) throw new Error(`${today}: ${w.name} goes to ${w.type === 'BANK_CREDIT' ? high[w.id] : low[w.id]}`)
  }
  return Object.values(bal).reduce((s, v, i) => s + v * RATES[wallets[i].currency], 0)
}
for (const today of ['2026-10-01', '2026-10-07', '2026-10-31', '2027-02-28', '2027-03-01', '2027-03-15', '2026-12-31', '2027-01-01']) {
  console.log(`${today}: total ${Math.round(check(today)).toLocaleString('es-CO')}`)
}

// ---- Write ------------------------------------------------------------------------------------

const seed = { version: 1, principal: 'COP', currencies: ['COP', 'USD', 'EUR'], wallets, categories, movements, budgets, goals, series, files }
// One item per line: small, and diffs stay readable.
const json = `{\n${Object.entries(seed)
  .map(([key, value]) => (Array.isArray(value) && typeof value[0] === 'object' ? `"${key}": [\n${value.map((v) => ` ${JSON.stringify(v)}`).join(',\n')}\n]` : `"${key}": ${JSON.stringify(value)}`))
  .join(',\n')}\n}\n`
for (const out of ['web/src/lib/guestSeed.json', 'android/app/src/main/assets/guest_seed.json']) {
  writeFileSync(join(root, out), json)
  console.log(`wrote ${out} (${movements.length} movements)`)
}
