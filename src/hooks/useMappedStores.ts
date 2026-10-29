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
 * staff-portal report/analytics pages.
 *
 * Staff users must only ever see the stores that are mapped to them via the
 * user-store mapping (`GET /user-stores/user/:userId`), never the full store
 * master list. Inactive mappings are excluded, matching My Tasks / Daily Survey.
 *
 * The mapping is requested once per user and shared between every component
 * that needs it (a page can mount several of these hooks), so opening the
 * Analytics page costs a single `/user-stores` call instead of one per chart.
 */

interface StoresCacheEntry {
  stores: Store[]
  timestamp: number
}

/** Short TTL: the mapping changes rarely, but a refresh must still take effect. */
const CACHE_TTL_MS = 60_000
const storesCache = new Map<number, StoresCacheEntry>()
const inflightRequests = new Map<number, Promise<Store[]>>()

/** Fetch + normalise the mapped stores for a user, de-duplicating concurrent calls. */
function loadMappedStores(userId: number, force = false): Promise<Store[]> {
  if (!force) {
    const cached = storesCache.get(userId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return Promise.resolve(cached.stores)
    }
    const pending = inflightRequests.get(userId)
    if (pending) return pending
  }

  const request = onboardingService
    .getUserStores(userId)
    .then(response => {
      const mappedStores = response.stores
        .filter(item => item.mapping?.isActive)
        .map(item => item.store)
        .sort((a, b) => (a.storeName || '').localeCompare(b.storeName || ''))
      storesCache.set(userId, { stores: mappedStores, timestamp: Date.now() })
      return mappedStores
    })
    .finally(() => {
      inflightRequests.delete(userId)
    })

  inflightRequests.set(userId, request)
  return request
}

export function useMappedStores(): UseMappedStoresResult {
  const { user } = useAuth()

  const userId = user?.userId
  const [reloadToken, setReloadToken] = useState(0)

  // `resolvedKey` records which (user + reload) combination the stored result
  // belongs to, so "loading" can be derived instead of set synchronously inside
  // the effect (which the React Compiler lint rules disallow).
  const [state, setState] = useState<{ resolvedKey: string | null; stores: Store[]; error: string | null }>({
    resolvedKey: null,
    stores: [],
    error: null,
  })

  const requestKey = `${userId ?? 'none'}:${reloadToken}`

  // Refresh bypasses the cache so "Refresh" always hits the API.
  const refresh = useCallback(() => {
    if (userId) storesCache.delete(userId)
    setReloadToken(token => token + 1)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    // Cached reads resolve in a microtask and fresh reads after the request, so
    // every setState below happens asynchronously.
    loadMappedStores(userId, reloadToken > 0)
      .then(mappedStores => {
        if (!cancelled) setState({ resolvedKey: requestKey, stores: mappedStores, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            resolvedKey: requestKey,
            stores: [],
            error: err instanceof Error ? err.message : 'Failed to load your mapped stores',
          })
        }
      })

    return () => { cancelled = true }
  }, [userId, reloadToken, requestKey])

  const stores = useMemo(() => (userId ? state.stores : []), [userId, state.stores])
  const error = userId ? state.error : null
  const isLoading = Boolean(userId) && state.resolvedKey !== requestKey

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
