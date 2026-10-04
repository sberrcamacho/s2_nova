import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

interface KPICardProps {
  label: string
  value: string
  icon?: ReactNode
  trend?: { value: number; label?: string }
  tone?: 'default' | 'primary'
  className?: string
}

export function KPICard({ label, value, icon, trend, tone = 'default', className }: KPICardProps) {
  const trendPositive = (trend?.value ?? 0) >= 0

  return (
    <Card
      className={cn(
        'flex flex-col gap-3 p-5',
        tone === 'primary' && 'border-primary/25 bg-gradient-to-br from-accent-soft/60 to-surface',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-caption font-semibold uppercase tracking-[0.06em] text-ink-tertiary">{label}</p>
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent-soft text-link">{icon}</span>}
      </div>
      <p className="font-numeric text-headline font-semibold leading-none tracking-tight text-ink">{value}</p>
      {trend && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-[6px] px-1.5 py-0.5 text-caption font-semibold',
              trendPositive ? 'bg-positive-soft text-positive' : 'bg-negative-soft text-negative',
            )}
          >
            {trendPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend.value).toFixed(0)}%
          </span>
          {trend.label && <span className="text-caption font-medium text-ink-tertiary">{trend.label}</span>}
        </div>
      )}
    </Card>
  )
}
