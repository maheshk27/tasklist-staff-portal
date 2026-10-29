import { useMemo } from 'react'
import { useTheme } from '../../hooks/useTheme'

/**
 * Chart theming for the canvas-based chart.js charts.
 *
 * Canvas cannot resolve CSS custom properties, so every token used by a chart
 * is resolved to a concrete colour with getComputedStyle. The theme comes from
 * useTheme(), so switching light/dark re-resolves the palette and re-renders
 * the charts with the new colours.
 */

/** Palette slot names defined in index.css (--chart-1 … --chart-5). */
export const CHART_COLOR_TOKENS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'] as const

/** Priority order for the discrete status palette (matches the reports). */
export const STATUS_ORDER = ['NOT_STARTED', 'IN_PROGRESS', 'OVERDUE', 'COMPLETED', 'SKIPPED', 'PENDING']

/** Series colours for statuses, aligned with the reports' STATUS_STYLES. */
const STATUS_COLOR_TOKENS: Record<string, string> = {
  COMPLETED: '#22c55e',       // green-500
  IN_PROGRESS: '#3b82f6',     // blue-500
  OVERDUE: '#ef4444',         // red-500
  NOT_STARTED: '#9ca3af',     // gray-400
  SKIPPED: '#f97316',         // orange-500
  PENDING: '#eab308',         // yellow-500
  SUBMITTED: '#6366f1',       // indigo-500
  VERIFIED: '#10b981',        // emerald-500
  DRAFT: '#a16207',           // yellow-700
}

/** Fallback hex per palette slot, used when a token cannot be resolved (SSR/jsdom). */
const FALLBACK_PALETTE = ['#c2410c', '#e0921c', '#f0c05a', '#e07a4a', '#d0442a']

export interface ChartTheme {
  /** Theme-aware series palette (--chart-1 … --chart-5). */
  palette: string[]
  /** Card / surface background. */
  card: string
  /** Border / grid line colour. */
  border: string
  /** Primary text colour (axis labels, legend). */
  foreground: string
  /** Muted text colour. */
  mutedForeground: string
  /** True when the dark theme is active (used for contrast tweaks). */
  isDark: boolean
  /** Colour for a status code, falling back to a palette slot. */
  statusColor: (status: string, index?: number) => string
}

/** Read a CSS custom property from :root, falling back to a literal colour. */
const readToken = (token: string, fallback: string): string => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return value ? normalizeColor(value) : fallback
}

/**
 * Normalise any CSS colour the browser understands into a canvas-friendly value.
 *
 * The design tokens are authored in `oklch(...)`; canvas gradients need a colour
 * format it can parse deterministically, so we round-trip the value through a
 * 2D context (which rewrites it as `#rrggbb` / `rgba(...)`).
 */
let probeContext: CanvasRenderingContext2D | null | undefined

export const normalizeColor = (color: string): string => {
  if (typeof document === 'undefined') return color
  if (probeContext === undefined) {
    probeContext = document.createElement('canvas').getContext('2d')
  }
  if (!probeContext) return color
  try {
    probeContext.fillStyle = '#000000'
    probeContext.fillStyle = color
    return probeContext.fillStyle
  } catch {
    return color
  }
}

/**
 * Resolve the chart palette + surface colours for the active theme.
 * Recomputes whenever the theme changes so canvas colours stay in sync.
 */
export const useChartTheme = (): ChartTheme => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return useMemo<ChartTheme>(() => {
    const palette = CHART_COLOR_TOKENS.map((token, index) => readToken(token, FALLBACK_PALETTE[index]))

    const statusColor = (status: string, index = 0): string =>
      STATUS_COLOR_TOKENS[status?.toUpperCase()] || palette[index % palette.length]

    return {
      palette,
      card: readToken('--card', isDark ? '#312c33' : '#ffffff'),
      border: readToken('--border', isDark ? '#5a4a51' : '#ece0dc'),
      foreground: readToken('--foreground', isDark ? '#f0e6e0' : '#4d3f3c'),
      mutedForeground: readToken('--muted-foreground', isDark ? '#d6c9bd' : '#8a7f78'),
      isDark,
      statusColor,
    }
    // `theme` is the real dependency: the tokens are read from the DOM after the
    // ThemeProvider has applied the `dark` class.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, isDark])
}

/**
 * Apply an alpha channel to a resolved colour.
 * Handles #rgb / #rrggbb / rgb() / rgba(); anything else is returned unchanged so
 * a chart never silently renders transparent.
 */
export function hexToRgba(color: string, alpha: number): string {
  const value = color.trim()

  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value)
  if (short) {
    const [, r, g, b] = short
    return `rgba(${parseInt(r + r, 16)}, ${parseInt(g + g, 16)}, ${parseInt(b + b, 16)}, ${alpha})`
  }

  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value)
  if (long) {
    const [, r, g, b] = long
    return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`
  }

  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(value)
  if (rgb) {
    const [, r, g, b] = rgb
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return value
}

/** Percentage label helper shared by chart tooltips/axes. */
export const formatPercent = (value: number): string => `${value}%`

/** Compact number label (1.2k) for axes with large counts. */
export const formatCompactNumber = (value: number): string =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(value)