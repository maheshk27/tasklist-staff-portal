export interface TaskExecution {
  taskExecutionId: number
  taskAssignmentId: number
  mstTaskId: number
  storeId: number
  userId: number
  executionDate: string
  executionStatus: TaskExecutionStatus
  pickedBy?: number
  completedBy?: number
  startedAt?: string
  completedAt?: string
  notes?: string
  createdAt: string
  updatedAt: string

  taskAssignment?: {
    taskAssignmentId: number
    status?: string
  }

  mstTask?: {
    mstTaskId: number
    title: string
    regionalText?: string
    description?: string
    startTime?: string
    endTime?: string
  }

  store?: {
    storeId: number
    storeName: string
    storeCode: string
    city: string
    state: string
  }

  user?: {
    userId: number
    userName: string
    firstName: string
    lastName: string
    emailId?: string
  }

  pickedByUser?: {
    userId: number
    userName: string
    firstName: string
    lastName: string
  }

  completedByUser?: {
    userId: number
    userName: string
    firstName: string
    lastName: string
  }
}

export type TaskExecutionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'OVERDUE'

export const TASK_STATUS_COLORS: Record<TaskExecutionStatus, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  SKIPPED: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
}

export const TASK_STATUS_LABELS: Record<TaskExecutionStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  SKIPPED: 'Skipped',
  OVERDUE: 'Overdue',
}