import { apiClient } from '@/lib/apiClient'
import { categoryIdFor, categorySlugFor } from '@/lib/backendCategories'
import type { LoanKind, NewTransactionInput, PaymentMethod, Transaction, TransactionStatus, TransactionType } from '@/types'

interface BackendTransaction {
  id: string
  accountId: string
  transferToAccountId: string | null
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  status: 'COMPLETED' | 'PLANNED'
  amount: number
  categoryId: string
  productId: string | null
  budgetId: string | null
  goalId: string | null
  recurringSeriesId: string | null
  loanKind: 'LENT' | 'BORROWED' | null
  counterpartyName: string | null
  dueDate: string | null
  loanSettledAt: string | null
  settledByTransactionId: string | null
  paymentMethod: string
  description: string
  merchant: string | null
  note: string | null
  date: string
}

async function mapTransaction(row: BackendTransaction): Promise<Transaction> {
  return {
    id: row.id,
    accountId: row.accountId,
    transferAccountId: row.transferToAccountId ?? undefined,
    description: row.description,
    amount: row.amount,
    type: row.type.toLowerCase() as TransactionType,
    status: row.status.toLowerCase() as TransactionStatus,
    category: await categorySlugFor(row.categoryId),
    date: row.date.slice(0, 10),
    paymentMethod: row.paymentMethod.toLowerCase() as PaymentMethod,
    merchant: row.merchant ?? undefined,
    note: row.note ?? undefined,
    productId: row.productId ?? undefined,
    budgetId: row.budgetId ?? undefined,
    goalId: row.goalId ?? undefined,
    recurringSeriesId: row.recurringSeriesId ?? undefined,
    loanKind: (row.loanKind?.toLowerCase() as LoanKind | undefined) ?? undefined,
    counterpartyName: row.counterpartyName ?? undefined,
    dueDate: row.dueDate?.slice(0, 10),
    loanSettled: row.loanSettledAt !== null,
    settledByTransactionId: row.settledByTransactionId ?? undefined,
  }
}

function monthRange(monthKey: string): { from: string; to: string } {
  const [year, month] = monthKey.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return { from: `${monthKey}-01`, to: `${monthKey}-${String(lastDay).padStart(2, '0')}` }
}

export interface TransactionFilters {
  search?: string
  category?: string
  type?: 'income' | 'expense' | 'all'
  paymentMethod?: string
  monthKey?: string // YYYY-MM
  dateFrom?: string
  dateTo?: string
}

async function buildQuery(filters?: TransactionFilters): Promise<string> {
  const params = new URLSearchParams()
  params.set('limit', '200')

  if (filters?.type && filters.type !== 'all') params.set('type', filters.type.toUpperCase())
  if (filters?.category && filters.category !== 'all') {
    params.set('categoryId', await categoryIdFor(filters.category as Parameters<typeof categoryIdFor>[0]))
  }

  const explicitRange = filters?.dateFrom || filters?.dateTo
  if (explicitRange) {
    if (filters?.dateFrom) params.set('from', filters.dateFrom)
    if (filters?.dateTo) params.set('to', filters.dateTo)
  } else if (filters?.monthKey) {
    const { from, to } = monthRange(filters.monthKey)
    params.set('from', from)
    params.set('to', to)
  }

  if (filters?.search) params.set('search', filters.search)

  return params.toString()
}

// Cached snapshot of the last unfiltered fetch — analyticsService and
// insightsService (Web-exclusive business logic layered on top of already-
// fetched data) read this synchronously rather than re-awaiting a network
// call for every derived stat. Only getTransactions()'s unfiltered call
// updates it, so a narrowed/filtered fetch never overwrites it with a
// partial view (nothing currently calls getTransactions with filters —
// TransactionsPage filters client-side over AppDataContext's full list —
// but the guard keeps this correct if that changes).
let cache: Transaction[] = []

export const transactionService = {
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    const query = await buildQuery(filters)
    const rows = await apiClient.get<BackendTransaction[]>(`/transactions?${query}`)
    let transactions = await Promise.all(rows.map(mapTransaction))

    // paymentMethod has no server-side filter — narrow client-side.
    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      transactions = transactions.filter((t) => t.paymentMethod === filters.paymentMethod)
    }

    if (!filters) cache = transactions
    return transactions
  },

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    const cached = cache.find((t) => t.id === id)
    if (cached) return cached
    const all = await transactionService.getTransactions()
    return all.find((t) => t.id === id)
  },

  async getRecentTransactions(limit = 5): Promise<Transaction[]> {
    const rows = await apiClient.get<BackendTransaction[]>(`/transactions?limit=${limit}`)
    return Promise.all(rows.map(mapTransaction))
  },

  async addTransaction(input: NewTransactionInput): Promise<Transaction> {
    const body = {
      accountId: input.accountId,
      transferToAccountId: input.transferAccountId,
      type: input.type.toUpperCase(),
      status: (input.status ?? 'completed').toUpperCase(),
      amount: input.amount,
      categoryId: await categoryIdFor(input.category),
      productId: input.productId,
      budgetId: input.budgetId,
      goalId: input.goalId,
      loanKind: input.loanKind?.toUpperCase(),
      counterpartyName: input.counterpartyName,
      dueDate: input.dueDate,
      description: input.description,
      merchant: input.merchant,
      note: input.note,
      date: input.date,
    }
    const row = await apiClient.post<BackendTransaction>('/transactions', body)
    return mapTransaction(row)
  },

  async updateTransaction(id: string, patch: Partial<NewTransactionInput>): Promise<Transaction | undefined> {
    const body: Record<string, unknown> = {
      amount: patch.amount,
      status: patch.status?.toUpperCase(),
      description: patch.description,
      merchant: patch.merchant,
      note: patch.note,
      date: patch.date,
      productId: patch.productId,
      budgetId: patch.budgetId,
      goalId: patch.goalId,
      counterpartyName: patch.counterpartyName,
      dueDate: patch.dueDate,
    }
    if (patch.category) body.categoryId = await categoryIdFor(patch.category)
    const row = await apiClient.patch<BackendTransaction>(`/transactions/${id}`, body)
    return mapTransaction(row)
  },

  // Synchronous escape hatch for analyticsService/insightsService — see the
  // `cache` doc comment above.
  _snapshot(): Transaction[] {
    return cache
  },
}
