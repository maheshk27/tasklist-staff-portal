/**
 * API Manager for micro-service architecture
 * Provides a centralized way to interact with different micro-services
 */

import { decodeToken, getStoredTokens } from '../utils/auth'
import { onboardingApi, taskApi } from './api'
import type { LoginRequest, AuthResponse, User } from '../types/auth'
import type { UserStoresResponseDto } from '../types/user-store'
import type { TaskExecution } from '../types/task-execution'
import type { TaskChecklistExecution, UpdateTaskChecklistExecutionDto, UpdateTaskExecutionDto } from '../types/task-checklist-execution'
import type { EvidenceResponseDto } from '../types/evidence'

export interface ApiResponse<T = unknown> {
  success: boolean
  code: string
  message: string
  data?: T
  errors?: Array<{
    field: string
    message: string
  }>
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

/**
 * Onboarding Service API methods
 */
export const onboardingService = {
  /**
   * Authenticate user and get access token
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await onboardingApi.post<AuthResponse>('/auth/login', credentials)
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      throw new Error(errorMessage)
    }
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await onboardingApi.post<AuthResponse>('/auth/refresh', {
        refreshToken,
      })
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed'
      throw new Error(errorMessage)
    }
  },

  /**
   * Logout user (frontend-only)
   */
  async logout(): Promise<void> {
    // Frontend-only logout - clear tokens without API call
    localStorage.removeItem('staff_access_token')
    localStorage.removeItem('staff_refresh_token')
  },

  /**
   * Get current user information from /users/:id using userId from JWT token
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { accessToken } = getStoredTokens()
      if (!accessToken) return null

      const decoded = decodeToken(accessToken)
      if (!decoded?.userId) return null

      const response = await onboardingApi.get<ApiResponse<User>>(`/users/${decoded.userId}`)
      return response.data.data || null
    } catch {
      return null
    }
  },

  /**
   * Change own password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<ApiResponse<null>> {
    try {
      const response = await onboardingApi.post<ApiResponse<null>>('/users/change-password', passwordData)
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password'
      throw new Error(errorMessage)
    }
  },

  /**
   * Get user store mappings by user ID
   */
  async getUserStores(userId: number): Promise<UserStoresResponseDto> {
    try {
      const response = await onboardingApi.get<ApiResponse<UserStoresResponseDto>>(`/user-stores/user/${userId}`)
      if (!response.data.data) {
        throw new Error('User store mappings not found')
      }
      return response.data.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user stores'
      throw new Error(errorMessage)
    }
  },

  /**
   * Get all users assigned to a store
   */
  async getStoreUsers(storeId: number): Promise<StoreUsersDto> {
    try {
      const response = await onboardingApi.get<ApiResponse<StoreUsersDto>>(`/user-stores/store/${storeId}`)
      if (!response.data.data) {
        throw new Error('Store users not found')
      }
      return response.data.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch store users'
      throw new Error(errorMessage)
    }
  },
}

export interface StoreUserDetail {
  userId: number
  userName: string
  firstName: string
  middleName?: string
  lastName: string
  emailId?: string
  mobile?: string
  isActive: boolean
  role: {
    roleId: number
    roleName: string
  }
}

export interface StoreUserMapping {
  userStoreId: number
  isActive: boolean
  assignedAt: string
  unAssignedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StoreUserItem {
  user: StoreUserDetail
  mapping: StoreUserMapping
}

export interface StoreInfo {
  storeId: number
  storeName: string
  storeCode: string
  storeImageUrl?: string
  addressLine1: string
  addressLine2?: string
  country: string
  state: string
  city: string
  pinCode: string
  isActive: boolean
}

export interface StoreUsersDto {
  store: StoreInfo
  users: StoreUserItem[]
}

export const taskService = {
  /**
   * Get task execution by ID
   */
  async getTaskExecution(id: number): Promise<ApiResponse<TaskExecution>> {
    try {
      const response = await taskApi.get<ApiResponse<TaskExecution>>(`/task-executions/${id}`)
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch task execution'
      throw new Error(errorMessage)
    }
  },

  /**
   * Update task execution by ID
   */
  async updateTaskExecution(id: number, data: UpdateTaskExecutionDto): Promise<ApiResponse<TaskExecution>> {
    try {
      const response = await taskApi.put<ApiResponse<TaskExecution>>(`/task-executions/${id}`, data)
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update task execution'
      throw new Error(errorMessage)
    }
  },

  /**
   * Get checklist executions for a task execution
   */
  async getTaskChecklistExecutions(taskExecutionId: number): Promise<ApiResponse<TaskChecklistExecution[]>> {
    try {
      const response = await taskApi.get<ApiResponse<TaskChecklistExecution[]>>('/task-checklist-executions', {
        params: { taskExecutionId },
      })
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch checklist executions'
      throw new Error(errorMessage)
    }
  },

  /**
   * Update a checklist execution by ID
   */
  async updateTaskChecklistExecution(id: number, data: UpdateTaskChecklistExecutionDto): Promise<ApiResponse<TaskChecklistExecution>> {
    try {
      const response = await taskApi.put<ApiResponse<TaskChecklistExecution>>(`/task-checklist-executions/${id}`, data)
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update checklist execution'
      throw new Error(errorMessage)
    }
  },

  /**
   * Get a single task checklist execution by ID
   */
  async getTaskChecklistExecution(id: number): Promise<ApiResponse<TaskChecklistExecution>> {
    try {
      const response = await taskApi.get<ApiResponse<TaskChecklistExecution>>(`/task-checklist-executions/${id}`)
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch checklist execution'
      throw new Error(errorMessage)
    }
  },

  /**
   * Get evidence files for a task checklist execution
   */
  async getChecklistEvidence(checklistExecutionId: number): Promise<ApiResponse<EvidenceResponseDto[]>> {
    try {
      const response = await taskApi.get<ApiResponse<EvidenceResponseDto[]>>(`/evidence/task-checklist-execution/${checklistExecutionId}`)
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch evidence'
      throw new Error(errorMessage)
    }
  },

  /**
   * Get evidence files for a task execution
   */
  async getTaskEvidence(taskExecutionId: number): Promise<ApiResponse<EvidenceResponseDto[]>> {
    try {
      const response = await taskApi.get<ApiResponse<EvidenceResponseDto[]>>(`/evidence/task-execution/${taskExecutionId}`)
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch evidence'
      throw new Error(errorMessage)
    }
  },

  /**
   * Delete evidence by ID
   */
  async deleteEvidence(taskEvidenceId: number): Promise<ApiResponse<EvidenceResponseDto>> {
    try {
      const response = await taskApi.delete<ApiResponse<EvidenceResponseDto>>(`/evidence/${taskEvidenceId}`)
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete evidence'
      throw new Error(errorMessage)
    }
  },

  /**
   * Upload evidence file for a task execution
   * Uses FormData with multipart/form-data content type
   */
  async uploadTaskEvidence(taskExecutionId: number, file: File): Promise<ApiResponse<EvidenceResponseDto>> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await taskApi.post<ApiResponse<EvidenceResponseDto>>(
        `/evidence/task-execution/${taskExecutionId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      )
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload evidence'
      throw new Error(errorMessage)
    }
  },

  /**
   * Upload evidence file for a task checklist execution
   * Uses FormData with multipart/form-data content type
   */
  async uploadChecklistEvidence(checklistExecutionId: number, file: File): Promise<ApiResponse<EvidenceResponseDto>> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await taskApi.post<ApiResponse<EvidenceResponseDto>>(
        `/evidence/task-checklist-execution/${checklistExecutionId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      )
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload evidence'
      throw new Error(errorMessage)
    }
  },

  /**
   * Today's tasks for a store
   */
  async getTodaysTasks(storeId: number): Promise<ApiResponse<TaskExecution[]>> {
    try {
      const response = await taskApi.get<ApiResponse<TaskExecution[]>>('/task-executions/todays-task', {
        params: { storeId },
      })
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch today\'s tasks'
      throw new Error(errorMessage)
    }
  },

  /**
   * Get historical task executions by date for a store
   */
  async getHistoricalTasks(storeId: number, date: string): Promise<ApiResponse<TaskExecution[]>> {
    try {
      const response = await taskApi.get<ApiResponse<TaskExecution[]>>(`/task-executions/historical-task/${date}`, {
        params: { storeId },
      })
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch historical tasks'
      throw new Error(errorMessage)
    }
  },

  /**
   * Get all task executions with filters (for team view)
   */
  async getAllTaskExecutions(filters: {
    storeId?: number
    userId?: number
    executionDateFrom?: string
    executionDateTo?: string
    executionStatus?: string
  }): Promise<ApiResponse<TaskExecution[]>> {
    try {
      const response = await taskApi.get<ApiResponse<TaskExecution[]>>('/task-executions', {
        params: filters,
      })
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch task executions'
      throw new Error(errorMessage)
    }
  },

  /**
   * Get all task executions for a specific date (for team view)
   */
  async getTodaysTasksByStore(storeId: number, userId?: number): Promise<ApiResponse<TaskExecution[]>> {
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      const params: Record<string, string | number> = { storeId, executionDateFrom: today, executionDateTo: today }
      if (userId) {
        params.userId = userId
      }
      const response = await taskApi.get<ApiResponse<TaskExecution[]>>('/task-executions', {
        params,
      })
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch today\'s tasks'
      throw new Error(errorMessage)
    }
  },

  /**
   * Get historical task executions by date for team view
   */
  async getHistoricalTasksByStore(storeId: number, date: string, userId?: number): Promise<ApiResponse<TaskExecution[]>> {
    try {
      const params: Record<string, string | number> = { storeId, executionDateFrom: date, executionDateTo: date }
      if (userId) {
        params.userId = userId
      }
      const response = await taskApi.get<ApiResponse<TaskExecution[]>>('/task-executions', {
        params,
      })
      return response.data
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch historical tasks'
      throw new Error(errorMessage)
    }
  },
}

export default {
  onboarding: onboardingService,
}
