import React, { useState, useCallback, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { onboardingService, taskService } from '../../../services/apiManager'
import type {
  StoreWiseChecklistStatusResponse,
  StoreWiseChecklistStatusRow,
  StoreWiseChecklistStatusColumn,
  StoreWiseChecklistExecutionRef,
} from '../../../types/store-wise-checklist-status'
import type { Role } from '../../../types/role'
import { useMappedStores, resolveReportStoreIds } from '../../../hooks/useMappedStores'
import MultiSelectDropdown, { type MultiSelectOption } from '../../../components/ui/MultiSelectDropdown'
import Loading from '../../../components/Loading'
import FormSelect from '../../../components/ui/FormSelect'
import FormField from '../../../components/ui/FormField'
import PageHeader from '../../../components/PageHeader'
import { FilterSection } from '../../../components/FilterSection'
import ChecklistExecutionDetail from '../../../pages/ChecklistExecutionDetail'
import { RotateCcw, Search, Download, X, ChevronLeft, ChevronRight, Store as StoreIcon, Info } from 'lucide-react'
import { formatTime } from '../../../utils/date'

/**
 * Store-wise checklist status report rendered as a PIVOT table.
 *
 * Row     : Store (storeName, storeCode, city)
 * Columns : Checklist (checklistTitle)
 * Values  : Status-wise count of checklist executions per store + checklist
 *           (colored count chips, one per status present)
 *
 * The report is always built for a single date (`fromDate` on the API).
 *
 * Staff-portal differences vs the admin-portal version:
 *  - the store list is built from the logged-in user's store mapping
 *    (inactive mappings excluded) instead of the full store master list;
 *  - the report API is always called with explicit `storeIds` — the selected
 *    stores, or every mapped store when the user selects none;
 *  - the drill-down modal is always read-only, so a report never mutates data.
 */

/** Today as a local YYYY-MM-DD string. */
const getTodayString = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Human-readable label for a status code (e.g. NOT_STARTED -> Not Started). */
const prettyStatus = (status: string): string =>
  status
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

/** Full-background pill styling per known checklist status; unknown statuses fall back to gray. */
const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-500 text-white border-green-600',
  IN_PROGRESS: 'bg-blue-500 text-white border-blue-600',
  NOT_STARTED: 'bg-gray-400 text-white border-gray-500',
  SKIPPED: 'bg-orange-500 text-white border-orange-600',
  OVERDUE: 'bg-red-500 text-white border-red-600',
}

const DEFAULT_STATUS_STYLE = 'bg-gray-400 text-white border-gray-500'

/** Completion % text color helper (matches the rest of the reports). */
const completionColor = (percent: number): string =>
  percent >= 100 ? 'text-green-600' : percent >= 75 ? 'text-amber-600' : 'text-red-600'

/** Tinted summary-card styling per status for the Overall Status-wise Summary.
 *  Keys can be extended as new statuses appear; unknown statuses fall back to gray. */
const STATUS_CARD_STYLES: Record<string, { card: string; label: string; count: string }> = {
  COMPLETED: { card: 'bg-green-50', label: 'text-green-700', count: 'text-green-700' },
  IN_PROGRESS: { card: 'bg-blue-50', label: 'text-blue-700', count: 'text-blue-700' },
  NOT_STARTED: { card: 'bg-gray-100', label: 'text-gray-600', count: 'text-gray-700' },
  SKIPPED: { card: 'bg-orange-50', label: 'text-orange-700', count: 'text-orange-700' },
  OVERDUE: { card: 'bg-red-50', label: 'text-red-700', count: 'text-red-700' },
}

const DEFAULT_STATUS_CARD_STYLE: { card: string; label: string; count: string } = {
  card: 'bg-gray-100',
  label: 'text-gray-600',
  count: 'text-gray-700',
}

/** Status count chip — clickable when a drill-down handler is provided. */
const StatusChip: React.FC<{ status: string; count: number; showStatus?: boolean; onClick?: () => void }> = ({ status, count, showStatus = true, onClick }) => {
  const style = STATUS_STYLES[status] || DEFAULT_STATUS_STYLE
  const label = showStatus ? `${prettyStatus(status)}` : `${count}`
  const classes = `inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 ${style}`

  if (onClick) {
    return (
      <button
        type="button"
        title={`${label} — click to view executions`}
        onClick={onClick}
        className={`${classes} cursor-pointer transition-transform hover:scale-105 hover:shadow-md`}
      >
        {label}
      </button>
    )
  }

  return (
    <span title={label} className={classes}>
      {label}
    </span>
  )
}

const StoreWiseChecklistStatus: React.FC = () => {
  // Filters
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([])
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedChecklistPriority, setSelectedChecklistPriority] = useState<string>('')
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString())
  const [showFilters, setShowFilters] = useState(false)

  // Stores mapped to the logged-in user (never the full store list).
  const {
    stores,
    storeIds: mappedStoreIds,
    isLoading: isLoadingStores,
    error: storesError,
  } = useMappedStores()

  // City filter derived from the mapped stores the user can report on.
  const cities = Array.from(new Set(stores.map(s => s.city).filter(Boolean))).sort()

  // Priority options for the report filter.
  const priorityOptions = ['HIGH', 'MEDIUM', 'LOW']

  // Results
  const [report, setReport] = useState<StoreWiseChecklistStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Load roles for the "Task Assignment Role" filter on mount.
  const fetchRoles = useCallback(async () => {
    try {
      const data = await onboardingService.getRoles()
      setRoles([...data].sort((a, b) => a.roleName.localeCompare(b.roleName)))
    } catch {
      // Role dropdown is optional; proceed without it.
      setRoles([])
    }
  }, [])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const fetchReport = useCallback(async (opts: {
    storeIds: number[]
    date: string
    city?: string
    checklistPriority?: string
    roleId?: string
  }) => {
    // Without a store scope the API would return every store — never allowed here.
    if (opts.storeIds.length === 0) return
    setLoading(true)
    setError(null)
    setLoaded(false)
    try {
      const data = await taskService.getStoreWiseChecklistStatus({
        storeIds: opts.storeIds,
        city: opts.city || undefined,
        checklistPriority: opts.checklistPriority || undefined,
        roleId: opts.roleId ? parseInt(opts.roleId, 10) : undefined,
        fromDate: opts.date || undefined,
      })
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch the store-wise checklist status report')
      setReport(null)
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [])

  // Initial load: as soon as the mapped stores resolve, fetch today's report
  // for those stores — a store selection is optional, not required.
  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (initialLoadDone.current || isLoadingStores) return
    if (mappedStoreIds.length === 0) return
    initialLoadDone.current = true
    fetchReport({ storeIds: mappedStoreIds, date: getTodayString() })
  }, [isLoadingStores, mappedStoreIds, fetchReport])

  const handleSearch = () => {
    fetchReport({
      // Selected stores, or every mapped store when nothing is selected.
      storeIds: resolveReportStoreIds(selectedStoreIds, mappedStoreIds),
      date: selectedDate,
      city: selectedCity,
      checklistPriority: selectedChecklistPriority,
      roleId: selectedRoleId,
    })
  }

  const handleReset = () => {
    setSelectedStoreIds([])
    setSelectedCity('')
    setSelectedChecklistPriority('')
    setSelectedRoleId('')
    setSelectedDate(getTodayString())
    setReport(null)
    setError(null)
    setLoaded(false)
    // Nothing selected after a reset → fall back to every mapped store.
    if (mappedStoreIds.length > 0) {
      fetchReport({ storeIds: mappedStoreIds, date: getTodayString() })
    }
  }

  // Stores shown in the multi-select, filtered by the selected city (optional).
  const filteredStores = selectedCity
    ? stores.filter(s => s.city === selectedCity)
    : stores
  const storeOptions: MultiSelectOption[] = filteredStores.map(store => ({
    value: store.storeId,
    label: `${store.storeName} (${store.storeCode})`,
  }))

  const checklists = report?.checklists || []
  const statuses = report?.statuses || []
  // Sort pivot rows by store name ascending (matches the store dropdown order).
  const rows = [...(report?.rows || [])].sort(
    (a, b) => (a.storeName || '').localeCompare(b.storeName || ''),
  )
  const hasData = rows.length > 0 && checklists.length > 0
  const noMappedStores = !isLoadingStores && !storesError && mappedStoreIds.length === 0

  // Per-checklist status totals across all stores (footer row).
  // Each status also accumulates the underlying checklist execution references
  // so the footer chips can open the Checklist Execution Detail modal.
  const checklistTotals: {
    counts: Record<string, number>
    refs: Record<string, StoreWiseChecklistExecutionRef[]>
  }[] = checklists.map(checklist => {
    const counts: Record<string, number> = {}
    const refs: Record<string, StoreWiseChecklistExecutionRef[]> = {}
    statuses.forEach(status => {
      counts[status] = 0
      refs[status] = []
    })
    rows.forEach(row => {
      const rowCounts = row.values[String(checklist.mstChecklistId)] || {}
      statuses.forEach(status => {
        counts[status] += rowCounts[status] || 0
        const cellRefs = report?.taskChecklistExecutionIds?.[`${row.storeId}:${checklist.mstChecklistId}:${status}`]
        if (cellRefs) {
          refs[status] = refs[status].concat(cellRefs)
        }
      })
    })
    return { counts, refs }
  })

  // Per-store status-wise totals (shown in the first column under the store
  // code). Each status also accumulates the underlying checklist execution
  // references so the store-total chips can open the detail modal too.
  const storeTotals: {
    counts: Record<string, number>
    refs: Record<string, StoreWiseChecklistExecutionRef[]>
    totalChecklistExecutions: number
    completedCount: number
    /** Average % Completed, e.g. 80.0 (0 when there are no executions). */
    completionPercent: number
  }[] = rows.map(row => {
    const counts: Record<string, number> = {}
    const refs: Record<string, StoreWiseChecklistExecutionRef[]> = {}
    statuses.forEach(status => {
      counts[status] = 0
      refs[status] = []
    })
    checklists.forEach(checklist => {
      const statusCounts = row.values[String(checklist.mstChecklistId)] || {}
      statuses.forEach(status => {
        counts[status] += statusCounts[status] || 0
        const cellRefs = report?.taskChecklistExecutionIds?.[`${row.storeId}:${checklist.mstChecklistId}:${status}`]
        if (cellRefs) {
          refs[status] = refs[status].concat(cellRefs)
        }
      })
    })
    const total = row.totalChecklistExecutions || 0
    const completed = counts['COMPLETED'] || 0
    return {
      counts,
      refs,
      totalChecklistExecutions: total,
      completedCount: completed,
      completionPercent: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
    }
  })

  // Overall status-wise summary counts across all stores and checklists.
  // Aggregated dynamically from storeTotals so any future status is included
  // automatically without code changes.
  const overallStatusCounts: Record<string, number> = {}
  let overallTotal = 0
  let overallCompleted = 0
  storeTotals.forEach(store => {
    statuses.forEach(status => {
      overallStatusCounts[status] = (overallStatusCounts[status] || 0) + (store.counts[status] || 0)
    })
    overallTotal += store.totalChecklistExecutions
    overallCompleted += store.completedCount
  })

  const overallCompletionPercent = overallTotal > 0
    ? Number(((overallCompleted / overallTotal) * 100).toFixed(1))
    : 0

  // Statuses actually present in the data, ascending for stable ordering.
  const overallStatusList = Object.entries(overallStatusCounts)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b))

  // Download the report as an Excel file preserving the same pivot layout
  // shown in the UI: Store rows x Checklist columns with status-wise counts
  // per store + checklist, a per-store Completion % column, and a final
  // "All Stores" summary row. `xlsx` is imported on demand so it stays out of
  // the staff PWA's main bundle.
  const handleDownloadReport = async () => {
    if (!report || !hasData) return
    try {
      const XLSX = await import('xlsx')

      const headerRow = [
        'Store',
        'Store Code',
        'City',
        ...checklists.map(checklist => {
          const parts = [checklist.checklistTitle]
          if (checklist.checklistRegionalText) parts.push(checklist.checklistRegionalText)
          if (checklist.fromTime || checklist.toTime) {
            parts.push(
              `${formatTime(checklist.fromTime)} - ${formatTime(checklist.toTime)}`,
            )
          }
          return parts.join('\n')
        }),
        'Completion %',
      ]

      const cellLines = (counts: Record<string, number>): string => {
        const lines: string[] = []
        statuses.forEach(status => {
          const count = counts[status] || 0
          if (count > 0) lines.push(`${prettyStatus(status)}: ${count}`)
        })
        return lines.join('\n')
      }

      const bodyRows = rows.map((row, rowIndex) => {
        const totals = storeTotals[rowIndex]
        return [
          row.storeName,
          row.storeCode,
          row.city || '',
          ...checklists.map(checklist => {
            const counts = row.values[String(checklist.mstChecklistId)] || {}
            const presentStatuses = statuses.filter(status => (counts[status] || 0) > 0)
            if (presentStatuses.length === 0) return '-'
            return cellLines(counts)
          }),
          totals.completionPercent,
        ]
      })

      // Footer "All Stores" row mirrors the UI's overall summary.
      const footerRow = [
        'All Stores',
        '',
        '',
        ...checklists.map((_, index) => {
          const totals = checklistTotals[index]
          const presentStatuses = statuses.filter(status => (totals.counts[status] || 0) > 0)
          if (presentStatuses.length === 0) return '-'
          return cellLines(totals.counts)
        }),
        `${overallCompletionPercent}%`,
      ]

      const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows, footerRow])
      worksheet['!cols'] = [
        { wch: 30 },
        { wch: 14 },
        { wch: 20 },
        ...checklists.map(checklist => ({
          wch: Math.min(50, Math.max(16, checklist.checklistTitle.length + 4)),
        })),
        { wch: 14 },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')

      const dateStamp = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(workbook, `store-wise-checklist-status-${dateStamp}.xlsx`)
    } catch (err) {
      console.error('Failed to export the store-wise checklist status report', err)
      toast.error('Failed to download the report')
    }
  }

  // ── Checklist Execution Detail modal (read-only drill-down from a chip) ─────
  const [modalRefs, setModalRefs] = useState<StoreWiseChecklistExecutionRef[]>([])
  const [modalIndex, setModalIndex] = useState<number>(0)
  // Store context for the currently open modal (empty when the chip aggregates
  // multiple stores, e.g. the footer "Total" chips).
  const [modalStoreLabel, setModalStoreLabel] = useState<string>('')

  const openChecklistModal = (refs: StoreWiseChecklistExecutionRef[] | undefined, storeLabel?: string) => {
    if (!refs || refs.length === 0) return
    setModalRefs(refs)
    setModalIndex(0)
    setModalStoreLabel(storeLabel || '')
  }

  const closeChecklistModal = () => {
    setModalRefs([])
    setModalIndex(0)
    setModalStoreLabel('')
  }

  const goToPreviousChecklist = () => {
    setModalIndex(prev => Math.max(0, prev - 1))
  }

  const goToNextChecklist = () => {
    setModalIndex(prev => Math.min(modalRefs.length - 1, prev + 1))
  }

  const modalIsOpen =
    modalRefs.length > 0 &&
    modalIndex >= 0 &&
    modalIndex < modalRefs.length

  return (
    <>
      <PageHeader
        title="Store-Wise Checklist Status"
        subtitle="Pivot report of checklist execution statuses per store and date."
      />

      {/* Mapped-store scope info / errors */}
      {storesError ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{storesError}</p>
        </div>
      ) : noMappedStores ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-700">
            No stores are mapped to your account, so there is no data to report. Please contact your administrator.
          </p>
        </div>
      ) : (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            You can report on {mappedStoreIds.length} mapped {mappedStoreIds.length === 1 ? 'store' : 'stores'}
            {selectedStoreIds.length === 0
              ? ' — no store selected, so all mapped stores are included.'
              : ` — filtered to ${selectedStoreIds.length} selected.`}
          </p>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-card rounded-xl border border-border mb-6">
        <FilterSection
          title="Search & Filter Checklist"
          hasActiveFilters={!!(selectedStoreIds.length || selectedCity || selectedChecklistPriority || selectedRoleId || selectedDate)}
          actions={
            <button
              onClick={() => setShowFilters(s => !s)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
            >
              <RotateCcw className="h-4 w-4" />
              {showFilters ? 'Hide' : 'Show'}
            </button>
          }
        />
        <div className={`px-5 py-4 ${showFilters ? 'block' : 'hidden'} sm:block`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* City (optional, mapped stores only) */}
            <FormSelect
              label="City / Area"
              name="scope"
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value)
                setSelectedStoreIds([])
              }}
              options={cities.map(city => ({ value: city, label: city }))}
              placeholder="All Cities"
            />

            {/* Store (multi-selection from the user's store mapping) */}
            <div>
              <MultiSelectDropdown
                label="Store"
                options={storeOptions}
                selectedValues={selectedStoreIds}
                onChange={(values) => setSelectedStoreIds(values)}
                placeholder={isLoadingStores ? 'Loading stores...' : 'All Mapped Stores'}
                disabled={isLoadingStores || storeOptions.length === 0}
                showSelectAll={true}
              />
            </div>

            {/* Priority */}
            <FormSelect
              label="Checklist Priority"
              name="checklistPriority"
              value={selectedChecklistPriority}
              onChange={(e) => setSelectedChecklistPriority(e.target.value)}
              options={priorityOptions.map(priority => ({ value: priority, label: priority }))}
              placeholder="All Priorities"
            />

            {/* Assignment Role */}
            <FormSelect
              label="Task Assignment Role"
              name="assignmentRole"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              options={roles.map(role => ({ value: role.roleId, label: role.roleName }))}
              placeholder="All Roles"
            />

            {/* Selected Date */}
            <FormField
              label="Date"
              name="selectedDate"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={!hasData || loading}
              title={hasData ? 'Download the report in the same pivot format (Excel)' : 'Download is available once the report data is loaded'}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Download
            </button>
            <button
              type="button"
              onClick={handleSearch}
              disabled={isLoadingStores || mappedStoreIds.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search className="h-4 w-4" /> Search
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <Loading message="Loading store-wise checklist status report..." />
      ) : !loaded ? null : !hasData ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">No data found</h3>
          <p className="text-muted-foreground">
            No checklist execution data is available for your mapped stores, the selected date and filters.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden bg-card">
          {/* Status legend */}
          {statuses.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 border-b border-border">
              <span className="font-medium text-muted-foreground">Legend:</span>
              {statuses.map(status => (
                <span
                  key={status}
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-medium ${STATUS_STYLES[status] || DEFAULT_STATUS_STYLE}`}
                >
                  {prettyStatus(status)}
                </span>
              ))}
            </div>
          )}

          {/* Overall status-wise summary */}
          <div className="px-5 py-4 border-b border-border">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
          </div>

          <div className="overflow-x-auto max-h-[1000px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="sticky top-0 left-0 z-30 px-4 py-4 text-left w-[210px] bg-muted/80 font-medium text-foreground border-r border-border">
                    Store
                  </th>
                  {checklists.map((checklist) => (
                    <th
                      key={checklist.mstChecklistId}
                      className="sticky top-0 z-20 px-4 py-4 text-left font-medium text-foreground bg-muted/80 align-top border-r border-border"
                    >
                      <div className="max-w-[250px] font-semibold truncate" title={checklist.checklistTitle}>
                        {checklist.checklistTitle}
                      </div>
                      {checklist.checklistRegionalText && (
                        <div
                          className="max-w-[250px] mt-1 font-normal text-muted-foreground"
                          title={checklist.checklistRegionalText}
                        >
                          {checklist.checklistRegionalText}
                        </div>
                      )}
                      {(checklist.fromTime || checklist.toTime) && (
                        <div className="max-w-[250px] mt-1.5 text-sm font-medium text-primary">
                          {formatTime(checklist.fromTime)} - {formatTime(checklist.toTime)}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: StoreWiseChecklistStatusRow, rowIndex: number) => (
                  <tr key={row.storeId} className="border-t border-border">
                    <td className="py-3 pl-4 pr-2 font-medium sticky left-0 z-10 w-[210px] bg-card hover:bg-muted border-r border-border align-top">
                      <div>{row.storeName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[row.storeCode, row.city].filter(Boolean).join(' • ') || '—'}
                      </div>
                      {/* Status-wise totals for this store */}
                      {statuses.some(status => (storeTotals[rowIndex].counts[status] || 0) > 0) && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {statuses.map(status => {
                            const count = storeTotals[rowIndex].counts[status] || 0
                            if (count <= 0) return null
                            return (
                              <StatusChip
                                key={status}
                                status={status}
                                count={count}
                                showStatus={false}
                                onClick={() => openChecklistModal(storeTotals[rowIndex].refs[status], `${row.storeName} (${row.storeCode})`)}
                              />
                            )
                          })}
                        </div>
                      )}
                      {/* Completion % for this store */}
                      {storeTotals[rowIndex].totalChecklistExecutions > 0 && (
                        <div className="mt-1.5 text-sm font-semibold">
                          <span className="mr-1.5 text-[11px] font-normal text-muted-foreground">
                            Completion:
                          </span>
                          <span className={storeTotals[rowIndex].completionPercent >= 100 ? 'text-green-600' : storeTotals[rowIndex].completionPercent >= 75 ? 'text-amber-600' : 'text-red-600'}>
                            {storeTotals[rowIndex].completionPercent}%
                          </span>
                          <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                            ({storeTotals[rowIndex].totalChecklistExecutions})
                          </span>
                        </div>
                      )}
                    </td>
                    {checklists.map((checklist: StoreWiseChecklistStatusColumn) => {
                      const counts = row.values[String(checklist.mstChecklistId)] || {}
                      const presentStatuses = statuses.filter(status => (counts[status] || 0) > 0)
                      const cellTotal = presentStatuses.reduce((sum, s) => sum + (counts[s] || 0), 0)
                      return (
                        <td key={checklist.mstChecklistId} className="px-4 py-3 text-center border-r border-border">
                          {cellTotal === 0 ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <div className="flex flex-wrap items-center justify-center gap-1.5">
                                {presentStatuses.map(status => (
                                  <StatusChip
                                    key={status}
                                    status={status}
                                    count={counts[status]}
                                    onClick={() => openChecklistModal(report?.taskChecklistExecutionIds?.[`${row.storeId}:${checklist.mstChecklistId}:${status}`], `${row.storeName} (${row.storeCode})`)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30 font-medium">
                  <td className="px-4 py-3 sticky left-0 z-10 bg-muted border-r border-border">
                    Total
                  </td>
                  {checklists.map((checklist, index) => {
                    const totals = checklistTotals[index]
                    const presentStatuses = statuses.filter(status => (totals.counts[status] || 0) > 0)
                    const footerTotal = presentStatuses.reduce((sum, s) => sum + (totals.counts[s] || 0), 0)
                    const footerCompleted = totals.counts['COMPLETED'] || 0
                    const footerPercent = footerTotal > 0 ? Number(((footerCompleted / footerTotal) * 100).toFixed(1)) : 0
                    return (
                      <td key={checklist.mstChecklistId} className="px-4 py-3 text-center border-r border-border">
                        {footerTotal === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              {presentStatuses.map(status => (
                                <StatusChip
                                  key={status}
                                  status={status}
                                  count={totals.counts[status]}
                                  showStatus={false}
                                  onClick={() => openChecklistModal(totals.refs[status])}
                                />
                              ))}
                            </div>
                            {/* Completion % for this checklist total */}
                            <div className="text-xs font-semibold">
                              <span className="mr-1 text-[10px] font-normal text-muted-foreground">
                                Completion:
                              </span>
                              <span className={footerPercent >= 100 ? 'text-green-600' : footerPercent >= 75 ? 'text-amber-600' : 'text-red-600'}>
                                {footerPercent}%
                              </span>
                              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                                ({footerTotal})
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
              <caption className="sr-only">Store-wise checklist status pivot report</caption>
            </table>
          </div>
        </div>
      )}

      {/* ================= Checklist Execution Detail Modal ================= */}
      {modalIsOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60"
            onClick={closeChecklistModal}
          />
          {/* Modal */}
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
              className="pointer-events-auto flex max-h-[92vh] w-full max-w-5xl flex-col overflow-y-auto rounded-2xl bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-border bg-card p-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Checklist Execution Details</h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    🔒 Read-only
                  </span>
                  {modalStoreLabel && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      <StoreIcon className="h-3.5 w-3.5" /> {modalStoreLabel}
                    </span>
                  )}
                  {modalRefs.length > 1 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {modalIndex + 1} of {modalRefs.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={closeChecklistModal}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Checklist execution navigation (when a cell maps to multiple executions) */}
              {modalRefs.length > 1 && (
                <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-2.5">
                  <button
                    type="button"
                    onClick={goToPreviousChecklist}
                    disabled={modalIndex === 0}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <span className="text-xs font-medium text-muted-foreground">
                    Checklist {modalIndex + 1} of {modalRefs.length}
                  </span>
                  <button
                    type="button"
                    onClick={goToNextChecklist}
                    disabled={modalIndex === modalRefs.length - 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Modal content */}
              <div className="flex-1 p-5 sm:p-6">
                <ChecklistExecutionDetail
                  checklistExecutionIdProp={modalRefs[modalIndex].taskChecklistExecutionId}
                  taskExecutionIdProp={modalRefs[modalIndex].taskExecutionId}
                  onClose={closeChecklistModal}
                  readOnly
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default StoreWiseChecklistStatus