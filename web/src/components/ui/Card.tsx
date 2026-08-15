import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  interactive?: boolean
}

export function Card({ elevated, interactive, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-xs)]',
        elevated ? 'bg-surface-elevated' : 'bg-surface',
        interactive && 'cursor-pointer transition-all duration-150 hover:border-border-strong hover:shadow-[var(--shadow-sm)] active:scale-[0.995]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
