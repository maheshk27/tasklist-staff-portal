import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { authService } from '../services/auth'
import { useNotifications } from '../hooks/useNotifications'
import type { User, AuthState } from '../types/auth'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (userName: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

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

  const { requestPermission } = useNotifications()

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
        const user = await authService.getCurrentUser()
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
          setState(prev => ({
            ...prev,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          }))
        }
      } else {
        // No valid token
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

        setState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        }))

        // Request notification permission after successful login
        try {
          await requestPermission()
        } catch (error) {
          console.error('Failed to request notification permission:', error)
          // Don't fail login if notifications fail
        }
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
  }, [requestPermission])

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
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