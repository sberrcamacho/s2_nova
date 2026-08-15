import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] px-6 py-14 text-center', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-primary">{icon}</div>
      <div>
        <p className="text-sm font-bold text-ink">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-xs text-[13px] text-ink-secondary">{description}</p>}
      </div>
      {action}
    </div>
  )
}
