import './chartSetup'
import { Line } from 'react-chartjs-2'
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js'
import { useChartTheme, formatPercent, hexToRgba } from './chartTheme'

export interface TrendPoint {
  /** X axis label (e.g. DD-MM-YYYY). */
  label: string
  /** Primary series value (e.g. completion %). */
  value: number
  /** Optional secondary value shown in the tooltip (e.g. completed/total). */
  secondary?: string
}

interface CompletionTrendChartProps {
  points: TrendPoint[]
  /** Y axis title / tooltip unit. Defaults to %. */
  unit?: 'percent' | 'count'
  height?: number
  /** Line colour; defaults to the primary chart token. */
  color?: string
  /** Fill the area under the line (default true). */
  filled?: boolean
}

/**
 * CompletionTrendChart — single-series area/line trend used for daily
 * completion % (checklists) and daily survey item completion.
 *
 * Theme-aware (re-colours on light/dark toggle) and touch friendly.
 */
const CompletionTrendChart: React.FC<CompletionTrendChartProps> = ({
  points,
  unit = 'percent',
  height = 260,
  color,
  filled = true,
}) => {
  const theme = useChartTheme()
  const lineColor = color || theme.palette[0]

  const data: ChartData<'line'> = {
    labels: points.map(point => point.label),
    datasets: [
      {
        label: unit === 'percent' ? 'Completion %' : 'Completed',
        data: points.map(point => point.value),
        borderColor: lineColor,
        backgroundColor: (context: ScriptableContext<'line'>) => {
          if (!filled) return 'transparent'
          const { ctx, chartArea } = context.chart
          if (!chartArea) return 'transparent'
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          // Chart.js needs a colour it can parse; use rgba derived from the token.
          gradient.addColorStop(0, hexToRgba(lineColor, theme.isDark ? 0.45 : 0.3))
          gradient.addColorStop(1, hexToRgba(lineColor, 0))
          return gradient
        },
        fill: filled,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: points.length > 20 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: lineColor,
        pointBorderColor: theme.card,
        pointBorderWidth: 1.5,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.card,
        titleColor: theme.foreground,
        bodyColor: theme.foreground,
        borderColor: theme.border,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (item) => {
            const point = points[item.dataIndex]
            const value = item.parsed.y ?? 0
            const main = unit === 'percent' ? formatPercent(value) : String(value)
            return point?.secondary ? `${main} (${point.secondary})` : main
          },
        },
      },
    },
    scales: {
      x: {
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
        beginAtZero: true,
        grid: { color: theme.border },
        border: { display: false },
        ticks: {
          color: theme.mutedForeground,
          font: { size: 10 },
          maxTicksLimit: 5,
          callback: (value) => (unit === 'percent' ? `${value}%` : String(value)),
        },
        ...(unit === 'percent' ? { max: 100 } : {}),
      },
    },
  }

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  )
}

export default CompletionTrendChart