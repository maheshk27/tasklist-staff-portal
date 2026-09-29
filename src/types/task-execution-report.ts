/**
 * Types for the task-execution-details report.
 * Backend: GET /reports/task-execution-details (already authorised for staff
 * roles via the reports controller's role list).
 *
 * Row-level data is reference-by-ID: executions reference the top-level
 * `stores`, `users` and `masterChecklists` collections, which keeps the payload
 * small for the pivot/analytics views.
 */

export interface ReportSummary {
  totalTaskExecutions: number
  totalChecklistExecutions: number
  taskStatusCounts: Record<string, number>
  checklistStatusCounts: Record<string, number>
}

export interface ReportStoreRef {
  storeId: number
  storeName: string
  storeCode: string
  city?: string
  state?: string
}

export interface ReportUserRef {
  userId: number
  userName: string
  firstName: string
  lastName: string
  roleName?: string
}

export interface ReportChecklistExecution {
  taskChecklistExecutionId: number
  mstChecklistId: number
  checklistStatus: string
  startedAt?: string
  completedAt?: string
  completedBy?: number
  notificationCount: number
}

export interface ReportTaskExecution {
  taskExecutionId: number
  taskAssignmentId: number
  executionDate: string
  executionStatus: string
  fromTime?: string
  toTime?: string
  startedAt?: string
  completedAt?: string
  notes?: string
  mstTaskId: number
  storeId: number
  userId: number
  checklists: ReportChecklistExecution[]
}

export interface ReportMasterChecklist {
  mstChecklistId: number
  checklistTitle?: string
  title?: string
  checklistRegionalText?: string
  regionalText?: string
}

export interface TaskExecutionReportFilters {
  storeId?: number
  storeIds?: number[]
  city?: string
  taskPriority?: string
  checklistPriority?: string
  masterChecklistId?: number
  fromDate?: string
  toDate?: string
}

export interface TaskExecutionReportResponse {
  filters: TaskExecutionReportFilters
  summary: ReportSummary
  stores: ReportStoreRef[]
  users: ReportUserRef[]
  executions: ReportTaskExecution[]
  masterChecklists: ReportMasterChecklist[]
}