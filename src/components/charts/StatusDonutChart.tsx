import './chartSetup'
import { Doughnut } from 'react-chartjs-2'
import type { ChartData, ChartOptions } from 'chart.js'
import { useChartTheme } from './chartTheme'

export interface DonutSlice {
  /** Status code (COMPLETED, OVERDUE, …) — drives the colour. */
  status: string
  /** Display label; defaults to the prettified status. */
  label?: string
  value: number
}

interface StatusDonutChartProps {
  slices: DonutSlice[]
  height?: number
  /** Centre caption under the total. */
  centerLabel?: string
  /** Called with the clicked status (drill-down). */
  onSelect?: (status: string) => void
}

const pretty = (status: string): string =>
  status
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

/**
 * StatusDonutChart — status distribution with the total in the centre.
 * Slices use the same status colour mapping as the pivot reports, and clicking
 * a slice can drill down via `onSelect`.
 */
const StatusDonutChart: React.FC<StatusDonutChartProps> = ({
  slices,
  height = 260,
  centerLabel = 'Total',
  onSelect,
}) => {
  const theme = useChartTheme()
  const visible = slices.filter(slice => slice.value > 0)
  const total = visible.reduce((sum, slice) => sum + slice.value, 0)

  const data: ChartData<'doughnut'> = {
    labels: visible.map(slice => slice.label || pretty(slice.status)),
    datasets: [
      {
        data: visible.map(slice => slice.value),
        backgroundColor: visible.map((slice, index) => theme.statusColor(slice.status, index)),
        borderColor: theme.card,
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  }

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    onClick: (_event, elements) => {
      if (!onSelect || elements.length === 0) return
      const slice = visible[elements[0].index]
      if (slice) onSelect(slice.status)
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: theme.mutedForeground,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 12,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: theme.card,
        titleColor: theme.foreground,
        bodyColor: theme.foreground,
        borderColor: theme.border,
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (item) => {
            const value = Number(item.parsed) || 0
            const share = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
            const suffix = onSelect ? ' — tap to view' : ''
            return ` ${value} (${share}%)${suffix}`
          },
        },
      },
    },
  }

  return (
    <div className="relative" style={{ height }}>
      <Doughnut data={data} options={options} />
      {/* Centre total overlay (canvas can't draw this itself) */}
      <div
        data-center-overlay
        className="pointer-events-none absolute inset-x-0 flex flex-col items-center justify-center"
        style={{ transform: 'translateY(-50%)' }}
      >
        <span className="text-2xl font-bold text-foreground">{total}</span>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  )
}

export default StatusDonutChart