export interface User {
  userId: number
  userName: string
  firstName: string
  middleName?: string
  lastName: string
  emailId: string
  mobile?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  role: {
    roleId: number
    roleName: string
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  success: boolean
  code: string
  message: string
  data: {
    accessToken: string
    refreshToken: string
    user: User
  }
}

export interface LoginRequest {
  userName: string
  password: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

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