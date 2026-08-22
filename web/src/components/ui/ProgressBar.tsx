import { cn } from '@/lib/cn'

interface ProgressBarProps {
  value: number // 0-100+
  tone?: 'primary' | 'positive' | 'warning' | 'negative'
  /** Overrides `tone` with an exact color (e.g. a category hex) via inline style, for series where the palette isn't one of the four fixed tones. */
  color?: string
  className?: string
  trackClassName?: string
  label?: string
}

const TONE_CLASSES: Record<string, string> = {
  primary: 'bg-primary',
  positive: 'bg-positive',
  warning: 'bg-warning',
  negative: 'bg-negative',
}

export function ProgressBar({ value, tone = 'primary', color, className, trackClassName, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-bg-secondary', trackClassName)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', !color && TONE_CLASSES[tone], className)}
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  )
}
