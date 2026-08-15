import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string
  variant?: 'default' | 'filled' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const SIZE: Record<string, string> = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }
const VARIANT: Record<string, string> = {
  default: 'bg-surface border border-border text-ink-secondary hover:text-ink hover:border-border-strong',
  filled: 'bg-accent-soft text-primary hover:brightness-105',
  ghost: 'bg-transparent text-ink-secondary hover:bg-bg-secondary hover:text-ink',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = 'default', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40',
        SIZE[size],
        VARIANT[variant],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  ),
)
IconButton.displayName = 'IconButton'
