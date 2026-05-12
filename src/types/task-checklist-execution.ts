export type ChecklistStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'OVERDUE'

export interface TaskChecklistExecution {
  taskChecklistExecutionId: number
  taskExecutionId: number
  mstChecklistId: number
  checklistStatus: ChecklistStatus
  notes?: string
  completedBy?: number
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string

  taskExecution?: {
    taskExecutionId: number
    executionStatus?: string
  }

  taskChecklist?: {
    mstChecklistId: number
    title: string
    regionalText?: string
    description?: string
    startTime?: string
    endTime?: string
    sequence?: number
    isMandatory?: boolean
  }

  completedByUser?: {
    userId: number
    userName: string
    firstName: string
    lastName: string
  }
}

export interface UpdateTaskChecklistExecutionDto {
  checklistStatus?: ChecklistStatus
  notes?: string
  completedBy?: number
  startedAt?: string
  completedAt?: string
}

export interface UpdateTaskExecutionDto {
  executionStatus?: string
  notes?: string
  startedAt?: string
  completedAt?: string
  completedBy?: number
}

export const CHECKLIST_STATUS_LABELS: Record<ChecklistStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  SKIPPED: 'Skipped',
  OVERDUE: 'Overdue'
}

export const CHECKLIST_STATUS_COLORS: Record<ChecklistStatus, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  SKIPPED: 'bg-orange-100 text-orange-800',
  OVERDUE: 'bg-red-100 text-red-800'
}