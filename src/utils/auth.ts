/**
 * Utility functions for authentication and token management
 * Used by staff portal
 */

export interface DecodedToken {
  userId: number
  userName: string
  role: {
    roleId: number
    roleName: string
  }
  iat: number
  exp: number
  user?: unknown // For backward compatibility
}

/**
 * Decode JWT token payload
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    if (!token || typeof token !== 'string') {
      return null
    }

    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = parts[1]
    const decoded = JSON.parse(atob(payload))
    
    return decoded
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) {
    return true
  }

  const currentTime = Date.now() / 1000
  return decoded.exp < currentTime
}

/**
 * Get token expiration time in milliseconds
 */
export function getTokenExpirationTime(token: string): number | null {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) {
    return null
  }

  return decoded.exp * 1000
}

/**
 * Calculate time until token expires (in milliseconds)
 */
export function getTimeUntilExpiration(token: string): number {
  const expirationTime = getTokenExpirationTime(token)
  if (!expirationTime) {
    return 0
  }

  const currentTime = Date.now()
  return Math.max(0, expirationTime - currentTime)
}

/**
 * Format time in milliseconds to human readable format
 */
export function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Check if we should refresh the token (within 5 minutes of expiration)
 */
export function shouldRefreshToken(token: string): boolean {
  const timeUntilExpiration = getTimeUntilExpiration(token)
  const fiveMinutes = 5 * 60 * 1000 // 5 minutes in milliseconds
  
  return timeUntilExpiration <= fiveMinutes && timeUntilExpiration > 0
}

/**
 * Store tokens in localStorage with error handling
 */
export function storeTokens(accessToken: string, refreshToken: string): boolean {
  try {
    localStorage.setItem('staff_access_token', accessToken)
    localStorage.setItem('staff_refresh_token', refreshToken)
    return true
  } catch (error) {
    console.error('Error storing tokens:', error)
    return false
  }
}

/**
 * Clear tokens from localStorage
 */
export function clearTokens(): void {
  try {
    localStorage.removeItem('staff_access_token')
    localStorage.removeItem('staff_refresh_token')
  } catch (error) {
    console.error('Error clearing tokens:', error)
  }
}

/**
 * Get stored tokens
 */
export function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  try {
    return {
      accessToken: localStorage.getItem('staff_access_token'),
      refreshToken: localStorage.getItem('staff_refresh_token'),
    }
  } catch (error) {
    console.error('Error getting stored tokens:', error)
    return { accessToken: null, refreshToken: null }
  }
}