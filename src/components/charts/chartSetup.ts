/**
 * Chart.js registration — registers only the pieces the portal uses so the
 * vendor chunk stays as small as possible (tree-shaken via chart.js' ESM build).
 *
 * Import this module for its side effects before rendering any chart
 * (done once in main.tsx and in each chart component for safety).
 */
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

// Charts are mobile-first: let them use the full container width.
Chart.defaults.responsive = true
Chart.defaults.maintainAspectRatio = false

/** Single source of truth for chart text — canvas-drawn labels reuse this. */
export const CHART_FONT_FAMILY =
  'Montserrat, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'

Chart.defaults.font.family = CHART_FONT_FAMILY

export { Chart }