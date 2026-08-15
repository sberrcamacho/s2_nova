import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axisTickStyle, chartColors } from '@/components/charts/chartTheme'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { formatCOPCompact } from '@/lib/currency'

interface Series {
  key: string
  label: string
  color: string
}

interface NovaAreaChartProps {
  data: Record<string, string | number>[]
  xKey: string
  series: Series[]
  height?: number
}

export function NovaAreaChart({ data, xKey, series, height = 260 }: NovaAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={chartColors.grid} strokeDasharray="0" />
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
          cursor={{ stroke: chartColors.grid, strokeWidth: 1 }}
        />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2.5}
            fill={`url(#fill-${s.key})`}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
