export interface SurveyWithStatus {
  surveyId: number
  surveyName: string
  dailySurveyId?: number | null
  surveyStatus?: string | null
  totalItems?: number
  completedItems?: number
  submittedBy?: { userId: number; firstName: string; lastName: string; emailId?: string } | null
  submittedAt?: string | null
  verifiedBy?: { userId: number; firstName: string; lastName: string; emailId?: string } | null
  verifiedAt?: string | null
}

export interface SurveyEntry {
  surveyEntryId: number
  dailySurveyId: number
  surveyItemId: number
  stockOutCount: number
  isRackClean: boolean
  isBoardAvailable: boolean
  actionTaken?: string | null
  entryStatus: string
  submittedBy?: { userId: number; firstName: string; lastName: string; emailId?: string } | null
  submittedAt: string
  createdAt: string
  updatedAt: string
}

export interface CreateSurveySubmissionDto {
  surveyId: number
  storeId: number
  surveyDate: string
  submittedBy: number
}

export interface UpdateSurveyEntryDto {
  stockOutCount?: number
  isRackClean?: boolean
  isBoardAvailable?: boolean
  actionTaken?: string
  entryStatus?: string
}

export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T
}