import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axisTickStyle, chartColors } from '@/components/charts/chartTheme'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { useCurrency } from '@/state/useCurrency'

interface Series {
  key: string
  label: string
  color: string
}

interface NovaBarChartProps {
  data: Record<string, string | number>[]
  xKey: string
  series: Series[]
  height?: number
  radius?: number
  /** Per-bar color override for a single-series chart (e.g. highlighting the current month) — falls back to the series color. */
  colorForIndex?: (index: number) => string
}

export function NovaBarChart({ data, xKey, series, height = 260, radius = 6, colorForIndex }: NovaBarChartProps) {
  const { formatCompact } = useCurrency()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={6}>
        <CartesianGrid vertical={false} stroke={chartColors.grid} />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={axisTickStyle} dy={8} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={axisTickStyle}
          tickFormatter={(v) => formatCompact(v)}
          width={54}
        />
        <Tooltip
          content={<ChartTooltip formatter={(value, name) => [formatCompact(value), name]} />}
          cursor={{ fill: 'var(--color-bg-secondary)' }}
        />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[radius, radius, 0, 0]} maxBarSize={36}>
            {colorForIndex && data.map((_, i) => <Cell key={i} fill={colorForIndex(i)} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
