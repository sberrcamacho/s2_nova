import { createContext, useContext } from 'react'
import type { MovementDraft } from '@/components/panels/NewTransactionPanel'
import type { Transaction } from '@/types'

// Opens the "Nuevo movimiento" panel — with a movement, "Editar
// movimiento"; with a draft, a new movement prefilled — from anywhere
// inside the dashboard (DashboardLayout owns it).
export type OpenMovement = (editing?: Transaction, draft?: MovementDraft) => void
export const NewMovementContext = createContext<OpenMovement | null>(null)

export function useNewMovement(): OpenMovement | null {
  return useContext(NewMovementContext)
}
