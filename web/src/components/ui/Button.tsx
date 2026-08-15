import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-primary text-on-primary hover:brightness-110 active:brightness-95 shadow-[var(--shadow-primary)] disabled:shadow-none',
  secondary: 'bg-surface text-ink border border-border hover:bg-bg-secondary active:bg-border/40',
  outline: 'bg-transparent text-primary border border-primary/40 hover:bg-accent-soft active:bg-accent-soft/70',
  ghost: 'bg-transparent text-ink-secondary hover:bg-bg-secondary hover:text-ink',
  danger: 'bg-negative-soft text-negative border border-negative/20 hover:bg-negative/20',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-[var(--radius-sm)]',
  md: 'h-11 px-5 text-sm gap-2 rounded-[var(--radius-md)]',
  lg: 'h-13 px-6 text-[15px] gap-2 rounded-[var(--radius-md)]',
  icon: 'h-10 w-10 rounded-[var(--radius-md)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', fullWidth, loading, leftIcon, rightIcon, className, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-all duration-150 ease-out',
          'disabled:cursor-not-allowed disabled:opacity-45',
          'active:scale-[0.98]',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0 items-center">{leftIcon}</span>
        )}
        {size !== 'icon' && children}
        {!loading && rightIcon && <span className="inline-flex shrink-0 items-center">{rightIcon}</span>}
      </button>
    )
  },
)
Button.displayName = 'Button'
