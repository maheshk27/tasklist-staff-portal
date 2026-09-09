import React from 'react'
import type { TaskChecklistExecution, ChecklistStatus } from '../types/task-checklist-execution'
import { CHECKLIST_STATUS_COLORS, CHECKLIST_STATUS_LABELS } from '../types/task-checklist-execution'
import { formatDate, formatTime } from '../utils/date'
import { getPriorityColor } from '../utils/priority'

export interface ChecklistCardProps {
  checklist: TaskChecklistExecution
  onClick: (checklist: TaskChecklistExecution) => void
  /** Compact variant for kanban/board columns */
  compact?: boolean
  className?: string
}

/**
 * ChecklistCard — shared checklist-execution card used on the task execution
 * detail page (grid + kanban layouts). The `compact` variant is trimmed for
 * board columns; the full variant shows the complete checklist summary.
 */
const ChecklistCard: React.FC<ChecklistCardProps> = ({ checklist: cl, onClick, compact = false, className = '' }) => {
  const checklistStatus = cl.checklistStatus as ChecklistStatus
  const statusColorClass = CHECKLIST_STATUS_COLORS[checklistStatus] || 'bg-gray-100 text-gray-800'
  const statusLabel = CHECKLIST_STATUS_LABELS[checklistStatus] || cl.checklistStatus
  const title = cl.taskChecklist?.title || `Checklist #${cl.mstChecklistId}`

  if (compact) {
    return (
      <button
        onClick={() => onClick(cl)}
        className={`w-full cursor-pointer text-left border border-border rounded-lg p-3 bg-background hover:shadow-md transition-shadow hover:border-primary/30 group ${className}`}
      >
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-foreground truncate">
            {/* {cl.taskChecklist?.sequence != null && (
              <span className="text-muted-foreground mr-1.5">{cl.taskChecklist.sequence}.</span>
            )} */}
            {title}
          </h5>

          {/* Regional text */}
          {cl.taskChecklist?.regionalText && (
            <p className="text-xs text-muted-foreground truncate">{cl.taskChecklist.regionalText}</p>
          )}

          {/* Schedule */}
          {cl.fromTime && cl.toTime && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{formatDate(cl.fromTime)}</span>
              <span>·</span>
              <span>{formatTime(cl.fromTime)} - {formatTime(cl.toTime)}</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <span>
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColorClass}`}>
              {statusLabel}
            </span>
            {cl.taskChecklist?.isMandatory && (
              <span className="ml-1 text-xs text-red-500 font-medium">(M)</span>
            )}
            </span>
            {cl.taskChecklist?.priority && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getPriorityColor(cl.taskChecklist.priority)}`}>
                {cl.taskChecklist.priority}
              </span>
            )}
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={() => onClick(cl)}
      className={`w-full cursor-pointer text-left border border-border rounded-lg p-3 bg-background hover:shadow-md transition-shadow hover:border-primary/30 group ${className}`}
    >
      <div className="space-y-2">
        {/* Title — left aligned */}
        <h3 className="font-medium text-foreground truncate">
          {/* {cl.taskChecklist?.sequence != null && (
            <span className="text-muted-foreground mr-1.5">{cl.taskChecklist.sequence}.</span>
          )} */}
          {title}
        </h3>

        {/* Regional text — left aligned */}
        {cl.taskChecklist?.regionalText && (
          <p className="text-sm text-muted-foreground truncate">{cl.taskChecklist.regionalText}</p>
        )}

        {/* Schedule — left aligned */}
        {cl.fromTime && cl.toTime && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <span>🕐</span>
            <span>
              {formatDate(cl.fromTime)}, {formatTime(cl.fromTime)} - {formatTime(cl.toTime)}
            </span>
          </div>
        )}

        {/* Completed by — left aligned */}
        {cl.completedByUser && (
          <p className="text-xs text-muted-foreground">
            Completed by: {cl.completedByUser.firstName} {cl.completedByUser.lastName}
          </p>
        )}

        {/* Status + meta — items-start, left aligned */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColorClass}`}>
              {statusLabel}
            </span>
            {cl.taskChecklist?.priority && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${getPriorityColor(cl.taskChecklist.priority)}`}>
                {cl.taskChecklist.priority}
              </span>
            )}
            {cl.taskChecklist?.isMandatory && (
              <span className="text-xs text-red-500 font-medium">(Mandatory)</span>
            )}
          </div>
          <svg className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
}

export default ChecklistCard