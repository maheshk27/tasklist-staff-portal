import React, { useState, useEffect, useCallback, type ReactNode } from 'react'
import { authService } from '../services/auth'
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

  const checkAuthStatus = async () => {
    try {
      const { accessToken } = authService.getStoredTokens()
      
      if (accessToken && !authService.isTokenExpired()) {
        // Token is valid, get user info
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
          // Token is invalid, clear it
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
        // No valid token — also clear any stale user details
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