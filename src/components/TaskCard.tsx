import React from 'react'
import type { TaskExecution, TaskExecutionStatus } from '../types/task-execution'
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../types/task-execution'
import { formatDate, formatTime } from '../utils/date'

export interface TaskCardProps {
  task: TaskExecution
  onClick: (task: TaskExecution) => void
  /** Compact variant for kanban/board columns */
  compact?: boolean
  className?: string
}

/**
 * TaskCard — shared task-execution card used across staff-portal pages
 * (My Tasks grid + kanban layouts). The `compact` variant is trimmed for
 * board columns; the full variant shows the complete task summary.
 */
const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, compact = false, className = '' }) => {
  const status = task.executionStatus as TaskExecutionStatus
  const statusColorClass = TASK_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  const statusLabel = TASK_STATUS_LABELS[status] || task.executionStatus
  const title = task.mstTask?.title || `Task #${task.mstTaskId}`

  if (compact) {
    return (
      <button
        onClick={() => onClick(task)}
        className={`w-full cursor-pointer text-left border border-border rounded-lg p-3 bg-background hover:shadow-md transition-shadow hover:border-primary/30 group ${className}`}
      >
        <div className="space-y-2">
          {/* Title */}
          <h5 className="text-sm font-medium text-foreground truncate">{title}</h5>

          {/* Regional text */}
          {task.mstTask?.regionalText && (
            <p className="text-xs text-muted-foreground truncate">{task.mstTask.regionalText}</p>
          )}

          {/* Schedule */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{formatDate(task.executionDate)}</span>
            <span>·</span>
            <span>{formatTime(task.fromTime)} - {formatTime(task.toTime)}</span>
          </div>

          {/* Status chip */}
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColorClass}`}>
            {statusLabel}
          </span>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={() => onClick(task)}
      className={`w-full cursor-pointer text-left border border-border rounded-lg p-3 bg-background hover:shadow-md transition-shadow hover:border-primary/30 group ${className}`}
    >
      <div className="space-y-2">
        {/* Title — left aligned */}
        <h3 className="font-medium text-foreground truncate">{title}</h3>

        {/* Regional text — left aligned */}
        {task.mstTask?.regionalText && (
          <p className="text-sm text-muted-foreground truncate">{task.mstTask.regionalText}</p>
        )}

        {/* Schedule — left aligned */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <span>{formatDate(task.executionDate)}</span>
          <span>{formatTime(task.fromTime)} - {formatTime(task.toTime)}</span>
        </div>

        {/* Picked by — left aligned */}
        {task.pickedByUser && (
          <p className="text-xs text-muted-foreground">
            Picked By: {task.pickedByUser.firstName} {task.pickedByUser.lastName}
          </p>
        )}

        {/* Completed by — left aligned */}
        {task.completedByUser && (
          <p className="text-xs text-muted-foreground">
            Completed By: {task.completedByUser.firstName} {task.completedByUser.lastName}
          </p>
        )}

        {/* Status + chevron — items-start, left aligned */}
        <div className="flex items-start justify-between gap-2">
          <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColorClass}`}>
            {statusLabel}
          </span>
          <svg className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
}

export default TaskCard