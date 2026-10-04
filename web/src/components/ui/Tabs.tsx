import { cn } from '@/lib/cn'

interface TabOption {
  value: string
  label: string
  count?: number
}

interface TabsProps {
  options: TabOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ options, value, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn('scrollbar-none flex items-center gap-1 overflow-x-auto rounded-[12px] border border-border bg-bg-secondary p-1', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3.5 py-1.5 text-label font-semibold transition-all duration-150',
              active ? 'bg-primary text-on-primary shadow-[var(--shadow-primary)]' : 'text-ink-secondary hover:text-ink',
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  'rounded-[6px] px-1.5 py-px text-caption font-semibold',
                  active ? 'bg-white/20' : 'bg-surface text-ink-tertiary',
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
