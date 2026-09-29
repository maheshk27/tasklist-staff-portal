import { CHART_FONT_FAMILY } from './chartSetup'
import { Bar } from 'react-chartjs-2'
import type { ChartData, ChartOptions, Plugin } from 'chart.js'
import { useChartTheme, formatCompactNumber } from './chartTheme'

export interface RankingItem {
  label: string
  /** Secondary line under the label (store code • city). */
  subLabel?: string
  /** Ranking measure, e.g. completion %. */
  value: number
  /** Tooltip detail, e.g. "12/15". */
  detail?: string
  /** Row identifier for drill-down. */
  id: number
}

interface StoreRankingBarsProps {
  items: RankingItem[]
  height?: number
  /** Axis suffix; % by default. */
  unit?: 'percent' | 'count'
  /** Called with the clicked row id (drill-down). */
  onSelect?: (id: number) => void
}

/**
 * Draws each bar's value ("85%", "12") at the end of the bar so the number is
 * readable without a tooltip — hover doesn't exist on mobile, and the axis
 * ticks only give an approximation.
 *
 * Values and colours are read from the chart instance at draw time (never from
 * a closure over props) because react-chartjs-2 registers custom plugins only
 * when the chart is created: this keeps the labels in sync after a data
 * refetch or a dark/light theme switch. When the text won't fit past the bar,
 * it is drawn inside the bar instead.
 */
const createValueLabelsPlugin = (unit: 'percent' | 'count'): Plugin<'bar'> => ({
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const { ctx, chartArea } = chart
    if (!chartArea) return

    const values = chart.data.datasets[0]?.data ?? []
    const ticks = chart.options.scales?.x?.ticks
    // Outside labels reuse the current x-axis tick colour so they follow the theme.
    const outsideColor = typeof ticks?.color === 'string' ? ticks.color : '#6b7280'

    ctx.save()
    ctx.font = `600 11px ${CHART_FONT_FAMILY}`
    ctx.textBaseline = 'middle'

    chart.getDatasetMeta(0).data.forEach((element, index) => {
      const value = values[index]
      if (typeof value !== 'number') return
      const text = unit === 'percent' ? `${value}%` : formatCompactNumber(value)
      const textWidth = ctx.measureText(text).width
      if (element.x + 6 + textWidth <= chartArea.right) {
        ctx.textAlign = 'left'
        ctx.fillStyle = outsideColor
        ctx.fillText(text, element.x + 6, element.y)
      } else {
        // Bar reaches the far edge — keep the label inside it so it stays visible.
        ctx.textAlign = 'right'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(text, element.x - 6, element.y)
      }
    })

    ctx.restore()
  },
})

/**
 * StoreRankingBars — horizontal ranking bars (highest first).
 *
 * Bar colour follows the same rule as the rest of the portal:
 * >=75 green, >=40 amber, otherwise red — so a store that is idle (0%) reads
 * as a problem rather than simply being absent.
 */
const StoreRankingBars: React.FC<StoreRankingBarsProps> = ({
  items,
  height = 280,
  unit = 'percent',
  onSelect,
}) => {
  const theme = useChartTheme()

  const colorFor = (value: number): string => {
    if (unit === 'count') return theme.palette[0]
    if (value >= 75) return '#16a34a' // green-600
    if (value >= 40) return '#d97706' // amber-600
    return '#dc2626' // red-600
  }

  const data: ChartData<'bar'> = {
    labels: items.map(item => item.label),
    datasets: [
      {
        label: unit === 'percent' ? 'Completion %' : 'Count',
        data: items.map(item => item.value),
        backgroundColor: items.map(item => colorFor(item.value)),
        borderRadius: 6,
        borderSkipped: false,
        barThickness: items.length > 12 ? 12 : 18,
        maxBarThickness: 22,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event, elements) => {
      if (!onSelect || elements.length === 0) return
      const item = items[elements[0].index]
      if (item) onSelect(item.id)
    },
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
          title: (tooltipItems) => {
            const item = items[tooltipItems[0].dataIndex]
            return item?.subLabel ? `${item.label} • ${item.subLabel}` : item?.label || ''
          },
          label: (item) => {
            const row = items[item.dataIndex]
            const main = unit === 'percent' ? `${item.parsed.x}%` : String(item.parsed.x)
            const detail = row?.detail ? ` (${row.detail})` : ''
            const suffix = onSelect ? ' — tap to view' : ''
            return `${main}${detail}${suffix}`
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: theme.border },
        border: { display: false },
        ticks: {
          color: theme.mutedForeground,
          font: { size: 10 },
          maxTicksLimit: 6,
          callback: (value) => (unit === 'percent' ? `${value}%` : formatCompactNumber(Number(value))),
        },
        ...(unit === 'percent' ? { max: 100 } : {}),
      },
      y: {
        grid: { display: false },
        border: { color: theme.border },
        ticks: {
          color: theme.mutedForeground,
          font: { size: 11 },
          autoSkip: false,
          crossAlign: 'far',
        },
      },
    },
  }

  return (
    <div style={{ height }}>
      <Bar data={data} options={options} plugins={[createValueLabelsPlugin(unit)]} />
    </div>
  )
}

export default StoreRankingBars