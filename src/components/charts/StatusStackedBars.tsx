import './chartSetup'
import { Bar } from 'react-chartjs-2'
import type { ChartData, ChartOptions } from 'chart.js'
import { useChartTheme } from './chartTheme'

export interface StackedBarGroup {
  /** X axis label (e.g. DD-MM-YYYY). */
  label: string
  /** status -> count for this group. */
  counts: Record<string, number>
}

interface StatusStackedBarsProps {
  groups: StackedBarGroup[]
  /** All statuses to stack (order defines legend + stacking order). */
  statuses: string[]
  height?: number
  /** Called with the clicked status when a segment is tapped. */
  onSelect?: (status: string) => void
}

const pretty = (status: string): string =>
  status
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

/**
 * StatusStackedBars — status mix per day (or per store) as a stacked bar chart.
 * Colours come from the shared status palette so the chart matches the pivots.
 */
const StatusStackedBars: React.FC<StatusStackedBarsProps> = ({
  groups,
  statuses,
  height = 280,
  onSelect,
}) => {
  const theme = useChartTheme()

  const data: ChartData<'bar'> = {
    labels: groups.map(group => group.label),
    datasets: statuses.map((status, index) => ({
      label: pretty(status),
      data: groups.map(group => group.counts[status] || 0),
      backgroundColor: theme.statusColor(status, index),
      borderRadius: 4,
      borderSkipped: false,
      stack: 'status',
      maxBarThickness: 34,
    })),
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    onClick: (_event, elements) => {
      if (!onSelect || elements.length === 0) return
      const status = statuses[elements[0].datasetIndex]
      if (status) onSelect(status)
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
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { display: false },
        border: { color: theme.border },
        ticks: {
          color: theme.mutedForeground,
          font: { size: 10 },
          maxRotation: 0,
          autoSkipPadding: 12,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: theme.border },
        border: { display: false },
        ticks: {
          color: theme.mutedForeground,
          font: { size: 10 },
          maxTicksLimit: 5,
          precision: 0,
        },
      },
    },
  }

  return (
    <div style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  )
}

export default StatusStackedBars