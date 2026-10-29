import { useCallback, useEffect, useMemo, useState } from 'react'
import { onboardingService } from '../services/apiManager'
import { useAuth } from './useAuth'

export type PermissionAction = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE'

export interface PermissionsState {
  /** Flat list of granted permission codes for the current user role */
  permissions: string[]
  loading: boolean
  error: string | null
  /** True when the user holds the exact permission code */
  has: (permissionCode: string) => boolean
  /** True when the user holds <moduleCode>_<ACTION> */
  can: (moduleCode: string, action: PermissionAction) => boolean
  refresh: () => Promise<void>
}

const cacheKey = (roleName: string) => `permissions:${roleName}`

const readCache = (roleName?: string): string[] | null => {
  if (!roleName) return null
  try {
    const raw = sessionStorage.getItem(cacheKey(roleName))
    return raw ? (JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

/** Clear cached permissions — call this on logout. */
export const clearPermissionsCache = (roleName?: string): void => {
  try {
    if (roleName) {
      sessionStorage.removeItem(cacheKey(roleName))
      return
    }
    Object.keys(sessionStorage)
      .filter(key => key.startsWith('permissions:'))
      .forEach(key => sessionStorage.removeItem(key))
  } catch {
    // ignore storage errors
  }
}

const writeCache = (roleName: string, permissions: string[]): void => {
  try {
    sessionStorage.setItem(cacheKey(roleName), JSON.stringify(permissions))
  } catch {
    // ignore storage errors
  }
}

/**
 * Loads the permission codes for the signed-in user's role and exposes helpers
 * for gating UI actions. Cached per role in sessionStorage.
 */
export const usePermissions = (): PermissionsState => {
  const { user } = useAuth()
  const roleName = user?.role?.roleName

  const [permissions, setPermissions] = useState<string[]>(() => readCache(roleName) ?? [])
  const [loading, setLoading] = useState<boolean>(() => !!roleName && !readCache(roleName))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!roleName) {
      setPermissions([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await onboardingService.getMyPermissions()
      const codes = data.permissions || []
      setPermissions(codes)
      writeCache(roleName, codes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions')
    } finally {
      setLoading(false)
    }
  }, [roleName])

  useEffect(() => {
    const cached = readCache(roleName)
    if (cached) {
      setPermissions(cached)
      setLoading(false)
      return
    }
    refresh()
  }, [roleName, refresh])

  const permissionSet = useMemo(() => new Set(permissions), [permissions])

  const has = useCallback((permissionCode: string) => permissionSet.has(permissionCode), [permissionSet])

  const can = useCallback(
    (moduleCode: string, action: PermissionAction) => permissionSet.has(`${moduleCode}_${action}`),
    [permissionSet],
  )

  return { permissions, loading, error, has, can, refresh }
}
