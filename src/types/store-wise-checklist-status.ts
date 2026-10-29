/**
 * Types for the store-wise checklist status report (pivot-ready).
 *
 * Row     : Store (storeId, storeName, storeCode, city)
 * Columns : Checklist (mstChecklistId, checklistTitle, checklistRegionalText)
 * Values  : Status-wise counts per store + checklist
 *           (`mstChecklistId` -> `checklistStatus` -> count)
 *
 * The report is built for a single date only.
 */

export interface StoreWiseChecklistStatusColumn {
  mstChecklistId: number
  checklistTitle: string
  checklistRegionalText?: string
  /** Scheduled start time for the task (from the execution) */
  fromTime?: Date
  /** Scheduled end time for the task (from the execution) */
  toTime?: Date
}

export interface StoreWiseChecklistStatusRow {
  storeId: number
  storeName: string
  storeCode: string
  city?: string
  state?: string
  /** Total checklist executions for this store on the selected date. */
  totalChecklistExecutions: number
  /** Sparse map of mstChecklistId -> (checklistStatus -> count). Missing keys mean no executions. */
  values: Record<string, Record<string, number>>
}

export interface StoreWiseChecklistStatusFilters {
  storeId?: number
  storeIds?: number[]
  city?: string
  priority?: string
  fromDate?: string
  toDate?: string
}

export interface StoreWiseChecklistExecutionRef {
  /** Parent task execution ID (needed by ChecklistExecutionDetail). */
  taskExecutionId: number
  /** The checklist execution ID (drill-down target). */
  taskChecklistExecutionId: number
}

export interface StoreWiseChecklistStatusResponse {
  filters: StoreWiseChecklistStatusFilters
  /** Ordered list of every checklist status present in the dataset. */
  statuses: string[]
  checklists: StoreWiseChecklistStatusColumn[]
  rows: StoreWiseChecklistStatusRow[]
  /**
   * Maps `${storeId}:${mstChecklistId}:${checklistStatus}` to the checklist
   * execution records that make up that cell count — used to open the
   * Checklist Execution Detail modal for the underlying executions.
   */
  taskChecklistExecutionIds: Record<string, StoreWiseChecklistExecutionRef[]>
}
