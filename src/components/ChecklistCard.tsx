import React from 'react'
import type { TaskChecklistExecution, ChecklistStatus, ChecklistPriority } from '../types/task-checklist-execution'
import { CHECKLIST_PRIORITY_LABELS, CHECKLIST_STATUS_COLORS, CHECKLIST_STATUS_LABELS } from '../types/task-checklist-execution'
import { formatDate, formatTime } from '../utils/date'
import { getPriorityColor } from '../utils/priority'
import BaseCard, { ArrowButton, InfoRow } from './BaseCard'

export interface ChecklistCardProps {
  checklist: TaskChecklistExecution
  onClick: (checklist: TaskChecklistExecution) => void
  /** Compact variant for kanban/board columns */
  compact?: boolean
  className?: string
}

/**
 * ChecklistCard — shared checklist-execution card used on the task execution
 * detail page (grid + kanban layouts). Uses BaseCard for common layout.
 */
const ChecklistCard: React.FC<ChecklistCardProps> = ({ checklist: cl, onClick, compact = false, className = '' }) => {
  const checklistStatus = cl.checklistStatus as ChecklistStatus
  const checklistPriority = cl.taskChecklist?.priority as ChecklistPriority
  const statusColorClass = CHECKLIST_STATUS_COLORS[checklistStatus] || 'bg-gray-100 text-gray-800'
  const statusLabel = CHECKLIST_STATUS_LABELS[checklistStatus]
  const priorityLabel = CHECKLIST_PRIORITY_LABELS[checklistPriority]
  const title = cl.taskChecklist?.title || `Checklist #${cl.mstChecklistId}`

  const priorityChip = cl.taskChecklist?.priority && (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getPriorityColor(cl.taskChecklist.priority)}`}>
      {priorityLabel}
    </span>
  )

  const mandatoryChip = cl.taskChecklist?.isMandatory && (
    <span className={`text-xs text-red-500 font-medium`}>
      (M)
    </span>
  )

  const footer = (
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColorClass}`}>
          {statusLabel}
        </span>
        {priorityChip}
        {mandatoryChip}
      </div>
      <ArrowButton />
    </div>
  )

  const extraDetails = !compact && cl.completedByUser && (
    <InfoRow
      label="Completed By"
      value={`${cl.completedByUser.firstName} ${cl.completedByUser.lastName}`}
    />
  )

  // Schedule with different format for checklist (uses fromTime as date too)
  const scheduleSection = (cl.fromTime || cl.toTime) && (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <span>
        {formatDate(cl.fromTime)}, {formatTime(cl.fromTime)} - {formatTime(cl.toTime)}
      </span>
    </div>
  )

  return (
    <BaseCard
      title={title}
      regionalText={cl.taskChecklist?.regionalText}
      compact={compact}
      onClick={() => onClick(cl)}
      className={className}
      footer={footer}
    >
      {scheduleSection}
      {extraDetails}
    </BaseCard>
  )
}

export default ChecklistCard