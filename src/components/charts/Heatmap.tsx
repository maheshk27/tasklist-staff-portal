import React from 'react'
import { useChartTheme, hexToRgba } from './chartTheme'

export interface HeatmapCell {
  /** Percentage 0-100 driving the colour intensity. */
  value: number
  /** Optional tooltip detail, e.g. "9/12". */
  detail?: string
  /** Explicit cell text (e.g. a raw status count); defaults to `${Math.round(value)}%` or "—". */
  display?: string
}

export interface HeatmapProps {
  /** X axis labels (days or checklists). */
  columns: string[]
  /** One row per store. */
  rows: Array<{ id: number; label: string; subLabel?: string; cells: HeatmapCell[] }>
  /** Called with (rowId, columnIndex) when a cell is tapped. */
  onSelect?: (rowId: number, columnIndex: number) => void
  /** Fixed cell width in px (horizontal scroll on mobile). */
  cellWidth?: number
  /**
   * Accent colour for an intensity ramp of that colour (darker = more).
   * Used by the status-wise heatmap so "more of this status" never reads as
   * "better". Omit for the default red → amber → green completion ramp.
   */
  accentColor?: string
}

/** Parse #rgb / #rrggbb / rgb(a) into 0-255 components (null when unparseable). */
const parseRgb = (color: string): [number, number, number] | null => {
  const value = color.trim()
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value)
  if (short) {
    const [, r, g, b] = short
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)]
  }
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value)
  if (long) {
    const [, r, g, b] = long
    return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)]
  }
  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(value)
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]
  return null
}

/** Relative luminance (0-1) of a colour; 0 when it cannot be parsed. */
const luminance = (color: string): number => {
  const rgb = parseRgb(color)
  if (!rgb) return 0
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
}

/** Luminance of the dark cell text colour rgb(17,24,39) on luminance()'s scale. */
const DARK_TEXT_LUM = luminance('rgb(17, 24, 39)')

/**
 * Cell colour ramp.
 *
 * Default (completion): red (0) → amber (~50) → green (100).
 * With `accentColor`: an intensity ramp of that colour (darker = more), used by
 * the status-wise heatmap.
 *
 * Cells are painted at 50–100% opacity (not 15–90%) so even a 0% / low-count
 * cell reads as a solid saturated heat colour instead of a pale wash. The text
 * colour is chosen by whichever of white / near-black has the better contrast
 * on the composited cell (colour over the card), so cells stay readable in
 * both light and dark themes.
 */
const heatStyles = (
  value: number,
  accentColor?: string,
  surfaceLum = 1,
): { background: string; color: string } => {
  const clamped = Math.max(0, Math.min(100, value))
  const alpha = 0.5 + (clamped / 100) * 0.5
  let background: string
  let cellLum: number

  if (accentColor) {
    background = hexToRgba(accentColor, alpha)
    cellLum = luminance(accentColor)
  } else {
    // red (220,38,38) -> amber (217,119,6) -> green (22,163,74)
    const lerp = (from: number, to: number, t: number) => Math.round(from + (to - from) * t)
    let r: number, g: number, b: number
    if (clamped < 50) {
      const t = clamped / 50
      r = lerp(220, 217, t)
      g = lerp(38, 119, t)
      b = lerp(38, 6, t)
    } else {
      const t = (clamped - 50) / 50
      r = lerp(217, 22, t)
      g = lerp(119, 163, t)
      b = lerp(6, 74, t)
    }
    background = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`
    cellLum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  }

  const composited = cellLum * alpha + surfaceLum * (1 - alpha)
  const whiteContrast = 1.05 / (composited + 0.05)
  const darkContrast = (composited + 0.05) / (DARK_TEXT_LUM + 0.05)
  return { background, color: whiteContrast > darkContrast ? '#ffffff' : 'rgb(17, 24, 39)' }
}

/**
 * Heatmap — stores × time/checklist completion grid.
 *
 * Implemented as DOM cells (not canvas): heatmaps read better as a grid, and
 * this keeps every cell tappable for drill-down while staying theme-aware.
 */
const Heatmap: React.FC<HeatmapProps> = ({ columns, rows, onSelect, cellWidth = 54, accentColor }) => {
  const theme = useChartTheme()
  const surfaceLum = luminance(theme.card)

  if (columns.length === 0 || rows.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card px-2 py-1.5 text-left font-medium text-muted-foreground min-w-[150px]">
              Store
            </th>
            {columns.map((column, index) => (
              <th
                key={`${column}-${index}`}
                className="px-1 py-1.5 text-center font-medium text-muted-foreground"
                style={{ minWidth: cellWidth }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td className="sticky left-0 z-10 bg-card px-2 py-1.5 align-middle">
                <div className="font-medium text-foreground truncate max-w-[140px]" title={row.label}>
                  {row.label}
                </div>
                {row.subLabel && (
                  <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{row.subLabel}</div>
                )}
              </td>
              {columns.map((column, columnIndex) => {
                const cell = row.cells[columnIndex] || { value: 0 }
                const style = heatStyles(cell.value, accentColor, surfaceLum)
                const text = cell.display ?? (cell.value > 0 ? `${Math.round(cell.value)}%` : '—')
                const clickable = Boolean(onSelect)
                return (
                  <td key={`${row.id}-${column}-${columnIndex}`} className="p-0.5">
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => onSelect?.(row.id, columnIndex)}
                      title={`${row.label} • ${column}: ${text}${cell.detail ? ` (${cell.detail})` : ''}`}
                      className={`flex h-9 w-full items-center justify-center rounded-md font-semibold transition-transform ${
                        clickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                      }`}
                      style={style}
                    >
                      {text}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Heatmap