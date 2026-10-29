import React from 'react'
import type { TaskExecution, TaskExecutionStatus } from '../types/task-execution'
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../types/task-execution'
import { getTaskDelayNote } from '../utils/execution-delay'
import BaseCard, { ArrowButton, StatusChip, InfoRow } from './BaseCard'

export interface TaskCardProps {
  task: TaskExecution
  onClick: (task: TaskExecution) => void
  /** Compact variant for kanban/board columns */
  compact?: boolean
  /** Show the assigned store & user details (used on team/management views) */
  showAssignment?: boolean
  className?: string
}

/**
 * TaskCard — shared task-execution card used across staff-portal pages
 * (My Tasks grid + kanban layouts). Uses BaseCard for common layout.
 * Pass `showAssignment` to also display the assigned store & user.
 */
const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onClick,
  compact = false,
  showAssignment = false,
  className = '',
}) => {
  const status = task.executionStatus as TaskExecutionStatus
  const statusColorClass = TASK_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  const statusLabel = TASK_STATUS_LABELS[status] || task.executionStatus
  const title = task.mstTask?.title || `Task #${task.mstTaskId}`
  const delayNote = getTaskDelayNote(task)

  const footer = (
    <div className="flex items-start justify-between gap-2">
      <StatusChip label={statusLabel} colorClass={statusColorClass} size="sm" />
      <ArrowButton />
    </div>
  )

  const assignmentDetails = showAssignment && (
    <>
      {task.store && (
        <InfoRow
          label="Store"
          value={`${task.store.storeName} (${task.store.storeCode})`}
        />
      )}
      {task.user && (
        <InfoRow
          label="Assigned To"
          value={`${task.user.firstName} ${task.user.lastName}`}
        />
      )}
    </>
  )

  const extraDetails = !compact && (
    <>
      {assignmentDetails}
      {task.pickedByUser && (
        <InfoRow
          label="Picked By"
          value={`${task.pickedByUser.firstName} ${task.pickedByUser.lastName}`}
        />
      )}
      {task.completedByUser && (
        <InfoRow
          label="Completed By"
          value={`${task.completedByUser.firstName} ${task.completedByUser.lastName}`}
        />
      )}
    </>
  )

  return (
    <BaseCard
      title={title}
      regionalText={task.mstTask?.regionalText}
      scheduleDate={task.executionDate}
      fromTime={task.fromTime}
      toTime={task.toTime}
      compact={compact}
      onClick={() => onClick(task)}
      className={className}
      footer={footer}
      delayNote={delayNote}
    >
      {extraDetails}
    </BaseCard>
  )
}

export default TaskCard