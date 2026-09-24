import { useCallback } from 'react'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'
import { userService } from '@/services/userService'

// "Ocultar montos" — the shared `blurBalance` preference (same switch as
// Android's "Difuminar el saldo total"). Optimistic; reverted on failure.
export function useHideAmounts() {
  const { user, updateUser } = useAuth()
  const { showToast } = useToast()
  const hidden = user?.preferences.hideAmounts ?? false

  const toggle = useCallback(() => {
    if (!user) return
    const next = !hidden
    updateUser({ preferences: { ...user.preferences, hideAmounts: next } })
    userService.updatePreferences({ hideAmounts: next }).catch((err) => {
      updateUser({ preferences: { ...user.preferences, hideAmounts: !next } })
      showToast(err instanceof Error ? err.message : 'Algo salió mal. Intenta de nuevo.', 'error')
    })
  }, [user, hidden, updateUser, showToast])

  return { hidden, toggle }
}
