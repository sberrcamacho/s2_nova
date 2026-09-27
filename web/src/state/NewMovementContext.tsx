import { createContext, useContext } from 'react'
import type { Transaction } from '@/types'

// Opens the "Nuevo movimiento" panel — or, with a movement, "Editar
// movimiento" — from anywhere inside the dashboard (DashboardLayout owns it).
export const NewMovementContext = createContext<((editing?: Transaction) => void) | null>(null)

export function useNewMovement(): ((editing?: Transaction) => void) | null {
  return useContext(NewMovementContext)
}
