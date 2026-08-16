import { createPortal } from 'react-dom'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useToast } from '@/state/ToastContext'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'

const ICONS = {
  success: <CheckCircle2 className="h-4.5 w-4.5 text-positive" />,
  error: <TriangleAlert className="h-4.5 w-4.5 text-negative" />,
  info: <Info className="h-4.5 w-4.5 text-primary" />,
}

export function ToastViewport() {
  const { toasts, dismissToast } = useToast()
  const { t } = useTranslation()

  if (toasts.length === 0) return null

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4 sm:top-5">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface-elevated px-4 py-3 shadow-[var(--shadow-lg)]',
          )}
        >
          {ICONS[toast.variant]}
          <p className="flex-1 text-[13px] font-semibold text-ink">{toast.message}</p>
          <button
            aria-label={t('common.dismissNotification')}
            onClick={() => dismissToast(toast.id)}
            className="text-ink-tertiary transition-colors hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
