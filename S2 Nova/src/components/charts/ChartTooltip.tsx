interface TooltipPayloadEntry {
  name?: string
  value?: number
  color?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  formatter?: (value: number, name: string) => [string, string]
}

export function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-surface-elevated px-3.5 py-2.5 shadow-[var(--shadow-md)]">
      {label && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-tertiary">{label}</p>}
      <div className="flex flex-col gap-1">
        {payload.map((entry) => {
          const rawValue = entry.value ?? 0
          const rawName = entry.name ?? ''
          const [value, name] = formatter ? formatter(rawValue, rawName) : [String(rawValue), rawName]
          return (
            <div key={rawName} className="flex items-center gap-2 text-[12.5px]">
              <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
              <span className="font-medium text-ink-secondary">{name}</span>
              <span className="font-numeric ml-auto font-bold text-ink">{value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
