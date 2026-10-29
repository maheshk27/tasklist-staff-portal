/**
 * Types for the store-wise checklist completion report (pivot-ready).
 *
 * Row     : Store (storeId, storeName, storeCode, city)
 * Columns : Checklist (mstChecklistId, checklistTitle, checklistRegionalText)
 * Values  : Count of checklist executions with status = COMPLETED
 * Last    : Average % Completed per store
 */

export interface StoreWiseChecklistColumn {
  mstChecklistId: number
  checklistTitle: string
  checklistRegionalText?: string
  fromTime?: string
  toTime?: string
}

export interface StoreWiseChecklistRow {
  storeId: number
  storeName: string
  storeCode: string
  city?: string
  state?: string
  totalChecklistExecutions: number
  completedCount: number
  /** Average % Completed, e.g. 80.0 */
  averageCompletionPercent: number
  /** Sparse map of mstChecklistId -> COMPLETED count; missing keys mean 0. */
  values: Record<string, number>
}

export interface StoreWiseChecklistCompletionFilters {
  storeId?: number
  storeIds?: number[]
  city?: string
  priority?: string
  fromDate?: string
  toDate?: string
}

export interface StoreWiseChecklistCompletionResponse {
  filters: StoreWiseChecklistCompletionFilters
  checklists: StoreWiseChecklistColumn[]
  rows: StoreWiseChecklistRow[]
}
