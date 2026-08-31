import type { ApiResponse } from './auth'

export type LoginStatus = 'SUCCESS' | 'FAILED'

export interface LoginLog {
  loginLogId: number
  userId?: number
  userName: string
  ipAddress?: string
  userAgent?: string
  loginStatus: LoginStatus
  failureReason?: string
  createdAt: string
}

export interface LoginLogListResponse extends ApiResponse<LoginLog[]> {}