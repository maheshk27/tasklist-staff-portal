import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { taskService } from '../../services/apiManager'
import type { StoreDateWiseChecklistRow } from '../../types/store-date-wise-checklist-completion'
import {
  getTodayString,
  prettyStatus,
  STATUS_CARD_STYLES,
  DEFAULT_STATUS_CARD_STYLE,
  completionColor,
} from '../../utils/dashboard-overview'
import StatusChip from './StatusChip'

interface TodayStoreChecklistOverviewProps {
  /** Store IDs from the logged-in user's store mapping (never the full store list). */
  storeIds: number[]
  /** False while the store mapping is still loading. */
  storesReady: boolean
  /** Store-mapping load error, surfaced instead of a report error. */
  storesError?: string | null
}

/** One store's checklist aggregates for today. */
interface StoreOverviewCard {
  storeId: number
  storeName: string
  storeCode: string
  city?: string
  total: number
  completed: number
  statusCounts: Record<string, number>
  completionPercent: number
}

/**
 * Today's Store Checklist Overview.
 *
 * Ported from the admin-portal dashboard, with staff-portal scoping: the report
 * is always requested for the logged-in user's mapped stores only (inactive
 * mappings excluded), never for the whole store list.
 */
const TodayStoreChecklistOverview: React.FC<TodayStoreChecklistOverviewProps> = ({
  storeIds,
  storesReady,
  storesError,
}) => {
  const [storeOverview, setStoreOverview] = useState<StoreDateWiseChecklistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showStoreSummary, setShowStoreSummary] = useState(false)

  const fetchStoreOverview = useCallback(async () => {
    // Never call the report without a store scope: the API would return every store.
    if (storeIds.length === 0) {
      setStoreOverview([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const today = getTodayString()
      const data = await taskService.getStoreDateWiseChecklistCompletion({
        storeIds,
        fromDate: today,
        toDate: today,
      })
      setStoreOverview(data.rows || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load today's store data")
      setStoreOverview([])
    } finally {
      setLoading(false)
    }
  }, [storeIds])

  useEffect(() => {
    // Wait until the store mapping has resolved so the first fetch is scoped.
    if (!storesReady) return
    fetchStoreOverview()
  }, [storesReady, fetchStoreOverview])

  // Build grid cards from today's report data (each row has one cell for today).
  const storeCards: StoreOverviewCard[] = storeOverview.map(row => {
    const today = getTodayString()
    const cell = row.values[today]
    const total = cell?.total || 0
    const completed = cell?.completed || 0
    const statusCounts = cell?.statusCounts || {}
    const completionPercent = cell?.completionPercent ?? (total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0)
    return {
      storeId: row.storeId,
      storeName: row.storeName,
      storeCode: row.storeCode,
      city: row.city,
      total,
      completed,
      statusCounts,
      completionPercent,
    }
  }).filter(card => card.total > 0 || card.storeName)

  // Overall status-wise summary counts across all stores for today.
  // Status counts are aggregated dynamically from the data so any future status
  // (e.g. OVERDUE) is included automatically without code changes.
  const overallStatusCounts: Record<string, number> = {}
  const overallTotals = storeCards.reduce((acc, card) => {
    acc.total += card.total
    acc.completed += card.completed
    Object.entries(card.statusCounts || {}).forEach(([status, count]) => {
      overallStatusCounts[status] = (overallStatusCounts[status] || 0) + count
    })
    return acc
  }, { total: 0, completed: 0 })

  const overallCompletionPercent = overallTotals.total > 0
    ? Number(((overallTotals.completed / overallTotals.total) * 100).toFixed(1))
    : 0

  // Statuses actually present in today's data, ascending for stable ordering.
  const overallStatusList = Object.entries(overallStatusCounts)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b))

  // Summary blocks / store grid only render when there is data to show and the
  // store scope is usable.
  const showSummaryBlocks = !loading && !error && storeCards.length > 0

  return (
    <div className="bg-card p-6 rounded-xl border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-md font-semibold">Today&apos;s Store Checklist Overview</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStoreOverview}
            disabled={loading || storeIds.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            title="Refresh today's store data"
          >
            <svg
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <Link
            to="/store-date-wise-checklist-completion"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            View full report
          </Link>
        </div>
      </div>

      {/* Overall status-wise summary */}
      {showSummaryBlocks && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {overallStatusList.map(([status, count]) => {
            const style = STATUS_CARD_STYLES[status] || DEFAULT_STATUS_CARD_STYLE
            return (
              <div key={status} className={`rounded-xl border border-border p-4 text-center ${style.card}`}>
                <p className={`text-xs font-medium uppercase tracking-wider ${style.label}`}>
                  {prettyStatus(status)}
                </p>
                <p className={`mt-1 text-2xl font-bold ${style.count}`}>{count}</p>
              </div>
            )
          })}
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completion %</p>
            <p className={`mt-1 text-2xl font-bold ${completionColor(overallCompletionPercent)}`}>
              {overallCompletionPercent}%
            </p>
          </div>
        </div>
      )}
      {/* Top & Low Performing Stores */}
      {showSummaryBlocks && storeCards.length > 1 && (() => {
        const sorted = [...storeCards].sort((a, b) => b.completionPercent - a.completionPercent)
        const topStores = sorted.slice(0, 3)
        const lowStores = sorted.slice(-3).reverse()
        return (
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Top Performing Stores */}
            <div className="rounded-xl border border-border bg-green-50/50 p-4">
              <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                <span>🏆</span> Top Performing Stores
              </h4>
              <div className="space-y-3">
                {topStores.map((card, idx) => (
                  <div key={card.storeId} className="flex items-center gap-3 rounded-lg bg-background p-3 border border-border">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate" title={card.storeName}>{card.storeName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[card.storeCode, card.city].filter(Boolean).join(' • ') || '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${completionColor(card.completionPercent)}`}>
                        {card.completionPercent}%
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {card.completed}/{card.total}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Performing Stores */}
            <div className="rounded-xl border border-border bg-red-50/50 p-4">
              <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                <span>⚠️</span> Low Performing Stores
              </h4>
              <div className="space-y-3">
                {lowStores.map((card, idx) => (
                  <div key={card.storeId} className="flex items-center gap-3 rounded-lg bg-background p-3 border border-border">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate" title={card.storeName}>{card.storeName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[card.storeCode, card.city].filter(Boolean).join(' • ') || '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${completionColor(card.completionPercent)}`}>
                        {card.completionPercent}%
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {card.completed}/{card.total}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* View Store Wise Summary Toggle */}
      {showSummaryBlocks && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowStoreSummary(prev => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg
              className={`h-4 w-4 transition-transform ${showStoreSummary ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {showStoreSummary ? 'Hide' : 'View'} Store Wise Summary
          </button>
        </div>
      )}

      {storesError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{storesError}</p>
        </div>
      ) : !storesReady ? (
        <div className="flex items-center justify-center py-14">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : storeIds.length === 0 ? (
        <div className="py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <span className="text-2xl">🏪</span>
          </div>
          <p className="text-sm text-muted-foreground">No stores are mapped to your account.</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-14">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : storeCards.length === 0 ? (
        <div className="py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <span className="text-2xl">🏪</span>
          </div>
          <p className="text-sm text-muted-foreground">No checklist executions found for today.</p>
        </div>
      ) : (
        showStoreSummary && (
          // Store cards grid
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {storeCards.map((card) => {
              const statusList = Object.entries(card.statusCounts).filter(([, c]) => c > 0)
              const barWidth = Math.min(100, card.completionPercent)
              return (
                <div key={card.storeId} className="rounded-xl border border-border bg-background p-4 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate" title={card.storeName}>{card.storeName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[card.storeCode, card.city].filter(Boolean).join(' • ') || '—'}
                      </p>
                    </div>
                    <span className={`text-lg font-bold whitespace-nowrap ${completionColor(card.completionPercent)}`}>
                      {card.completionPercent}%
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Completed</span>
                      <span>{card.completed}/{card.total}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${card.completionPercent >= 75 ? 'bg-green-500' : card.completionPercent >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${barWidth}%` }}
                      ></div>
                    </div>
                  </div>

                  {statusList.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1 pt-3 border-t border-border">
                      {statusList.map(([status, count]) => (
                        <StatusChip key={status} status={status} count={count} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

export default TodayStoreChecklistOverview