/**
 * Types for the store survey date wise completion status report (pivot-ready).
 *
 * Row     : Store (storeId, storeName, storeCode, city)
 * Columns : Date (every calendar day in the selected range)
 * Values  : Survey status + completion % per store + day
 *           (`date` -> { surveyStatus, totalItems, completedItems, completionPercent })
 */

export interface SurveyDateColumn {
  /** ISO date (YYYY-MM-DD); the UI renders it as DD-MM-YYYY. */
  date: string;
}

export interface SurveyDateCell {
  /** Daily survey execution ID for drill-down. */
  dailySurveyId: number;
  /** Master survey ID. */
  surveyId: number;
  /** Survey name. */
  surveyName: string;
  /** Survey status for that store + day. */
  surveyStatus: string;
  /** Total items in the survey. */
  totalItems: number;
  /** Completed items in the survey. */
  completedItems: number;
  /** Completion percentage. */
  completionPercent: number;
}

export interface SurveyDateRow {
  storeId: number;
  storeName: string;
  storeCode: string;
  city?: string;
  state?: string;
  /** Sparse map of date (YYYY-MM-DD) -> array of cell stats; missing keys mean no surveys. */
  values: Record<string, SurveyDateCell[]>;
}

export interface SurveyDateFilters {
  storeIds?: number[];
  city?: string;
  surveyId?: number;
  fromDate?: string;
  toDate?: string;
}

export interface StoreSurveyDateWiseResponse {
  filters: SurveyDateFilters;
  /** Every calendar day column in the selected range. */
  dates: SurveyDateColumn[];
  rows: SurveyDateRow[];
}
