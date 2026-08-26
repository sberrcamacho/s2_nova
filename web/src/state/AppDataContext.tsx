import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { budgetService, type BudgetProgress } from '@/services/budgetService'
import { transactionService } from '@/services/transactionService'
import { useAuth } from '@/state/AuthContext'
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
  const { isAuthenticated } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<BudgetProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    const [txns, budgetProgress] = await Promise.all([transactionService.getTransactions(), budgetService.getBudgets()])
    setTransactions(txns)
    setBudgets(budgetProgress)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      // Logged out (or not yet authenticated) — no session to fetch with,
      // and any previously loaded data belongs to whoever was signed in
      // before, so it shouldn't linger for the next person to sign in on
      // this browser.
      setTransactions([])
      setBudgets([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    load().finally(() => setIsLoading(false))
  }, [isAuthenticated, load])

  const value = useMemo<AppDataContextValue>(
    () => ({
      transactions,
      budgets,
      isLoading,
      refresh: load,
      addTransaction: async (input) => {
        const created = await transactionService.addTransaction(input)
        const [txns, budgetProgress] = await Promise.all([transactionService.getTransactions(), budgetService.getBudgets()])
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
