import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'primary' | 'positive' | 'negative' | 'warning' | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  icon?: ReactNode
}

const TONE_CLASSES: Record<Tone, string> = {
  primary: 'bg-accent-soft text-primary',
  positive: 'bg-positive-soft text-positive',
  negative: 'bg-negative-soft text-negative',
  warning: 'bg-warning-soft text-warning',
  neutral: 'bg-bg-secondary text-ink-secondary',
}

export function Badge({ tone = 'neutral', icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  )
}
