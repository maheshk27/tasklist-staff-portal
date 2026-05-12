import { onboardingService } from './apiManager'
import type { LoginRequest, AuthResponse, User } from '../types/auth'
import { decodeToken, isTokenExpired, getStoredTokens, storeTokens, clearTokens } from '../utils/auth'

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return onboardingService.login(credentials)
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    return onboardingService.refreshToken(refreshToken)
  },

  async logout(): Promise<void> {
    return onboardingService.logout()
  },

  getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
    return getStoredTokens()
  },

  async getCurrentUser(): Promise<User | null> {
    // First try to fetch user from API
    const userFromApi = await onboardingService.getCurrentUser()
    if (userFromApi) {
      return userFromApi
    }

    // Fall back to decoding token
    const { accessToken } = getStoredTokens()
    if (!accessToken) return null

    try {
      const decoded = decodeToken(accessToken)
      if (!decoded) return null
      
      // Return user info from decoded token
      const userFromToken = decoded.user as User | undefined
      return {
        userId: decoded.userId,
        userName: decoded.userName,
        firstName: userFromToken?.firstName || '',
        lastName: userFromToken?.lastName || '',
        emailId: userFromToken?.emailId || '',
        role: decoded.role,
        isActive: true, // Default to true for authenticated users
        createdAt: new Date().toISOString(), // Current timestamp
        updatedAt: new Date().toISOString(), // Current timestamp
      }
    } catch {
      return null
    }
  },

  isTokenExpired(): boolean {
    const { accessToken } = getStoredTokens()
    if (!accessToken) return true

    return isTokenExpired(accessToken)
  },

  setTokens(accessToken: string, refreshToken: string): void {
    storeTokens(accessToken, refreshToken)
  },

  clearTokens(): void {
    clearTokens()
  },
}