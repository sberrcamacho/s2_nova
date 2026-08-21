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
export type RecurrenceInterval = 'weekly' | 'monthly' | 'yearly'

// Set only on transactions representing money lent to, or borrowed from,
// someone else — tracked as outstanding until settled.
export type LoanKind = 'lent' | 'borrowed'

export type WalletType = 'cash' | 'bank' | 'savings' | 'crypto' | 'other'

export interface Wallet {
  id: string
  name: string
  type: WalletType
  initialBalance: number
  currentBalance: number
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
  interval: RecurrenceInterval
  nextOccurrenceDate: string
  isDue: boolean
  active: boolean
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
}

export type CategoryId =
  | 'food'
  | 'transportation'
  | 'shopping'
  | 'health'
  | 'education'
  | 'entertainment'
  | 'bills'
  | 'subscriptions'
  | 'salary'
  | 'freelance'
  | 'other'

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

export interface Transaction {
  id: string
  accountId: string
  transferAccountId?: string // destination wallet, set only when type === 'transfer'
  description: string
  amount: number // always positive; sign implied by `type`
  type: TransactionType
  status?: TransactionStatus // defaults to 'completed'
  category: CategoryId
  date: string // ISO 8601 date, e.g. 2026-08-03
  paymentMethod: PaymentMethod
  merchant?: string
  note?: string
  productId?: string // set when created via barcode scan confirmation
  budgetId?: string // optional — a transaction never has to belong to a budget
  goalId?: string // optional — a transaction never has to belong to a goal
  recurringSeriesId?: string // set when materialized from a RecurringSeries occurrence
  loanKind?: LoanKind
  counterpartyName?: string // Lent/Borrowed only — who the money is with
  dueDate?: string // Lent/Borrowed only — when repayment is expected
  loanSettled?: boolean
  settledByTransactionId?: string // the real repayment transaction, once settled
}

export interface NewTransactionInput {
  accountId: string
  transferAccountId?: string
  description: string
  amount: number
  type: TransactionType
  status?: TransactionStatus
  category: CategoryId
  date: string
  paymentMethod: PaymentMethod
  merchant?: string
  note?: string
  productId?: string
  budgetId?: string
  goalId?: string
  loanKind?: LoanKind
  counterpartyName?: string
  dueDate?: string
}

export interface CategoryBudget {
  id: string
  name?: string // friendly name like "Vacation" — falls back to the category label when unset
  category: CategoryId
  limit: number
  month: string // YYYY-MM
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

export type CurrencyCode = 'COP' | 'USD'
export type LanguageCode = 'es' | 'en'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  city: string
  avatarInitials: string
  currency: CurrencyCode
  memberSince: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    notifications: boolean
    biometricLogin: boolean
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
