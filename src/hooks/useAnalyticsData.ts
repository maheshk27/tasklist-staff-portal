import { useCallback, useEffect, useMemo, useState } from 'react'
import { taskService } from '../services/apiManager'
import { useMappedStores } from './useMappedStores'
import type { StoreDateWiseChecklistRow } from '../types/store-date-wise-checklist-completion'
import type { StoreSurveyDateWiseResponse, SurveyDateCell } from '../types/store-survey-date-wise-completion'
import type { TaskExecutionReportResponse } from '../types/task-execution-report'
import type { Store } from '../types/user-store'
import type { RankingItem } from '../components/charts/StoreRankingBars'
import type { StackedBarGroup } from '../components/charts/StatusStackedBars'
import type { HeatmapCell } from '../components/charts/Heatmap'
import type { TrendPoint } from '../components/charts/CompletionTrendChart'
import type { OnTimeDelayedItem } from '../components/charts/OnTimeDelayedByStore'

/**
 * Analytics data hooks.
 *
 * Every hook is scoped to the logged-in user's mapped stores (`useMappedStores`)
 * and merges the API result with that mapping, so a mapped store with no
 * executions in the range still appears — as an explicit 0% — instead of being
 * silently dropped (which is what the raw pivot rows do).
 */

/** Days of history offered by the range presets on the Analytics page. */
export const ANALYTICS_RANGES = [7, 14, 30] as const
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number]

/** Local YYYY-MM-DD for a date offset by `daysAgo` days. */
export const localDateString = (daysAgo = 0): string => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today's ISO date (used by the dashboard mini-charts). */
export const todayString = (): string => localDateString(0)

/** DD-MM-YYYY label used on the chart axes/tooltips. */
const shortLabel = (isoDate: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  return match ? `${match[3]}-${match[2]}-${match[1]}` : isoDate
}

/** Percentage helper with one decimal (matches the reports). */
const percent = (completed: number, total: number): number =>
  total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0

/** Display order for statuses (same as the pivot reports). */
const STATUS_DISPLAY_ORDER = ['NOT_STARTED', 'IN_PROGRESS', 'PENDING', 'OVERDUE', 'COMPLETED', 'SKIPPED']

const sortStatuses = (statuses: string[]): string[] =>
  [...statuses].sort((a, b) => {
    const indexA = STATUS_DISPLAY_ORDER.indexOf(a)
    const indexB = STATUS_DISPLAY_ORDER.indexOf(b)
    const rankA = indexA === -1 ? STATUS_DISPLAY_ORDER.length : indexA
    const rankB = indexB === -1 ? STATUS_DISPLAY_ORDER.length : indexB
    return rankA !== rankB ? rankA - rankB : a.localeCompare(b)
  })

/** Store label helpers shared by the ranking + heatmap rows. */
const storeLabel = (store: Store): string => store.storeName || store.storeCode
const storeSubLabel = (store: Store): string => [store.storeCode, store.city].filter(Boolean).join(' • ')

/** Shared shape returned by the analytics hooks. */
export interface AnalyticsState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  /** True when the user has no mapped stores (charts should say so, not "no data"). */
  noMappedStores: boolean
  stores: Store[]
  refetch: () => void
}

/** One heatmap row shared by the completion and status-wise heatmaps. */
export interface AnalyticsHeatRow {
  id: number
  label: string
  subLabel?: string
  cells: HeatmapCell[]
}

export interface ChecklistAnalytics {
  /** Daily overall completion % across the mapped stores. */
  trend: TrendPoint[]
  /** Status mix per day (stacked bars). */
  statusByDay: StackedBarGroup[]
  /** All statuses seen in the range, in the report's display order. */
  statuses: string[]
  /** Per-store completion % ranking (idle mapped stores included as 0). */
  ranking: RankingItem[]
  /** Stores × days completion heatmap. */
  heatColumns: string[]
  heatRows: AnalyticsHeatRow[]
  /**
   * Status-wise heat rows keyed by status (same row order as `heatRows`).
   * Each cell's `value` is the status count normalised 0-100 against the
   * busiest cell in the grid; `display` carries the raw count.
   */
  heatByStatus: Record<string, AnalyticsHeatRow[]>
  /** Range totals. */
  totals: { total: number; completed: number; completionPercent: number }
  /** Total status counts across the range. */
  statusTotals: Record<string, number>
}

/**
 * useChecklistAnalytics — daily checklist completion for the mapped stores.
 * Source: GET /reports/store-date-wise-checklist-completion
 */
export function useChecklistAnalytics(days: AnalyticsRange): AnalyticsState<ChecklistAnalytics> {
  const { stores, storeIds, isLoading: isLoadingStores, error: storesError, refresh } = useMappedStores()
  const [rows, setRows] = useState<StoreDateWiseChecklistRow[]>([])
  const [dateColumns, setDateColumns] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const noMappedStores = !isLoadingStores && !storesError && storeIds.length === 0
  const stableStoreIds = useMemo(() => storeIds, [storeIds])

  const fetchData = useCallback(async () => {
    if (isLoadingStores) return
    if (stableStoreIds.length === 0) {
      setRows([])
      setDateColumns([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const data = await taskService.getStoreDateWiseChecklistCompletion({
        storeIds: stableStoreIds,
        fromDate: localDateString(days - 1),
        toDate: localDateString(0),
      })
      setRows(data.rows || [])
      setDateColumns((data.dates || []).map(column => column.date))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checklist analytics')
      setRows([])
      setDateColumns([])
    } finally {
      setIsLoading(false)
    }
  }, [days, isLoadingStores, stableStoreIds])

  useEffect(() => {
    fetchData()
  }, [fetchData, reloadToken])

  const data = useMemo<ChecklistAnalytics | null>(() => {
    if (dateColumns.length === 0) return null

    // Index rows by store so the mapping can drive the output order.
    const byStore = new Map(rows.map(row => [row.storeId, row]))
    const mappedStores: Store[] = stores.length > 0
      ? stores
      : rows.map(row => ({
          storeId: row.storeId,
          storeName: row.storeName,
          storeCode: row.storeCode,
          city: row.city,
        } as Store))

    const trend: TrendPoint[] = dateColumns.map(date => {
      let total = 0
      let completed = 0
      rows.forEach(row => {
        const cell = row.values[date]
        total += cell?.total || 0
        completed += cell?.completed || 0
      })
      return { label: shortLabel(date), value: percent(completed, total), secondary: `${completed}/${total}` }
    })

    const statusesSeen = new Set<string>()
    rows.forEach(row => Object.values(row.values).forEach(cell => {
      Object.entries(cell.statusCounts || {}).forEach(([status, count]) => {
        if (count > 0) statusesSeen.add(status)
      })
    }))
    const statuses = sortStatuses(Array.from(statusesSeen))

    const statusByDay: StackedBarGroup[] = dateColumns.map(date => {
      const counts: Record<string, number> = {}
      rows.forEach(row => {
        const cell = row.values[date]
        if (!cell) return
        Object.entries(cell.statusCounts || {}).forEach(([status, count]) => {
          counts[status] = (counts[status] || 0) + count
        })
      })
      return { label: shortLabel(date), counts }
    })

    // Per-store aggregates across the range: mapped stores drive the rows, so an
    // idle store shows up with 0/0 instead of disappearing.
    const perStore = mappedStores.map(store => {
      const row = byStore.get(store.storeId)
      let total = 0
      let completed = 0
      dateColumns.forEach(date => {
        const cell = row?.values[date]
        total += cell?.total || 0
        completed += cell?.completed || 0
      })
      return { store, total, completed, completionPercent: percent(completed, total) }
    })

    const ranking: RankingItem[] = [...perStore]
      .sort((a, b) => b.completionPercent - a.completionPercent || b.total - a.total)
      .map(item => ({
        id: item.store.storeId,
        label: storeLabel(item.store),
        subLabel: storeSubLabel(item.store),
        value: item.completionPercent,
        detail: `${item.completed}/${item.total}`,
      }))

    const heatRows = perStore.map(item => {
      const row = byStore.get(item.store.storeId)
      return {
        id: item.store.storeId,
        label: storeLabel(item.store),
        subLabel: storeSubLabel(item.store),
        cells: dateColumns.map(date => {
          const cell = row?.values[date]
          return {
            value: cell?.completionPercent ?? 0,
            detail: cell ? `${cell.completed}/${cell.total}` : '0/0',
          }
        }),
      }
    })

    // Status-wise heatmap: the status' count per store + day, intensity
    // normalised against the busiest cell in the grid so a sparse status still
    // shows its hotspots. `display` carries the raw count for the cell.
    const heatByStatus: Record<string, AnalyticsHeatRow[]> = {}
    statuses.forEach(status => {
      const counts = perStore.map(item => {
        const row = byStore.get(item.store.storeId)
        return dateColumns.map(date => {
          const cell = row?.values[date]
          return { count: cell?.statusCounts?.[status] || 0, total: cell?.total || 0 }
        })
      })
      const max = counts.reduce((peak, cells) => Math.max(peak, ...cells.map(cell => cell.count)), 0)
      heatByStatus[status] = perStore.map((item, index) => ({
        id: item.store.storeId,
        label: storeLabel(item.store),
        subLabel: storeSubLabel(item.store),
        cells: counts[index].map(({ count, total }) => ({
          value: max > 0 ? (count / max) * 100 : 0,
          display: String(count),
          detail: `${count}/${total}`,
        })),
      }))
    })

    const totals = perStore.reduce(
      (acc, item) => ({ total: acc.total + item.total, completed: acc.completed + item.completed }),
      { total: 0, completed: 0 },
    )

    const statusTotals: Record<string, number> = {}
    rows.forEach(row => Object.values(row.values).forEach(cell => {
      Object.entries(cell.statusCounts || {}).forEach(([status, count]) => {
        statusTotals[status] = (statusTotals[status] || 0) + count
      })
    }))

    return {
      trend,
      statusByDay,
      statuses,
      ranking,
      heatColumns: dateColumns.map(shortLabel),
      heatRows,
      heatByStatus,
      totals: { ...totals, completionPercent: percent(totals.completed, totals.total) },
      statusTotals,
    }
  }, [dateColumns, rows, stores])

  const refetch = useCallback(() => {
    refresh()
    setReloadToken(token => token + 1)
  }, [refresh])

  return {
    data,
    isLoading: isLoading || isLoadingStores,
    error: error || storesError,
    noMappedStores,
    stores,
    refetch,
  }
}

export interface SurveyAnalytics {
  /** Daily survey item completion % across the mapped stores. */
  trend: TrendPoint[]
  /** Per-store completion % ranking (idle mapped stores included as 0). */
  ranking: RankingItem[]
  /** Survey status mix per day (stacked bars). */
  statusByDay: StackedBarGroup[]
  statuses: string[]
  totals: { totalItems: number; completedItems: number; completionPercent: number }
}

/**
 * useSurveyAnalytics — daily survey item completion for the mapped stores.
 * Source: GET /reports/store-survey-date-wise-completion
 */
export function useSurveyAnalytics(days: AnalyticsRange): AnalyticsState<SurveyAnalytics> {
  const { stores, storeIds, isLoading: isLoadingStores, error: storesError, refresh } = useMappedStores()
  const [report, setReport] = useState<StoreSurveyDateWiseResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const noMappedStores = !isLoadingStores && !storesError && storeIds.length === 0
  const stableStoreIds = useMemo(() => storeIds, [storeIds])

  const fetchData = useCallback(async () => {
    if (isLoadingStores) return
    if (stableStoreIds.length === 0) {
      setReport(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const data = await taskService.getStoreSurveyDateWiseCompletion({
        storeIds: stableStoreIds,
        fromDate: localDateString(days - 1),
        toDate: localDateString(0),
      })
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load survey analytics')
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [days, isLoadingStores, stableStoreIds])

  useEffect(() => {
    fetchData()
  }, [fetchData, reloadToken])

  const data = useMemo<SurveyAnalytics | null>(() => {
    const dates = (report?.dates || []).map(column => column.date)
    if (dates.length === 0) return null

    const rows = report?.rows || []
    const byStore = new Map(rows.map(row => [row.storeId, row]))
    const mappedStores: Store[] = stores.length > 0
      ? stores
      : rows.map(row => ({
          storeId: row.storeId,
          storeName: row.storeName,
          storeCode: row.storeCode,
          city: row.city,
        } as Store))

    const trend: TrendPoint[] = dates.map(date => {
      let totalItems = 0
      let completedItems = 0
      rows.forEach(row => {
        const cells: SurveyDateCell[] = row.values[date] || []
        cells.forEach(cell => {
          totalItems += cell.totalItems || 0
          completedItems += cell.completedItems || 0
        })
      })
      return {
        label: shortLabel(date),
        value: percent(completedItems, totalItems),
        secondary: `${completedItems}/${totalItems} items`,
      }
    })

    const statusesSeen = new Set<string>()
    rows.forEach(row => Object.values(row.values).forEach(cells => {
      cells.forEach(cell => { if (cell.surveyStatus) statusesSeen.add(cell.surveyStatus) })
    }))
    const statuses = sortStatuses(Array.from(statusesSeen))

    const statusByDay: StackedBarGroup[] = dates.map(date => {
      const counts: Record<string, number> = {}
      rows.forEach(row => {
        const cells: SurveyDateCell[] = row.values[date] || []
        cells.forEach(cell => {
          const status = cell.surveyStatus || 'NOT_STARTED'
          counts[status] = (counts[status] || 0) + 1
        })
      })
      return { label: shortLabel(date), counts }
    })

    const perStore = mappedStores.map(store => {
      const row = byStore.get(store.storeId)
      let totalItems = 0
      let completedItems = 0
      dates.forEach(date => {
        const cells: SurveyDateCell[] = row?.values[date] || []
        cells.forEach(cell => {
          totalItems += cell.totalItems || 0
          completedItems += cell.completedItems || 0
        })
      })
      return { store, totalItems, completedItems }
    })

    const ranking: RankingItem[] = [...perStore]
      .sort((a, b) => percent(b.completedItems, b.totalItems) - percent(a.completedItems, a.totalItems))
      .map(item => ({
        id: item.store.storeId,
        label: storeLabel(item.store),
        subLabel: storeSubLabel(item.store),
        value: percent(item.completedItems, item.totalItems),
        detail: `${item.completedItems}/${item.totalItems} items`,
      }))

    const totals = perStore.reduce(
      (acc, item) => ({
        totalItems: acc.totalItems + item.totalItems,
        completedItems: acc.completedItems + item.completedItems,
      }),
      { totalItems: 0, completedItems: 0 },
    )

    return {
      trend,
      ranking,
      statusByDay,
      statuses,
      totals: { ...totals, completionPercent: percent(totals.completedItems, totals.totalItems) },
    }
  }, [report, stores])

  const refetch = useCallback(() => {
    refresh()
    setReloadToken(token => token + 1)
  }, [refresh])

  return {
    data,
    isLoading: isLoading || isLoadingStores,
    error: error || storesError,
    noMappedStores,
    stores,
    refetch,
  }
}
/** On-time vs delayed + per-user + per-day breakdown from the details report. */
export interface TaskExecutionAnalytics {
  /** Checklist status distribution (for the donut). */
  statusDonut: Array<{ status: string; value: number }>
  /** Daily checklist completion % from the execution rows. */
  trend: TrendPoint[]
  /** Users ranked by completed checklists. */
  leaderboard: RankingItem[]
  /** Stores ranked by overdue checklist count (highest first). */
  overdueByStore: RankingItem[]
  /** Store-wise (branchwise) on-time vs delayed split, all mapped stores included. */
  onTimeByStore: OnTimeDelayedItem[]
  /** Checklist items completed within their scheduled window. */
  onTime: number
  /** Checklist items completed after their scheduled window. */
  delayed: number
  /** onTime / (onTime + delayed), 0 when nothing measurable yet. */
  onTimePercent: number
  totals: { tasks: number; checklists: number; overdue: number }
}

/**
 * useTaskExecutionAnalytics — task/checklist execution health for the mapped stores.
 * Source: GET /reports/task-execution-details (one call: summary + executions).
 */
export function useTaskExecutionAnalytics(days: AnalyticsRange): AnalyticsState<TaskExecutionAnalytics> {
  const { stores, storeIds, isLoading: isLoadingStores, error: storesError, refresh } = useMappedStores()
  const [report, setReport] = useState<TaskExecutionReportResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const noMappedStores = !isLoadingStores && !storesError && storeIds.length === 0
  const stableStoreIds = useMemo(() => storeIds, [storeIds])

  const fetchData = useCallback(async () => {
    if (isLoadingStores) return
    if (stableStoreIds.length === 0) {
      setReport(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const data = await taskService.getTaskExecutionDetails({
        storeIds: stableStoreIds,
        fromDate: localDateString(days - 1),
        toDate: localDateString(0),
      })
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task execution analytics')
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [days, isLoadingStores, stableStoreIds])

  useEffect(() => {
    fetchData()
  }, [fetchData, reloadToken])

  const data = useMemo<TaskExecutionAnalytics | null>(() => {
    if (!report) return null
    const executions = report.executions || []
    const usersById = new Map((report.users || []).map(user => [user.userId, user]))
    const storesById = new Map((report.stores || []).map(store => [store.storeId, store]))

    const statusDonut = Object.entries(report.summary?.checklistStatusCounts || {})
      .filter(([, value]) => value > 0)
      .map(([status, value]) => ({ status, value }))

    // Daily trend + per-user completion + on-time/delayed, from the execution rows.
    const byDate = new Map<string, { total: number; completed: number }>()
    const userAgg = new Map<number, { total: number; completed: number; overdue: number }>()
    const storeOverdue = new Map<number, number>()
    // Per-store on-time vs delayed counters (branchwise breakdown).
    const storeTiming = new Map<number, { onTime: number; delayed: number }>()
    let onTime = 0
    let delayed = 0

    executions.forEach(execution => {
      const date = String(execution.executionDate).slice(0, 10)
      const bucket = byDate.get(date) || { total: 0, completed: 0 }
      const checklists = execution.checklists || []
      bucket.total += checklists.length
      bucket.completed += checklists.filter(item => item.checklistStatus === 'COMPLETED').length
      byDate.set(date, bucket)

      const userBucket = userAgg.get(execution.userId) || { total: 0, completed: 0, overdue: 0 }
      checklists.forEach(item => {
        userBucket.total += 1
        if (item.checklistStatus === 'COMPLETED') {
          userBucket.completed += 1
          // On time = completed no later than the scheduled end time.
          if (execution.toTime && item.completedAt) {
            const due = new Date(execution.toTime).getTime()
            const done = new Date(item.completedAt).getTime()
            if (Number.isFinite(due) && Number.isFinite(done)) {
              const timing = storeTiming.get(execution.storeId) || { onTime: 0, delayed: 0 }
              if (done <= due) {
                onTime += 1
                timing.onTime += 1
              } else {
                delayed += 1
                timing.delayed += 1
              }
              storeTiming.set(execution.storeId, timing)
            }
          }
        } else if (item.checklistStatus === 'OVERDUE') {
          userBucket.overdue += 1
          storeOverdue.set(execution.storeId, (storeOverdue.get(execution.storeId) || 0) + 1)
        }
      })
      userAgg.set(execution.userId, userBucket)
    })

    const trend: TrendPoint[] = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, bucket]) => ({
        label: shortLabel(date),
        value: percent(bucket.completed, bucket.total),
        secondary: `${bucket.completed}/${bucket.total}`,
      }))

    const leaderboard: RankingItem[] = Array.from(userAgg.entries())
      .map(([userId, bucket]) => {
        const user = usersById.get(userId)
        const name = user ? `${user.firstName} ${user.lastName}`.trim() || user.userName : `User #${userId}`
        return {
          id: userId,
          label: name,
          subLabel: user?.roleName,
          value: percent(bucket.completed, bucket.total),
          detail: `${bucket.completed}/${bucket.total} • ${bucket.overdue} overdue`,
        }
      })
      .sort((a, b) => b.value - a.value)

    const overdueByStore: RankingItem[] = Array.from(storeOverdue.entries())
      .map(([storeId, count]) => {
        const store = storesById.get(storeId)
        return {
          id: storeId,
          label: store?.storeName || `Store #${storeId}`,
          subLabel: [store?.storeCode, store?.city].filter(Boolean).join(' • '),
          value: count,
          detail: `${count} overdue`,
        }
      })
      .sort((a, b) => b.value - a.value)

    // Branchwise (store-wise) on-time vs delayed. Every mapped store is included
    // so a branch with nothing measurable shows as "—" instead of vanishing.
    const onTimeByStore: OnTimeDelayedItem[] = stores
      .map(store => {
        const timing = storeTiming.get(store.storeId) || { onTime: 0, delayed: 0 }
        const measured = timing.onTime + timing.delayed
        return {
          storeId: store.storeId,
          label: storeLabel(store),
          subLabel: storeSubLabel(store),
          onTime: timing.onTime,
          delayed: timing.delayed,
          measured,
          onTimePercent: measured > 0 ? percent(timing.onTime, measured) : 0,
        }
      })
      .sort((a, b) => {
        // Measurable stores first (best on-time % first), idle stores last.
        if (a.measured === 0 || b.measured === 0) {
          if (a.measured === 0 && b.measured === 0) return a.label.localeCompare(b.label)
          return a.measured === 0 ? 1 : -1
        }
        if (a.onTimePercent !== b.onTimePercent) return b.onTimePercent - a.onTimePercent
        return b.measured - a.measured
      })

    const measured = onTime + delayed

    return {
      statusDonut,
      trend,
      leaderboard,
      overdueByStore,
      onTimeByStore,
      onTime,
      delayed,
      onTimePercent: measured > 0 ? percent(onTime, measured) : 0,
      totals: {
        tasks: report.summary?.totalTaskExecutions || executions.length,
        checklists: report.summary?.totalChecklistExecutions || 0,
        overdue: report.summary?.checklistStatusCounts?.OVERDUE || 0,
      },
    }
    // `stores` is memo-stable in useMappedStores, and including it keeps the
    // store-name/label lookups fresh when the mapping resolves after the report.
  }, [report, stores])

  const refetch = useCallback(() => {
    refresh()
    setReloadToken(token => token + 1)
  }, [refresh])

  return {
    data,
    isLoading: isLoading || isLoadingStores,
    error: error || storesError,
    noMappedStores,
    stores,
    refetch,
  }
}