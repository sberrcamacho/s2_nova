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
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-tertiary">{label}</p>
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-primary">{icon}</span>}
      </div>
      <p className="font-numeric text-[26px] font-extrabold leading-none tracking-tight text-ink">{value}</p>
      {trend && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold',
              trendPositive ? 'bg-positive-soft text-positive' : 'bg-negative-soft text-negative',
            )}
          >
            {trendPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend.value).toFixed(0)}%
          </span>
          {trend.label && <span className="text-xs font-medium text-ink-tertiary">{trend.label}</span>}
        </div>
      )}
    </Card>
  )
}
