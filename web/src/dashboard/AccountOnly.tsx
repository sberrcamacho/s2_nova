import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/state/AuthContext'

// Pages that change the account itself (profile, password, reset, delete):
// the example account of guest mode has none of them, so it goes back to
// Ajustes, which explains why and offers "Crear cuenta".
export function AccountOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.isGuest) return <Navigate to="/ajustes" replace />
  return <>{children}</>
}
