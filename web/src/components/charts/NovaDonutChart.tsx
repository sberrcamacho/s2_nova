import { Cell, Pie, PieChart, Tooltip } from 'recharts'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { useCurrency } from '@/state/useCurrency'

interface DonutSlice {
  name: string
  value: number
  color: string
}

interface NovaDonutChartProps {
  data: DonutSlice[]
  height?: number
  width?: number
  centerLabel?: string
  centerValue?: string
}

// width defaults to height (the chart is a circle) and is set explicitly —
// ResponsiveContainer measures the parent's clientWidth, which is 0 when
// this sits inside a flex row without a sizing basis, so the ring silently
// fails to render unless we pin the width ourselves.
export function NovaDonutChart({ data, height = 240, width, centerLabel, centerValue }: NovaDonutChartProps) {
  const boxWidth = width ?? height
  const { format } = useCurrency()
  return (
    <div className="relative shrink-0" style={{ height, width: boxWidth }}>
      <PieChart width={boxWidth} height={height}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="62%"
          outerRadius="98%"
          paddingAngle={3}
          cornerRadius={6}
          stroke="none"
        >
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip formatter={(value, name) => [format(value), name]} />} />
      </PieChart>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <p className="font-numeric text-xl font-extrabold text-ink">{centerValue}</p>}
          {centerLabel && <p className="text-[11px] font-semibold text-ink-tertiary">{centerLabel}</p>}
        </div>
      )}
    </div>
  )
}
