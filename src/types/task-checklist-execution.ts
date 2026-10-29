export type ChecklistStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
export type ChecklistPriority = 'HIGH' | 'LOW' | 'MEDIUM' | 'CRITICAL'

export interface TaskChecklistExecution {
  taskChecklistExecutionId: number
  taskExecutionId: number
  mstChecklistId: number
  fromTime: string
  toTime: string
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
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    proofMandatory?: boolean
    uploadType?: 'PHOTO' | 'EXCEL' | 'PDF'
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
  // SKIPPED: 'Skipped',
  OVERDUE: 'Overdue'
}

export const CHECKLIST_STATUS_COLORS: Record<ChecklistStatus, string> = {
  NOT_STARTED: 'bg-gray-600 text-gray-200',
  IN_PROGRESS: 'bg-blue-600 text-blue-200',
  COMPLETED: 'bg-green-600 text-green-200',
  // SKIPPED: 'bg-yellow-600 text-yellow-200',
  OVERDUE: 'bg-red-600 text-red-200',
}

export const ALL_CHECKLIST_STATUSES: ChecklistStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  // 'SKIPPED',
  'OVERDUE',
]

export const CHECKLIST_PRIORITY_LABELS: Record<ChecklistPriority, string> = {
  HIGH: 'High',
  LOW: 'Low',
  MEDIUM: 'Medium',
  CRITICAL: 'Critical'
}
