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
      className={cn('scrollbar-none flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-bg-secondary p-1', className)}
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
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-150',
              active ? 'bg-primary text-on-primary shadow-[var(--shadow-primary)]' : 'text-ink-secondary hover:text-ink',
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-[11px] font-bold',
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
