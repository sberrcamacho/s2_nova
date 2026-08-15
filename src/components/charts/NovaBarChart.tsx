import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axisTickStyle, chartColors } from '@/components/charts/chartTheme'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { formatCOPCompact } from '@/lib/currency'

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
}

export function NovaBarChart({ data, xKey, series, height = 260, radius = 6 }: NovaBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={6}>
        <CartesianGrid vertical={false} stroke={chartColors.grid} />
        <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={axisTickStyle} dy={8} />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={axisTickStyle}
          tickFormatter={(v) => formatCOPCompact(v)}
          width={54}
        />
        <Tooltip
          content={<ChartTooltip formatter={(value, name) => [formatCOPCompact(value), name]} />}
          cursor={{ fill: 'var(--color-bg-secondary)' }}
        />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[radius, radius, 0, 0]} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
