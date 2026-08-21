import { transactions as seedTransactions } from '@/data/transactions'
import { delay } from '@/lib/async'
import { generateId } from '@/lib/id'
import { isSameMonth } from '@/lib/date'
import { accountService } from '@/services/accountService'
import { goalService } from '@/services/goalService'
import type { NewTransactionInput, Transaction } from '@/types'

// direction 1 applies a transaction's effect on wallet balances, -1
// reverses it — mirrors backend/src/routes/transactions.ts's
// applyBalanceEffect. A 'planned' ("Upcoming") transaction never calls
// this, same rule as the backend.
function applyBalanceEffect(transaction: Transaction, direction: 1 | -1) {
  if (transaction.status === 'planned') return
  const signed = direction * transaction.amount
  if (transaction.type === 'expense') {
    accountService._applyBalanceDelta(transaction.accountId, -signed)
  } else if (transaction.type === 'income') {
    accountService._applyBalanceDelta(transaction.accountId, signed)
  } else {
    accountService._applyBalanceDelta(transaction.accountId, -signed)
    if (transaction.transferAccountId) accountService._applyBalanceDelta(transaction.transferAccountId, signed)
  }
  if (transaction.goalId && direction === 1) goalService._applyContribution(transaction.goalId, transaction.amount)
}

// In-memory store seeded from mock data. A real implementation would swap
// this module for one backed by fetch()/axios calls to a REST API — every
// other layer (state, components) only talks to the exported functions
// below, so the swap is transparent to the rest of the app.
let store: Transaction[] = [...seedTransactions]

export interface TransactionFilters {
  search?: string
  category?: string
  type?: 'income' | 'expense' | 'all'
  paymentMethod?: string
  monthKey?: string // YYYY-MM
  dateFrom?: string
  dateTo?: string
}

function applyFilters(items: Transaction[], filters?: TransactionFilters): Transaction[] {
  if (!filters) return items
  return items.filter((t) => {
    if (filters.type && filters.type !== 'all' && t.type !== filters.type) return false
    if (filters.category && filters.category !== 'all' && t.category !== filters.category) return false
    if (filters.paymentMethod && filters.paymentMethod !== 'all' && t.paymentMethod !== filters.paymentMethod) return false
    if (filters.monthKey && !isSameMonth(t.date, filters.monthKey)) return false
    if (filters.dateFrom && t.date < filters.dateFrom) return false
    if (filters.dateTo && t.date > filters.dateTo) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const haystack = `${t.description} ${t.merchant ?? ''} ${t.category}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

function sorted(items: Transaction[]): Transaction[] {
  return [...items].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export const transactionService = {
  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    return delay(sorted(applyFilters(store, filters)))
  },

  async getTransactionById(id: string): Promise<Transaction | undefined> {
    return delay(store.find((t) => t.id === id))
  },

  async getRecentTransactions(limit = 5): Promise<Transaction[]> {
    return delay(sorted(store).slice(0, limit))
  },

  async addTransaction(input: NewTransactionInput): Promise<Transaction> {
    const transaction: Transaction = { id: generateId('txn'), status: 'completed', ...input }
    store = [transaction, ...store]
    applyBalanceEffect(transaction, 1)
    return delay(transaction, 380)
  },

  async updateTransaction(id: string, patch: Partial<NewTransactionInput>): Promise<Transaction | undefined> {
    let updated: Transaction | undefined
    store = store.map((t) => {
      if (t.id !== id) return t
      updated = { ...t, ...patch }
      return updated
    })
    return delay(updated, 300)
  },

  // Synchronous escape hatch for derived calculations elsewhere in the mock
  // layer (analyticsService, budgetService) that need the current snapshot
  // without re-awaiting a network delay.
  _snapshot(): Transaction[] {
    return store
  },
}
