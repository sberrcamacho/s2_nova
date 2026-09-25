import { createPortal } from 'react-dom'
import { useToast } from '@/state/ToastContext'

// The Dashboard v2 toast: one inverted pill centred above the bottom edge,
// the same for confirmations and errors.
export function ToastViewport() {
  const { toasts } = useToast()
  const toast = toasts[toasts.length - 1]
  if (!toast) return null

  return createPortal(
    <div
      key={toast.id}
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className="fixed bottom-7 left-1/2 z-[200] -translate-x-1/2 rounded-[12px] bg-v2-text px-4 py-[11px] text-[12.5px] font-bold text-v2-bg shadow-[0_12px_32px_rgba(0,0,0,.35)]"
    >
      {toast.message}
    </div>,
    document.body,
  )
}
