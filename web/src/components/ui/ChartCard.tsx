import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function ChartCard({ title, subtitle, action, children, className, bodyClassName }: ChartCardProps) {
  return (
    <Card className={cn('p-5 sm:p-6', className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-body-sm font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-caption font-medium text-ink-tertiary">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </Card>
  )
}
