export interface TaskExecution {
  taskExecutionId: number
  taskAssignmentId: number
  mstTaskId: number
  storeId: number
  userId: number
  executionDate: string
  fromTime: string
  toTime: string
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
  // | 'SKIPPED'
  | 'OVERDUE'

export const TASK_STATUS_COLORS: Record<TaskExecutionStatus, string> = {
  NOT_STARTED: 'bg-gray-600 text-gray-200',
  IN_PROGRESS: 'bg-blue-600 text-blue-200',
  COMPLETED: 'bg-green-600 text-green-200',
  // SKIPPED: 'bg-yellow-600 text-yellow-200',
  OVERDUE: 'bg-red-600 text-red-200',
}

export const TASK_STATUS_LABELS: Record<TaskExecutionStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  // SKIPPED: 'Skipped',
  OVERDUE: 'Overdue',
}

export const TASK_STATUS_BOARD_COLORS: Record<TaskExecutionStatus, string> = {
  NOT_STARTED: 'border-gray-300 bg-gray-50',
  IN_PROGRESS: 'border-blue-300 bg-blue-50',
  COMPLETED: 'border-green-300 bg-green-50',
  // SKIPPED: 'border-yellow-300 bg-yellow-50',
  OVERDUE: 'border-red-300 bg-red-50',
}

// Status summary card styles (with icon support for enhanced UI)
export const TASK_STATUS_SUMMARY_STYLES: Record<TaskExecutionStatus, {
  text: string
  chip: string
}> = {
  NOT_STARTED: {
    text: 'text-gray-700 dark:text-gray-200',
    chip: 'bg-gray-100/80 text-gray-600',
  },
  IN_PROGRESS: {
    text: 'text-blue-700 dark:text-blue-300',
    chip: 'bg-blue-100/80 text-blue-600',
  },
  COMPLETED: {
    text: 'text-green-700 dark:text-green-300',
    chip: 'bg-green-100/80 text-green-600',
  },
  /* SKIPPED: {
    text: 'text-yellow-700 dark:text-yellow-300',
    chip: 'bg-yellow-100/80 text-yellow-600',
  }, */
  OVERDUE: {
    text: 'text-red-700 dark:text-red-300',
    chip: 'bg-red-100/80 text-red-600',
  },
}

export const ALL_TASK_STATUSES: TaskExecutionStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  // 'SKIPPED',
  'OVERDUE',
]

// ── Kanban column configuration ────────────────────────────────────────────────
interface KanbanColumn {
  key: TaskExecutionStatus
  label: string
  colorClass: string
  headerTextClass: string
  countChipClass: string
  columnStyle: string
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    key: 'NOT_STARTED',
    label: 'Not Started',
    colorClass: 'bg-gray-100 text-gray-800',
    headerTextClass: 'text-gray-800',
    countChipClass: 'bg-gray-100 text-gray-700',
    columnStyle: 'border-gray-200 bg-gray-50/50',
  },
  {
    key: 'IN_PROGRESS',
    label: 'In Progress',
    colorClass: 'bg-blue-100 text-blue-800',
    headerTextClass: 'text-blue-800',
    countChipClass: 'bg-blue-100 text-blue-700',
    columnStyle: 'border-blue-200 bg-blue-50/50',
  },
  {
    key: 'COMPLETED',
    label: 'Completed',
    colorClass: 'bg-green-100 text-green-800',
    headerTextClass: 'text-green-800',
    countChipClass: 'bg-green-100 text-green-700',
    columnStyle: 'border-green-200 bg-green-50/50',
  },
  /* {
    key: 'SKIPPED',
    label: 'Skipped',
    colorClass: 'bg-yellow-100 text-yellow-800',
    headerTextClass: 'text-yellow-800',
    countChipClass: 'bg-yellow-100 text-yellow-700',
    columnStyle: 'border-yellow-200 bg-yellow-50/50',
  }, */
  {
    key: 'OVERDUE',
    label: 'Overdue',
    colorClass: 'bg-red-100 text-red-800',
    headerTextClass: 'text-red-800',
    countChipClass: 'bg-red-100 text-red-700',
    columnStyle: 'border-red-200 bg-red-50/50',
  },
]
