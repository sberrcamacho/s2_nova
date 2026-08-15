// Domain types shared across services, state, and UI. Keeping these
// independent of any mock-data shape makes it straightforward to swap the
// mock services for real API clients later without touching components.

export type TransactionType = 'income' | 'expense'

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
  description: string
  amount: number // always positive; sign implied by `type`
  type: TransactionType
  category: CategoryId
  date: string // ISO 8601 date, e.g. 2026-08-03
  paymentMethod: PaymentMethod
  merchant?: string
  note?: string
  productId?: string // set when created via barcode scan confirmation
}

export interface NewTransactionInput {
  description: string
  amount: number
  type: TransactionType
  category: CategoryId
  date: string
  paymentMethod: PaymentMethod
  merchant?: string
  note?: string
  productId?: string
}

export interface CategoryBudget {
  id: string
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
