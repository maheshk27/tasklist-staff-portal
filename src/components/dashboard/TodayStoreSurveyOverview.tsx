import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { taskService } from '../../services/apiManager'
import type { StoreSurveyDateWiseResponse, SurveyDateCell } from '../../types/store-survey-date-wise-completion'
import {
  getTodayString,
  prettyStatus,
  STATUS_CARD_STYLES,
  DEFAULT_STATUS_CARD_STYLE,
  completionColor,
} from '../../utils/dashboard-overview'
import StatusChip from './StatusChip'
import ChartCard, { ChartStatePanel } from '../charts/ChartCard'
import CompletionTrendChart, { type TrendPoint } from '../charts/CompletionTrendChart'
import StatusDonutChart from '../charts/StatusDonutChart'
import { localDateString } from '../../hooks/useAnalyticsData'

/** Days of history pulled for the mini trend chart (today included). */
const TREND_DAYS = 7

interface TodayStoreSurveyOverviewProps {
  /** Store IDs from the logged-in user's store mapping (never the full store list). */
  storeIds: number[]
  /** False while the store mapping is still loading. */
  storesReady: boolean
  /** Store-mapping load error, surfaced instead of a report error. */
  storesError?: string | null
}

/** One store's survey aggregates for today (all of today's surveys combined). */
interface SurveyOverviewCard {
  storeId: number
  storeName: string
  storeCode: string
  city?: string
  surveyCount: number
  totalItems: number
  completedItems: number
  statusCounts: Record<string, number>
  completionPercent: number
}

/**
 * Today's Store Survey Overview.
 *
 * Ported from the admin-portal dashboard, with staff-portal scoping: the report
 * is always requested for the logged-in user's mapped stores only (inactive
 * mappings excluded), never for the whole store list.
 */
const TodayStoreSurveyOverview: React.FC<TodayStoreSurveyOverviewProps> = ({
  storeIds,
  storesReady,
  storesError,
}) => {
  const [surveyOverview, setSurveyOverview] = useState<StoreSurveyDateWiseResponse | null>(null)
  const [dateColumns, setDateColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSurveyStoreSummary, setShowSurveyStoreSummary] = useState(false)

  const fetchSurveyOverview = useCallback(async () => {
    // Never call the report without a store scope: the API would return every store.
    if (storeIds.length === 0) {
      setSurveyOverview(null)
      setDateColumns([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const today = getTodayString()
      // One request covers both the today cards and the 7-day trend chart.
      const data = await taskService.getStoreSurveyDateWiseCompletion({
        storeIds,
        fromDate: localDateString(TREND_DAYS - 1),
        toDate: today,
      })
      setSurveyOverview(data)
      setDateColumns((data.dates || []).map(column => column.date))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load today's survey data")
      setSurveyOverview(null)
      setDateColumns([])
    } finally {
      setLoading(false)
    }
  }, [storeIds])

  useEffect(() => {
    // Wait until the store mapping has resolved so the first fetch is scoped.
    if (!storesReady) return
    fetchSurveyOverview()
  }, [storesReady, fetchSurveyOverview])

  // Build survey grid cards from today's survey report data.
  // Each row may have multiple surveys for today, so we aggregate them.
  const surveyCards: SurveyOverviewCard[] = (surveyOverview?.rows || []).map(row => {
    const today = getTodayString()
    const cells: SurveyDateCell[] = row.values[today] || []

    // Aggregate all surveys for this store on today
    const totalItems = cells.reduce((sum, cell) => sum + (cell.totalItems || 0), 0)
    const completedItems = cells.reduce((sum, cell) => sum + (cell.completedItems || 0), 0)
    const completionPercent = totalItems > 0
      ? Number(((completedItems / totalItems) * 100).toFixed(1))
      : 0

    // Count statuses across all surveys for this store
    const statusCounts: Record<string, number> = {}
    cells.forEach(cell => {
      const status = cell.surveyStatus || 'NOT_STARTED'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    return {
      storeId: row.storeId,
      storeName: row.storeName,
      storeCode: row.storeCode,
      city: row.city,
      surveyCount: cells.length,
      totalItems,
      completedItems,
      statusCounts,
      completionPercent,
    }
  }).filter(card => card.surveyCount > 0 || card.storeName)

  // Overall survey status-wise summary counts across all stores for today.
  const surveyOverallStatusCounts: Record<string, number> = {}
  const surveyOverallTotals = surveyCards.reduce((acc, card) => {
    acc.totalItems += card.totalItems
    acc.completedItems += card.completedItems
    Object.entries(card.statusCounts || {}).forEach(([status, count]) => {
      surveyOverallStatusCounts[status] = (surveyOverallStatusCounts[status] || 0) + count
    })
    return acc
  }, { totalItems: 0, completedItems: 0 })

  const surveyOverallCompletionPercent = surveyOverallTotals.totalItems > 0
    ? Number(((surveyOverallTotals.completedItems / surveyOverallTotals.totalItems) * 100).toFixed(1))
    : 0

  // Survey statuses actually present in today's data, ascending for stable ordering.
  const surveyOverallStatusList = Object.entries(surveyOverallStatusCounts)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b))

  // Summary blocks / store grid only render when there is data to show and the
  // store scope is usable.
  const showSummaryBlocks = !loading && !error && surveyCards.length > 0

  // Daily survey item-completion trend across the mapped stores (same fetch).
  const trendPoints: TrendPoint[] = dateColumns.map(date => {
    let totalItems = 0
    let completedItems = 0
    ;(surveyOverview?.rows || []).forEach(row => {
      const cells: SurveyDateCell[] = row.values[date] || []
      cells.forEach(cell => {
        totalItems += cell.totalItems || 0
        completedItems += cell.completedItems || 0
      })
    })
    const percent = totalItems > 0 ? Number(((completedItems / totalItems) * 100).toFixed(1)) : 0
    // Groups: YYYY-MM-DD -> DD-MM-YYYY (skip indices: [0]=full, [1]=year…).
    const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})/.exec(date) || []
    return {
      label: year && month && day ? `${day}-${month}-${year}` : date,
      value: percent,
      secondary: `${completedItems}/${totalItems} items`,
    }
  })

  // Today's survey status mix, for the donut beside the trend.
  const todaySlices = surveyOverallStatusList.map(([status, count]) => ({ status, value: count }))

  const trendHasData = trendPoints.some(point => point.secondary !== '0/0 items')
  return (
    <div className="bg-card p-6 rounded-xl border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-md font-semibold">Today&apos;s Store Survey Overview</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSurveyOverview}
            disabled={loading || storeIds.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            title="Refresh today's survey data"
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
            to="/store-survey-date-wise-completion"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            View full report
          </Link>
        </div>
      </div>

      {/* 7-day trend + today's status mix */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Survey Completion Trend"
          subtitle={`Daily survey item completion across your ${storeIds.length || 0} mapped store${storeIds.length === 1 ? '' : 's'} (last ${TREND_DAYS} days)`}
          className="bg-background"
        >
          {storesError ? (
            <ChartStatePanel variant="error" message={storesError} />
          ) : !storesReady || loading ? (
            <ChartStatePanel variant="loading" />
          ) : storeIds.length === 0 ? (
            <ChartStatePanel variant="no-stores" />
          ) : error ? (
            <ChartStatePanel variant="error" message={error} />
          ) : !trendHasData ? (
            <ChartStatePanel variant="empty" message="No survey executions found in the last 7 days." />
          ) : (
            <CompletionTrendChart points={trendPoints} />
          )}
        </ChartCard>

        <ChartCard
          title="Today's Survey Status Mix"
          subtitle="Survey statuses recorded for today"
          className="bg-background"
        >
          {storesError ? (
            <ChartStatePanel variant="error" message={storesError} />
          ) : !storesReady || loading ? (
            <ChartStatePanel variant="loading" />
          ) : storeIds.length === 0 ? (
            <ChartStatePanel variant="no-stores" />
          ) : error ? (
            <ChartStatePanel variant="error" message={error} />
          ) : todaySlices.length === 0 ? (
            <ChartStatePanel variant="empty" message="No survey executions found for today." />
          ) : (
            <StatusDonutChart slices={todaySlices} centerLabel="Surveys" />
          )}
        </ChartCard>
      </div>

      {/* Overall status-wise summary */}
      {showSummaryBlocks && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {surveyOverallStatusList.map(([status, count]) => {
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
            <p className={`mt-1 text-2xl font-bold ${completionColor(surveyOverallCompletionPercent)}`}>
              {surveyOverallCompletionPercent}%
            </p>
          </div>
        </div>
      )}

      {/* View Store Wise Summary Toggle */}
      {showSummaryBlocks && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowSurveyStoreSummary(prev => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg
              className={`h-4 w-4 transition-transform ${showSurveyStoreSummary ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {showSurveyStoreSummary ? 'Hide' : 'View'} Store Wise Summary
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
            <span className="text-2xl">📊</span>
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
      ) : surveyCards.length === 0 ? (
        <div className="py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-sm text-muted-foreground">No survey executions found for today.</p>
        </div>
      ) : (
        showSurveyStoreSummary && (
          // Survey store cards grid
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {surveyCards.map((card) => {
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
                      <span>{card.completedItems}/{card.totalItems}</span>
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

export default TodayStoreSurveyOverview