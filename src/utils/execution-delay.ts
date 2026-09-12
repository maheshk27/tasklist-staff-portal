/**
 * Shared delay / completed-late note builders used by task & checklist cards
 * and the detail page Activity sections.
 *
 * Rules:
 *  - NOT_STARTED and the scheduled start time (fromTime) has passed → delayed
 *  - IN_PROGRESS and the scheduled end time (toTime) has passed → delayed
 *  - COMPLETED after the scheduled end time → completed late
 */
import type { TaskExecution, TaskExecutionStatus } from '../types/task-execution'
import type { TaskChecklistExecution, ChecklistStatus } from '../types/task-checklist-execution'
import { formatDuration, getMinutesPast, getDelayReference } from './date'

/** Build the delay / completed-late warning text for a task. */
export function getTaskDelayNote(task: TaskExecution): string | null {
  const status = task.executionStatus as TaskExecutionStatus

  // Not started and the scheduled start time has already passed → delayed
  if (status === 'NOT_STARTED') {
    const minutes = getMinutesPast(task.fromTime, getDelayReference(task.fromTime))
    if (minutes !== null) return `Delayed by ${formatDuration(minutes)}`
  }

  // In progress but the scheduled end time has already passed → delayed
  if (status === 'IN_PROGRESS' || status === 'OVERDUE') {
    const minutes = getMinutesPast(task.toTime, getDelayReference(task.fromTime))
    if (minutes !== null) return `Delayed by ${formatDuration(minutes)}`
  }

  // Completed after the scheduled end time → completed late
  if (status === 'COMPLETED') {
    const minutes = getMinutesPast(task.toTime, task.completedAt)
    if (minutes !== null) return `Completed by ${formatDuration(minutes)}`
  }

  return null
}

/** Build the delay / completed-late warning text for a checklist. */
export function getChecklistDelayNote(cl: TaskChecklistExecution): string | null {
  const status = cl.checklistStatus as ChecklistStatus

  // Not started and the scheduled start time has already passed → delayed
  if (status === 'NOT_STARTED') {
    const minutes = getMinutesPast(cl.fromTime, getDelayReference(cl.fromTime))
    if (minutes !== null) return `Delayed by ${formatDuration(minutes)}`
  }

  // In progress but the scheduled end time has already passed → delayed
  if (status === 'IN_PROGRESS' || status === 'OVERDUE') {
    const minutes = getMinutesPast(cl.toTime, getDelayReference(cl.fromTime))
    if (minutes !== null) return `Delayed by ${formatDuration(minutes)}`
  }

  // Completed after the scheduled end time → completed late
  if (status === 'COMPLETED') {
    const minutes = getMinutesPast(cl.toTime, cl.completedAt)
    if (minutes !== null) return `Completed by ${formatDuration(minutes)}`
  }

  return null
}