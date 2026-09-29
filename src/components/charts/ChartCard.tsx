import React from 'react'

export interface ChartCardProps {
  title: string
  subtitle?: string
  /** Right-side actions (refresh, links, range toggles). */
  actions?: React.ReactNode
  /** Chart body. */
  children: React.ReactNode
  /** Forwarded to the outer card (e.g. grid span classes). */
  className?: string
}

/**
 * ChartCard — the card shell every analytics chart renders inside.
 * Keeps section headers/actions consistent with the dashboard overview cards.
 */
const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, actions, children, className = '' }) => {
  return (
    <div className={`bg-card p-4 sm:p-6 rounded-xl border border-border ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-md font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export interface ChartStatePanelProps {
  /** 'loading' shows a spinner; the others render an explanatory message. */
  variant: 'loading' | 'empty' | 'no-stores' | 'error'
  message?: string
  /** Height of the placeholder area, so cards don't jump between states. */
  height?: number
  /** Red banner instead of the neutral treatment (used for errors). */
  isError?: boolean
}

const DEFAULT_MESSAGES: Record<ChartStatePanelProps['variant'], string> = {
  loading: 'Loading chart…',
  empty: 'No data available for the selected range.',
  'no-stores': 'No stores are mapped to your account.',
  error: 'Failed to load chart data.',
}

/**
 * ChartStatePanel — loading / empty / no-mapped-stores / error placeholder.
 * Mirrors the states used by the dashboard overview sections so charts and
 * cards behave identically for staff users.
 */
export const ChartStatePanel: React.FC<ChartStatePanelProps> = ({
  variant,
  message,
  height = 240,
  isError = false,
}) => {
  const text = message || DEFAULT_MESSAGES[variant]

  if (variant === 'loading') {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-xs text-muted-foreground">{text}</p>
        </div>
      </div>
    )
  }

  if (isError || variant === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4" style={{ minHeight: height }}>
        <p className="text-sm text-red-600">{text}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height }}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <span className="text-xl">{variant === 'no-stores' ? '🏪' : '📊'}</span>
      </div>
      <p className="text-sm text-muted-foreground text-center px-4">{text}</p>
    </div>
  )
}

export default ChartCard