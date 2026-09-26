import { apiClient } from '@/lib/apiClient'
import { categorySlugFor } from '@/lib/backendCategories'
import { todayISO } from '@/lib/date'
import type { CategoryId, LoanKind, TransactionType } from '@/types'

// The shared alert rule set (backend GET /alerts) behind Web's "Alertas"
// grid and Android's alert card + bell. Returned in the backend's priority
// order; ids are stable per underlying condition so a dismissal can be
// remembered locally. Copy lives in the UI (lib/alertCopy.ts).

export type AppAlert =
  | {
      kind: 'series_due'
      id: string
      seriesId: string
      name: string
      type: Exclude<TransactionType, 'transfer'>
      amount: number
      category: CategoryId
      dueDate: string
      overdue: boolean
    }
  | {
      kind: 'loan_open'
      id: string
      transactionId: string
      loanKind: LoanKind
      counterpartyName?: string
      outstanding: number
      dueDate: string
      overdue: boolean
    }
  | {
      kind: 'budget_at_risk'
      id: string
      budgetId: string
      name?: string
      category: CategoryId
      spent: number
      limit: number
      percentage: number
    }
  | {
      kind: 'goal_near'
      id: string
      goalId: string
      name: string
      icon: string
      percentage: number
      remaining: number
    }
  | {
      // "Aporte programado a <meta>" — Confirmar aporte / Omitir esta vez.
      kind: 'goal_plan_due'
      id: string
      goalId: string
      name: string
      icon: string
      amount: number
      currency: string
      accountId: string
      dueDate: string
    }
  | {
      kind: 'goal_plan_auto'
      id: string
      goalId: string
      name: string
      icon: string
      amount: number
      currency: string
      walletName: string
      date: string
    }
  | {
      // A Programado movement dated in the next 7 days.
      kind: 'tx_planned'
      id: string
      transactionId: string
      name: string
      category: CategoryId
      amount: number
      currency: string
      walletName: string
      dueDate: string
    }

interface BackendAlert {
  id: string
  kind: 'SERIES_DUE' | 'LOAN_OPEN' | 'BUDGET_AT_RISK' | 'GOAL_NEAR' | string
  seriesId?: string
  name?: string | null
  type?: 'INCOME' | 'EXPENSE'
  amount?: number
  currency?: string
  accountId?: string
  walletName?: string
  date?: string
  icon?: string
  categoryId?: string
  dueDate?: string
  overdue?: boolean
  transactionId?: string
  loanKind?: 'LENT' | 'BORROWED'
  counterpartyName?: string | null
  outstanding?: number
  budgetId?: string
  spent?: number
  percentage?: number
  goalId?: string
  themeIcon?: string | null
  remaining?: number
}

async function mapAlert(row: BackendAlert): Promise<AppAlert | null> {
  switch (row.kind) {
    case 'SERIES_DUE':
      return {
        kind: 'series_due',
        id: row.id,
        seriesId: row.seriesId!,
        name: row.name ?? '',
        type: row.type === 'INCOME' ? 'income' : 'expense',
        amount: row.amount ?? 0,
        category: await categorySlugFor(row.categoryId!),
        dueDate: row.dueDate!.slice(0, 10),
        overdue: row.overdue ?? false,
      }
    case 'LOAN_OPEN':
      return {
        kind: 'loan_open',
        id: row.id,
        transactionId: row.transactionId!,
        loanKind: row.loanKind === 'BORROWED' ? 'borrowed' : 'lent',
        counterpartyName: row.counterpartyName ?? undefined,
        outstanding: row.outstanding ?? 0,
        dueDate: row.dueDate!.slice(0, 10),
        overdue: row.overdue ?? false,
      }
    case 'BUDGET_AT_RISK':
      return {
        kind: 'budget_at_risk',
        id: row.id,
        budgetId: row.budgetId!,
        name: row.name ?? undefined,
        category: await categorySlugFor(row.categoryId!),
        spent: row.spent ?? 0,
        limit: row.amount ?? 0,
        percentage: row.percentage ?? 0,
      }
    case 'GOAL_NEAR':
      return {
        kind: 'goal_near',
        id: row.id,
        goalId: row.goalId!,
        name: row.name ?? '',
        icon: row.icon ?? 'other',
        percentage: row.percentage ?? 0,
        remaining: row.remaining ?? 0,
      }
    case 'GOAL_PLAN_DUE':
      return {
        kind: 'goal_plan_due',
        id: row.id,
        goalId: row.goalId!,
        name: row.name ?? '',
        icon: row.icon ?? 'other',
        amount: row.amount ?? 0,
        currency: row.currency ?? 'COP',
        accountId: row.accountId!,
        dueDate: row.dueDate!.slice(0, 10),
      }
    case 'GOAL_PLAN_AUTO':
      return {
        kind: 'goal_plan_auto',
        id: row.id,
        goalId: row.goalId!,
        name: row.name ?? '',
        icon: row.icon ?? 'other',
        amount: row.amount ?? 0,
        currency: row.currency ?? 'COP',
        walletName: row.walletName ?? '',
        date: row.date!.slice(0, 10),
      }
    case 'TX_PLANNED':
      return {
        kind: 'tx_planned',
        id: row.id,
        transactionId: row.transactionId!,
        name: row.name ?? '',
        category: await categorySlugFor(row.categoryId),
        amount: row.amount ?? 0,
        currency: row.currency ?? 'COP',
        walletName: row.walletName ?? '',
        dueDate: row.dueDate!.slice(0, 10),
      }
    default:
      // A rule added server-side before this client knows how to show it.
      return null
  }
}

export const alertService = {
  async getAlerts(today: string = todayISO()): Promise<AppAlert[]> {
    const rows = await apiClient.get<BackendAlert[]>(`/alerts?today=${today}`)
    const alerts = await Promise.all(rows.map(mapAlert))
    return alerts.filter((a): a is AppAlert => a !== null)
  },
}
