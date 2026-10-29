/**
 * Types for the store-date-wise checklist completion report (pivot-ready).
 *
 * Row     : Store (storeId, storeName, storeCode, city)
 * Columns : Date (every calendar day in the selected range, formatted DD-MM-YYYY)
 * Values  : Status-wise count + completion % per store + day
 */

export interface StoreDateWiseChecklistColumn {
  /** ISO date (YYYY-MM-DD); the UI renders it as DD-MM-YYYY. */
  date: string
}

export interface StoreDateWiseChecklistCell {
  total: number
  completed: number
  /** Average % Completed for the day, e.g. 75.0. */
  completionPercent: number
  /** Sparse map of checklist status -> count for that store + day. */
  statusCounts: Record<string, number>
}

export interface StoreDateWiseChecklistRow {
  storeId: number
  storeName: string
  storeCode: string
  city?: string
  state?: string
  /** Sparse map of date (YYYY-MM-DD) -> cell stats; missing keys mean no executions. */
  values: Record<string, StoreDateWiseChecklistCell>
}

export interface StoreDateWiseChecklistFilters {
  storeId?: number
  storeIds?: number[]
  city?: string
  taskPriority?: string
  checklistPriority?: string
  masterChecklistId?: number
  fromDate?: string
  toDate?: string
}

export interface StoreDateWiseChecklistResponse {
  filters: StoreDateWiseChecklistFilters
  /** Every calendar day column in the selected range. */
  dates: StoreDateWiseChecklistColumn[]
  rows: StoreDateWiseChecklistRow[]
}
