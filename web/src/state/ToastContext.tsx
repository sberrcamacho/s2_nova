import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  action?: ToastAction
}

interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (message: string, variant?: ToastVariant, action?: ToastAction) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', action?: ToastAction) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      // One toast at a time, 2.6 s each (4.5 s with "Deshacer"), as in the
      // Dashboard v2 mockup's showToast/showUndo.
      setToasts([{ id, message, variant, action }])
      setTimeout(() => dismissToast(id), action ? 4500 : 2600)
    },
    [dismissToast],
  )

  const value = useMemo(() => ({ toasts, showToast, dismissToast }), [toasts, showToast, dismissToast])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
