import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { useTranslation } from '@/state/useTranslation'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  footer?: ReactNode
}

const SIZE_CLASSES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, description, children, size = 'md', footer }: ModalProps) {
  const { t } = useTranslation()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-[var(--color-overlay)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn(
          'relative w-full animate-fade-in rounded-[var(--radius-lg)] border border-border bg-surface-elevated p-6 shadow-[var(--shadow-lg)]',
          SIZE_CLASSES[size],
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 id="modal-title" className="text-lg font-bold text-ink">
                {title}
              </h2>
            )}
            {description && <p className="mt-1 text-sm text-ink-secondary">{description}</p>}
          </div>
          <IconButton icon={<X className="h-4 w-4" />} label={t('common.close')} variant="ghost" size="sm" onClick={onClose} />
        </div>
        {children}
        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
