// Domain types shared across services, state, and UI. Keeping these
// independent of any mock-data shape makes it straightforward to swap the
// mock services for real API clients later without touching components.

export type TransactionType = 'income' | 'expense' | 'transfer'

// COMPLETED transactions affect their wallet's balance immediately;
// 'planned' ("Upcoming") ones are recorded but don't move money yet.
export type TransactionStatus = 'completed' | 'planned'

// Interval a RecurringSeries fires on. Only RecurringSeries carries this —
// a materialized Transaction just points back to its series via
// recurringSeriesId, it doesn't repeat its own interval (see
// RecurringSeries doc comment for why definition and occurrence are kept
// separate, mirroring backend/prisma/schema.prisma).
export type RecurrenceInterval = 'daily' | 'weekly' | 'monthly' | 'yearly'

// Set only on transactions representing money lent to, or borrowed from,
// someone else — tracked as outstanding until settled.
export type LoanKind = 'lent' | 'borrowed'

export type WalletType = 'cash' | 'bank' | 'savings' | 'crypto' | 'other'

// The backend's full AccountType — Inicio's "Billeteras" card labels and
// icons each wallet by it (Nequi reads "Billetera digital", not "other").
export type AccountType = 'CASH' | 'BANK_DEBIT' | 'BANK_CREDIT' | 'SAVINGS' | 'CRYPTO' | 'NEQUI' | 'DAVIPLATA' | 'OTHER'

export interface Wallet {
  id: string
  name: string
  type: WalletType
  accountType: AccountType
  // One currency per wallet (CURRENCIES_AND_WALLETS.md); balances are in it.
  currency: string
  initialBalance: number
  currentBalance: number
  // currentBalance converted to the user's principal currency.
  principalBalance: number
  movements: number
}

// A recurring definition ("Netflix, $45,000/month") — kept separate from
// any Transaction it produces. Web is read-only for these (creating/
// editing is Android's job — see root AGENTS.md); Web only displays them
// for the Recurring/Net Worth/Insights pages and the upcoming-events list.
export interface RecurringSeries {
  id: string
  name: string
  type: 'income' | 'expense'
  amount: number
  accountId: string
  category: CategoryId
  currency: string
  interval: RecurrenceInterval
  nextOccurrenceDate: string
  occurrences?: number
  occurrencesDone: number
  endDate?: string
  autoConfirm: boolean
  isDue: boolean
  active: boolean
}

// Aporte periódico (PLANS.md §3).
export type GoalPlanEnd = 'goal' | 'count' | 'date'
export interface GoalPlan {
  amount: number
  frequency: 'daily' | 'weekly' | 'monthly'
  accountId: string
  startDate: string
  endMode: GoalPlanEnd
  count?: number
  endDate?: string
  autoConfirm: boolean
  nextDate: string
  doneCount: number
  active: boolean
  due: boolean
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  // Server-computed (backend/src/lib/goalProgress.ts) — never recomputed here.
  remaining: number
  percentage: number
  icon: string // PLAN_ICONS key (savings, travel, ...)
  initialAmount: number
  targetDate?: string
  plan?: GoalPlan
  // What each wallet has put in (for "Devolver a su origen").
  contributions?: { accountId: string; amount: number }[]
}

// The taxonomy's stable dotted id ('exp.food.groceries'), or 'transfer'.
// Names, colors and glyphs resolve through lib/backendCategories.ts.
export type CategoryId = string

export interface Category {
  id: CategoryId
  label: string
  icon: string // lucide icon name, resolved via components/ui/CategoryIcon
  color: string // hex, used for chips/dots/chart series
  kind: TransactionType | 'both'
}

export type PaymentMethod =
  | 'cash'
  | 'debit_card'
  | 'credit_card'
  | 'bank_transfer'
  | 'nequi'
  | 'daviplata'

export type CounterpartyKind = 'employer' | 'client' | 'family' | 'friend' | 'other'

export interface AttachmentMeta {
  id: string
  kind: 'image' | 'pdf'
  mime: string
  name: string
  size: number
  createdAt: string
}

export interface Transaction {
  id: string
  accountId: string
  transferAccountId?: string // destination wallet, set only when type === 'transfer'
  description: string
  amount: number // always positive; sign implied by `type`, in `currency`
  currency: string
  // Set when `currency` differs from the wallet's: the rate and what the
  // wallet actually moved by, in the wallet's currency.
  fxRate?: number
  walletAmount?: number
  type: TransactionType
  status?: TransactionStatus // defaults to 'completed'
  category: CategoryId
  date: string // ISO 8601 date, e.g. 2026-08-03
  time: string // HH:mm, local wall-clock
  paymentMethod: PaymentMethod
  merchant?: string
  note?: string
  productId?: string // set when created via barcode scan confirmation
  budgetId?: string // optional — a transaction never has to belong to a budget
  customBudgetId?: string // a CUSTOM budget picked in Nuevo movimiento
  goalId?: string // optional — a transaction never has to belong to a goal
  recurringSeriesId?: string // set when materialized from a RecurringSeries occurrence
  loanKind?: LoanKind
  counterpartyName?: string // loans: who the money is with; income: "De"
  counterpartyKind?: CounterpartyKind
  attachment?: AttachmentMeta
  dueDate?: string // Lent/Borrowed only — when repayment is expected
  loanSettled?: boolean
  settledByTransactionId?: string // the real repayment transaction, once settled
  parentLoanId?: string // set on an abono — points back at the loan it pays
  outstanding?: number // loans only: server-computed pending balance
}

export interface RepeatRule {
  interval: RecurrenceInterval
  occurrences?: number
  endDate?: string
  autoConfirm: boolean
}

export interface NewTransactionInput {
  accountId: string
  transferAccountId?: string
  description: string
  amount: number
  currency?: string
  type: TransactionType
  status?: TransactionStatus
  category?: CategoryId
  date: string
  time?: string
  repeat?: RepeatRule
  customBudgetId?: string
  counterpartyKind?: CounterpartyKind
  // Ignored by the backend (it derives the method from the wallet); kept
  // optional only for older call sites.
  paymentMethod?: PaymentMethod
  merchant?: string
  note?: string
  productId?: string
  budgetId?: string
  goalId?: string
  loanKind?: LoanKind
  counterpartyName?: string
  dueDate?: string
}

export type BudgetKind = 'category' | 'custom'
export type BudgetPeriod = 'monthly' | 'weekly' | 'custom'

export interface CategoryBudget {
  id: string
  kind: BudgetKind
  name?: string // falls back to the category label when unset
  category?: CategoryId // CATEGORY budgets only
  icon?: string // CUSTOM budgets: PLAN_ICONS key
  walletIds: string[] // empty = every wallet
  period: BudgetPeriod
  startDate?: string
  endDate?: string
  limit: number
  month: string // YYYY-MM
  assignedCount?: number
}

export interface Product {
  barcode: string
  name: string
  brand: string
  category: CategoryId
  price: number
  unit: string
  imageColor: string // placeholder swatch since we have no real product imagery
}

export type CurrencyCode = string
export type LanguageCode = 'es' | 'en'

export interface User {
  id: string
  name: string
  email: string
  hasPassword: boolean // false for Google-only accounts that haven't set one yet
  passwordChangedAt: string | null
  phone: string
  city: string
  avatarInitials: string
  currency: CurrencyCode
  memberSince: string
  principalCurrency: string
  onboardingCompleted: boolean
  guidesSeen: string[]
  guidesOff: boolean
  isGuest?: boolean
  preferences: {
    theme: 'light' | 'dark' | 'system'
    notifications: boolean
    biometricLogin: boolean
    hideAmounts: boolean
    language: LanguageCode
  }
}

export interface MonthlySummary {
  month: string // "2026-08"
  label: string // "Ago"
  income: number
  expenses: number
  savings: number
}

export interface CategoryBreakdownEntry {
  category: CategoryId
  amount: number
  percentage: number
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}
