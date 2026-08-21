import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { budgetService, type BudgetProgress } from '@/services/budgetService'
import { transactionService } from '@/services/transactionService'
import type { NewTransactionInput, Transaction } from '@/types'

interface AppDataContextValue {
  transactions: Transaction[]
  budgets: BudgetProgress[]
  isLoading: boolean
  addTransaction: (input: NewTransactionInput) => Promise<Transaction>
  refresh: () => Promise<void>
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<BudgetProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    const [txns, budgetProgress] = await Promise.all([
      transactionService.getTransactions(),
      budgetService.getBudgets(),
    ])
    setTransactions(txns)
    setBudgets(budgetProgress)
  }, [])

  useEffect(() => {
    setIsLoading(true)
    load().finally(() => setIsLoading(false))
  }, [load])

  const value = useMemo<AppDataContextValue>(
    () => ({
      transactions,
      budgets,
      isLoading,
      refresh: load,
      addTransaction: async (input) => {
        const created = await transactionService.addTransaction(input)
        const [txns, budgetProgress] = await Promise.all([
          transactionService.getTransactions(),
          budgetService.getBudgets(),
        ])
        setTransactions(txns)
        setBudgets(budgetProgress)
        return created
      },
    }),
    [transactions, budgets, isLoading, load],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider')
  return ctx
}
