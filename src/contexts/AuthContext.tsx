import React, { useState, useEffect, useCallback, type ReactNode } from 'react'
import { authService } from '../services/auth'
import { tokenRefreshManager } from '../services/tokenRefresh'
import type { AuthState } from '../types/auth'
import { AuthContext, type AuthContextType } from './AuthContextType'
import {
  getStoredUserDetails,
  storeUserDetails,
  clearStoredUserDetails,
} from '../utils/auth'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    // Check if user is already authenticated on app load
    console.log('AuthContext: Checking authentication status on app load')
    checkAuthStatus()
  }, []) // Empty dependency array is correct here

  useEffect(() => {
    // Start token refresh monitoring when user is authenticated
    if (state.isAuthenticated) {
      tokenRefreshManager.startMonitoring()

      // Re-check token when user returns to tab (handles background tab throttling)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          tokenRefreshManager.startMonitoring()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      // Cleanup on unmount or when user logs out
      return () => {
        tokenRefreshManager.stopMonitoring()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [state.isAuthenticated])

  const checkAuthStatus = async () => {
    try {
      const { accessToken, refreshToken } = authService.getStoredTokens()
      
      if (accessToken && !authService.isTokenExpired()) {
        // Access token is valid, get user info
        // Prefer the full user details persisted in localStorage on login (they
        // contain the complete profile); fall back to the JWT-decoded user.
        let user = getStoredUserDetails()
        if (!user) {
          user = await authService.getCurrentUser()
          if (user) {
            storeUserDetails(user)
          }
        }
        if (user) {
          setState(prev => ({
            ...prev,
            user,
            isAuthenticated: true,
            isLoading: false,
          }))
        } else {
          // No user info available, clear tokens
          authService.clearTokens()
          clearStoredUserDetails()
          setState(prev => ({
            ...prev,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          }))
        }
      } else if (refreshToken) {
        // Access token expired or missing, but refresh token exists - try to refresh
        console.log('AuthContext: Access token expired, attempting refresh...')
        try {
          const response = await authService.refreshToken(refreshToken)
          
          if (response.success && response.data) {
            // Refresh successful - store new tokens
            const { accessToken: newAccessToken, refreshToken: newRefreshToken, user } = response.data
            authService.setTokens(newAccessToken, newRefreshToken)
            storeUserDetails(user)
            
            console.log('AuthContext: Token refresh successful')
            setState(prev => ({
              ...prev,
              user,
              isAuthenticated: true,
              isLoading: false,
            }))
          } else {
            // Refresh failed - clear tokens
            console.log('AuthContext: Token refresh failed - invalid response')
            authService.clearTokens()
            clearStoredUserDetails()
            setState(prev => ({
              ...prev,
              user: null,
              isAuthenticated: false,
              isLoading: false,
            }))
          }
        } catch (refreshError) {
          // Refresh failed - clear tokens and show login
          console.error('AuthContext: Token refresh failed:', refreshError)
          authService.clearTokens()
          clearStoredUserDetails()
          setState(prev => ({
            ...prev,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          }))
        }
      } else {
        // No valid tokens - user needs to login
        clearStoredUserDetails()
        setState(prev => ({
          ...prev,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }))
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      }))
    }
  }

  const login = useCallback(async (userName: string, password: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await authService.login({ userName, password })

      if (response.success) {
        const { accessToken, refreshToken, user } = response.data
        authService.setTokens(accessToken, refreshToken)
        // Persist the full user details so Profile, Layout, etc. can use them
        // (also after a page refresh) where the JWT only carries a subset of fields.
        storeUserDetails(user)

        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }))
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      }))
      throw error
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear the persisted user details too
      clearStoredUserDetails()
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        error: null,
      }))
    }
  }, [])

  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const value: AuthContextType = React.useMemo(() => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    clearError,
  }), [state.user, state.isAuthenticated, state.isLoading, state.error, login, logout, clearError])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}