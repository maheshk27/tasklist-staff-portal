import React from 'react'
import { ArrowRight } from 'lucide-react'
import { formatDate, formatTime } from '../utils/date'

export interface BaseCardProps {
  /** Title of the card */
  title: string
  /** Regional text (translated content) */
  regionalText?: string | null
  /** Schedule date string */
  scheduleDate?: string | null
  /** Start time */
  fromTime?: string | null
  /** End time */
  toTime?: string | null
  /** Compact variant for kanban/board columns */
  compact?: boolean
  /** Click handler */
  onClick: () => void
  /** Additional CSS classes */
  className?: string
  /** Card body content (schedule, status, etc.) */
  children?: React.ReactNode
  /** Footer content (status + arrow) */
  footer?: React.ReactNode
}

/**
 * BaseCard — shared card wrapper with title, regional text, schedule,
 * and a circular arrow button. Used by TaskCard and ChecklistCard to
 * eliminate repetitive compact/full mode duplication.
 */
const BaseCard: React.FC<BaseCardProps> = ({
  title,
  regionalText,
  scheduleDate,
  fromTime,
  toTime,
  compact = false,
  onClick,
  className = '',
  children,
  footer,
}) => {
  const scheduleSection = (fromTime || toTime) && (
    <div className={`flex items-start gap-2 text-sm text-muted-foreground`}>
      {scheduleDate && <span>{formatDate(scheduleDate)}</span>}
      {fromTime && toTime && (
        <>
          {!compact && <span>·</span>}
          <span>{formatTime(fromTime)} - {formatTime(toTime)}</span>
        </>
      )}
    </div>
  )

  return (
    <button
      onClick={onClick}
      className={`w-full cursor-pointer text-left border border-border rounded-lg p-3 bg-background hover:shadow-md transition-shadow hover:border-primary/30 group ${className}`}
    >
      <div className={`space-y-${compact ? '2' : '1.5'}`}>
        {/* Title */}
        <h5 className="text-sm font-medium text-foreground truncate">{title}</h5>

        {/* Regional text */}
        {regionalText ? (
          <p className="text-sm text-muted-foreground truncate">{regionalText}</p>
        ) : (
          <p className="text-sm text-muted-foreground truncate">Not Available</p>
        )}

        {/* Schedule */}
        {scheduleSection}

        {/* Additional body content */}
        {children}

        {/* Footer (status + arrow) */}
        {footer || (
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status slot - can be overridden via footer */}
            </div>
            <ArrowButton />
          </div>
        )}
      </div>
    </button>
  )
}

/** Circular arrow button used in card footers */
export const ArrowButton: React.FC = () => (
  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
    <ArrowRight className="w-4 h-4" />
  </span>
)

/** Status chip with label */
export const StatusChip: React.FC<{ label: string; colorClass: string; size?: 'sm' | 'md' }> = ({
  label,
  colorClass,
  size = 'md',
}) => (
  <span className={`px-2.5 py-0.5 ${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium rounded-full ${colorClass}`}>
    {label}
  </span>
)

/** Info row for displaying label: value pairs */
export const InfoRow: React.FC<{ label: string; value: React.ReactNode; labelBold?: boolean }> = ({
  label,
  value,
  labelBold = true,
}) => (
  <p className="text-sm text-muted-foreground">
    <span className={labelBold ? 'text-foreground' : ''}>{label}: </span>
    {value}
  </p>
)

export default BaseCard