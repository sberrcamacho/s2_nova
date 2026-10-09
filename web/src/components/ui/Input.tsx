import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    const errorId = error ? `${inputId}-error` : undefined

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-label font-semibold text-ink-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={errorId}
            className={cn(
              'h-11 w-full rounded-[var(--radius-md)] border bg-surface px-3.5 text-body font-medium min-[760px]:text-body-sm text-ink placeholder:text-ink-tertiary',
              'transition-colors duration-150 focus:border-v2-accent-line focus:outline-none focus:ring-2 focus:ring-focus/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-negative focus:border-negative focus:ring-negative/15' : 'border-border-input',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary">{rightIcon}</span>
          )}
        </div>
        {error ? (
          <p id={errorId} role="alert" className="mt-1.5 text-caption font-medium text-negative">
            {error}
          </p>
        ) : hint ? (
          <p className="mt-1.5 text-caption text-ink-tertiary">{hint}</p>
        ) : null}
      </div>
    )
  },
)
Input.displayName = 'Input'
