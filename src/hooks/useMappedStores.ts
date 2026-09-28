import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth'
import { onboardingService } from '../services/apiManager'
import type { Store } from '../types/user-store'

export interface UseMappedStoresResult {
  /** Active stores mapped to the logged-in user, sorted by store name. */
  stores: Store[]
  /** storeIds of `stores` (same order) — handy for the reports' `storeIds` filter. */
  storeIds: number[]
  isLoading: boolean
  error: string | null
  /** Re-fetch the mapping (e.g. retry after a network error). */
  refresh: () => void
}

/**
 * useMappedStores — the single source of truth for the store list shown on the
 * staff-portal report pages.
 *
 * Staff users must only ever see the stores that are mapped to them via the
 * user-store mapping (`GET /user-stores/user/:userId`), never the full store
 * master list. Inactive mappings are excluded, matching My Tasks / Daily Survey.
 */
export function useMappedStores(): UseMappedStoresResult {
  const { user } = useAuth()

  const [stores, setStores] = useState<Store[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refresh = useCallback(() => setReloadToken(token => token + 1), [])

  useEffect(() => {
    if (!user?.userId) {
      setStores([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const fetchStores = async () => {
      try {
        const response = await onboardingService.getUserStores(user.userId)
        if (cancelled) return
        const mappedStores = response.stores
          .filter(item => item.mapping?.isActive)
          .map(item => item.store)
          .sort((a, b) => (a.storeName || '').localeCompare(b.storeName || ''))
        setStores(mappedStores)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your mapped stores')
          setStores([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchStores()
    return () => { cancelled = true }
  }, [user?.userId, reloadToken])

  return {
    stores,
    // Memoised so consumers can safely use it in effect/callback dependency
    // arrays without re-running on every render.
    storeIds: useMemo(() => stores.map(store => store.storeId), [stores]),
    isLoading,
    error,
    refresh,
  }
}

/**
 * Resolve the store IDs to send to a report API.
 *
 * - No store selected  → the user's mapped stores (never the full store list).
 * - Stores selected    → the selection, intersected with the mapped stores so a
 *                        stale/foreign ID can never leak another store's data.
 *
 * The result is only empty when the user has no mapped stores at all, in which
 * case the caller should skip the API call entirely.
 */
export function resolveReportStoreIds(
  selectedStoreIds: number[],
  mappedStoreIds: number[],
): number[] {
  if (selectedStoreIds.length === 0) return mappedStoreIds

  const mapped = new Set(mappedStoreIds)
  const allowed = selectedStoreIds.filter(id => mapped.has(id))
  return allowed.length > 0 ? allowed : mappedStoreIds
}
