import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axisTickStyle, chartColors } from '@/components/charts/chartTheme'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { useCurrency } from '@/state/useCurrency'

interface Series {
  key: string
  label: string
  color: string
}

interface NovaLineChartProps {
  data: Record<string, string | number>[]
  xKey: string
  series: Series[]
  height?: number
}

export function NovaLineChart({ data, xKey, series, height = 260 }: NovaLineChartProps) {
  const { formatCompact } = useCurrency()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
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
          cursor={{ stroke: chartColors.grid, strokeWidth: 1 }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2.75}
            dot={{ r: 3, strokeWidth: 0, fill: s.color }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
