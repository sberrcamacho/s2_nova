import { apiClient } from '@/lib/apiClient'
import { categoryIdFor, categoryWireIds, movementCategory } from '@/lib/backendCategories'
import type { AttachmentMeta, CounterpartyKind, LoanKind, NewTransactionInput, PaymentMethod, Transaction, TransactionStatus, TransactionType } from '@/types'

interface BackendTransaction {
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
  outstanding: number | null
  paymentMethod: string
  description: string
  merchant: string | null
  note: string | null
  date: string
  occurredAt: string | null
  attachment: { id: string; kind: 'IMAGE' | 'PDF'; mime: string; name: string; size: number; createdAt: string } | null
}

export function mapAttachment(a: NonNullable<BackendTransaction['attachment']>): AttachmentMeta {
  return { id: a.id, kind: a.kind === 'PDF' ? 'pdf' : 'image', mime: a.mime, name: a.name, size: a.size, createdAt: a.createdAt }
}

async function mapTransaction(row: BackendTransaction): Promise<Transaction> {
  return {
    id: row.id,
    accountId: row.accountId,
    transferAccountId: row.transferToAccountId ?? undefined,
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    fxRate: row.fxRate ?? undefined,
    walletAmount: row.walletAmount ?? undefined,
    type: row.type.toLowerCase() as TransactionType,
    status: row.status.toLowerCase() as TransactionStatus,
    category: await movementCategory(row.categoryId, row.subcategoryId, row.type),
    date: row.date.slice(0, 10),
    // occurredAt carries the local wall-clock time with a "Z" suffix.
    time: row.occurredAt ? row.occurredAt.slice(11, 16) : '12:00',
    paymentMethod: row.paymentMethod.toLowerCase() as PaymentMethod,
    merchant: row.merchant ?? undefined,
    note: row.note ?? undefined,
    productId: row.productId ?? undefined,
    budgetId: row.budgetId ?? undefined,
    customBudgetId: row.customBudgetId ?? undefined,
    goalId: row.goalId ?? undefined,
    recurringSeriesId: row.recurringSeriesId ?? undefined,
    loanKind: (row.loanKind?.toLowerCase() as LoanKind | undefined) ?? undefined,
    counterpartyName: row.counterpartyName ?? undefined,
    counterpartyKind: (row.counterpartyKind?.toLowerCase() as CounterpartyKind | undefined) ?? undefined,
    attachment: row.attachment ? mapAttachment(row.attachment) : undefined,
    dueDate: row.dueDate?.slice(0, 10),
    loanSettled: row.loanSettledAt !== null,
    settledByTransactionId: row.settledByTransactionId ?? undefined,
    parentLoanId: row.parentLoanId ?? undefined,
    outstanding: row.outstanding ?? undefined,
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

// Cached snapshot of the last unfiltered fetch, so getTransaction() can
// answer from memory. Only getTransactions()'s unfiltered call
// updates it, so a narrowed/filtered fetch never overwrites it with a
// partial view (nothing currently calls getTransactions with filters —
// Movimientos loads its month through getMonth — but the guard keeps this
// correct if that changes).
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

  // Every movement dated in one month (Movimientos' period), newest first.
  // Pages through the list endpoint's 200-row limit, so a busy month is
  // never silently cut off.
  async getMonth(monthKey: string): Promise<Transaction[]> {
    const { from, to } = monthRange(monthKey)
    const rows: BackendTransaction[] = []
    for (let offset = 0; ; offset += 200) {
      const page = await apiClient.get<BackendTransaction[]>(`/transactions?from=${from}&to=${to}&limit=200&offset=${offset}`)
      rows.push(...page)
      if (page.length < 200) break
    }
    return Promise.all(rows.map(mapTransaction))
  },

  // The backend reverses the balance effect before deleting. `stopSeries`
  // also ends the movement's Programado (NEW_MOVEMENT.md §9).
  async deleteTransaction(id: string, stopSeries = false): Promise<void> {
    await apiClient.delete(`/transactions/${id}${stopSeries ? '?series=delete' : ''}`)
  },

  async getTransaction(id: string): Promise<Transaction> {
    return mapTransaction(await apiClient.get<BackendTransaction>(`/transactions/${id}`))
  },

  // Receipts (NEW_MOVEMENT.md §7): one per movement, base64 over JSON.
  async uploadAttachment(id: string, file: File): Promise<AttachmentMeta> {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    const row = await apiClient.put<NonNullable<BackendTransaction['attachment']>>(`/transactions/${id}/attachment`, { name: file.name, mime: file.type, data })
    return mapAttachment(row)
  },

  async attachmentBlob(id: string): Promise<Blob> {
    return (await apiClient.download(`/transactions/${id}/attachment`)).data
  },

  async deleteAttachment(id: string): Promise<void> {
    await apiClient.delete(`/transactions/${id}/attachment`)
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
      // Omitted: the backend saves a future date/time as PLANNED.
      status: input.status?.toUpperCase(),
      amount: input.amount,
      currency: input.currency,
      ...(input.type !== 'transfer' && input.category ? await categoryWireIds(input.category) : {}),
      productId: input.productId,
      budgetId: input.budgetId,
      customBudgetId: input.customBudgetId,
      goalId: input.goalId,
      loanKind: input.loanKind?.toUpperCase(),
      counterpartyName: input.counterpartyName,
      counterpartyKind: input.counterpartyKind?.toUpperCase(),
      dueDate: input.dueDate,
      description: input.description,
      merchant: input.merchant,
      note: input.note,
      date: input.date,
      time: input.time,
      repeat: input.repeat && { ...input.repeat, interval: input.repeat.interval.toUpperCase() },
    }
    const row = await apiClient.post<BackendTransaction>('/transactions', body)
    return mapTransaction(row)
  },

  async updateTransaction(id: string, patch: Partial<NewTransactionInput>): Promise<Transaction | undefined> {
    const body: Record<string, unknown> = {
      amount: patch.amount,
      currency: patch.currency,
      time: patch.time,
      customBudgetId: patch.customBudgetId,
      counterpartyKind: patch.counterpartyKind?.toUpperCase(),
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
    if (patch.category && patch.category !== 'transfer') {
      const wire = await categoryWireIds(patch.category)
      body.categoryId = wire.categoryId
      body.subcategoryId = wire.subcategoryId ?? null
    }
    const row = await apiClient.patch<BackendTransaction>(`/transactions/${id}`, body)
    return mapTransaction(row)
  },

  // Loan edits (Android's loan sheet): the wallet, the direction (which
  // flips the type server-side), the counterparty, amount and due date.
  async updateLoan(id: string, input: { amount: number; accountId: string; loanKind: LoanKind; counterpartyName: string; dueDate: string | null }): Promise<void> {
    await apiClient.patch(`/transactions/${id}`, { ...input, loanKind: input.loanKind.toUpperCase() })
  },

  // Every open or settled loan of both kinds, newest first. Pending balances
  // come from the server (`outstanding`), never from summing abonos here.
  async getLoans(): Promise<Transaction[]> {
    const [lent, borrowed] = await Promise.all([
      apiClient.get<BackendTransaction[]>('/transactions?loanKind=LENT&limit=200'),
      apiClient.get<BackendTransaction[]>('/transactions?loanKind=BORROWED&limit=200'),
    ])
    const loans = await Promise.all([...lent, ...borrowed].map(mapTransaction))
    return loans.sort((a, b) => (a.date < b.date ? 1 : -1))
  },

  // Records an abono (partial or final) — see backend settle-loan.
  async settleLoan(id: string, input: { amount: number; accountId: string; date: string }): Promise<void> {
    await apiClient.post(`/transactions/${id}/settle-loan`, input)
  },
}
