/**
 * Token Refresh Manager
 *
 * Simple class-based manager that monitors token expiry and schedules refresh
 * using setTimeout. Refreshes token before it expires to prevent 401 errors.
 *
 * Usage:
 *   tokenRefreshManager.startMonitoring()  // Start on login
 *   tokenRefreshManager.stopMonitoring()   // Stop on logout
 */

import { authService } from './auth'
import { decodeToken } from '../utils/auth'

const REFRESH_THRESHOLD = 1 * 60 * 1000 // Refresh 1 minute before expiry (in milliseconds)

class TokenRefreshManager {
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private isRefreshing = false

  /**
   * Start monitoring token expiry and schedule refresh
   */
  startMonitoring(): void {
    this.stopMonitoring() // Clear any existing timer

    const token = localStorage.getItem('staff_access_token')
    if (!token) {
      console.warn('No access token found, skipping refresh monitoring')
      return
    }

    const decoded = decodeToken(token)
    if (!decoded || !decoded.exp) {
      console.warn('Invalid token expiry, skipping refresh monitoring')
      return
    }

    // Calculate when to refresh (expiry time - threshold)
    const expiryTime = decoded.exp * 1000 // Convert to milliseconds
    const refreshTime = expiryTime - REFRESH_THRESHOLD
    const timeUntilRefresh = Math.max(0, refreshTime - Date.now())

    const refreshAt = new Date(Date.now() + timeUntilRefresh)
    console.log(`Token refresh scheduled at ${refreshAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (${Math.round(timeUntilRefresh / 1000)}s from now)`)

    this.refreshTimer = setTimeout(() => {
      this.refreshToken()
    }, timeUntilRefresh)
  }

  /**
   * Stop monitoring and clear timer
   */
  stopMonitoring(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /**
   * Refresh the access token using refresh token
   */
  private async refreshToken(): Promise<void> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshing) {
      console.log('Token refresh already in progress')
      return
    }

    const refreshToken = localStorage.getItem('staff_refresh_token')
    if (!refreshToken) {
      console.error('No refresh token available')
      this.handleRefreshFailure()
      return
    }

    this.isRefreshing = true

    try {
      const response = await authService.refreshToken(refreshToken)

      if (response.success && response.data) {
        // Store new tokens
        localStorage.setItem('staff_access_token', response.data.accessToken)
        localStorage.setItem('staff_refresh_token', response.data.refreshToken)

        // Start monitoring the new token
        this.startMonitoring()
      } else {
        throw new Error(response.message || 'Token refresh failed')
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      this.handleRefreshFailure()
    } finally {
      this.isRefreshing = false
    }
  }

  /**
   * Handle refresh failure - logout user
   */
  private handleRefreshFailure(): void {
    this.stopMonitoring()
    localStorage.removeItem('staff_access_token')
    localStorage.removeItem('staff_refresh_token')
    localStorage.removeItem('staff_user')
    window.location.href = '/login'
  }

  /**
   * Check if currently refreshing
   */
  isCurrentlyRefreshing(): boolean {
    return this.isRefreshing
  }
}

// Create singleton instance
export const tokenRefreshManager = new TokenRefreshManager()
