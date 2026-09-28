import React, { useState, useCallback, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { onboardingService, taskService } from '../../../services/apiManager'
import type {
  StoreDateWiseChecklistResponse,
  StoreDateWiseChecklistRow,
} from '../../../types/store-date-wise-checklist-completion'
import type { TaskChecklist } from '../../../types/task-checklist'
import type { Role } from '../../../types/role'
import { useMappedStores, resolveReportStoreIds } from '../../../hooks/useMappedStores'
import MultiSelectDropdown, { type MultiSelectOption } from '../../../components/ui/MultiSelectDropdown'
import Loading from '../../../components/Loading'
import FormSelect from '../../../components/ui/FormSelect'
import FormField from '../../../components/ui/FormField'
import PageHeader from '../../../components/PageHeader'
import { FilterSection } from '../../../components/FilterSection'
import { RotateCcw, Search, Download, Info } from 'lucide-react'

/**
 * Store + date-wise checklist completion report rendered as a PIVOT table.
 *
 * Row     : Store (storeName, storeCode, city)
 * Columns : Date (DD-MM-YYYY; every calendar day in the selected range)
 * Values  : Status-wise count chips + completion % per store + day
 *
 * Optional `masterChecklistId` filter narrows the report to a single checklist.
 *
 * Staff-portal differences vs the admin-portal version:
 *  - the store list is built from the logged-in user's store mapping
 *    (inactive mappings excluded) instead of the full store master list;
 *  - the report API is always called with explicit `storeIds` — the selected
 *    stores, or every mapped store when the user selects none.
 */

/** Today as a local YYYY-MM-DD string. */
const getTodayString = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** First day of the month, 30 days before today (default date range). */
const getDefaultFromDate = (): string => {
  const now = new Date()
  now.setDate(now.getDate() - 7)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Format an ISO date (YYYY-MM-DD) as DD-MM-YYYY. */
const formatDateDDMMYYYY = (isoDate: string): string => {
  if (!isoDate) return '—'
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
  if (!match) return isoDate
  return `${match[3]}-${match[2]}-${match[1]}`
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

/** Preferred display order for status chips (legend, per-day cells, store totals, export). */
const STATUS_ORDER = ['NOT_STARTED', 'IN_PROGRESS', 'PENDING', 'OVERDUE', 'COMPLETED']

/** Status ranking used by the sort; unknown statuses are ranked after the known ones. */
const statusSortIndex = (status: string): number => {
  const index = STATUS_ORDER.indexOf(status)
  return index >= 0 ? index : STATUS_ORDER.length
}

/** Sort status keys by the preferred display order, then alphabetically. */
const statusSort = (a: string, b: string): number => {
  const diff = statusSortIndex(a) - statusSortIndex(b)
  return diff !== 0 ? diff : a.localeCompare(b)
}

/** Count chip per status (count only; the status colour carries the meaning). */
const StatusChip: React.FC<{ status: string; count: number }> = ({ status, count }) => {
  const style = STATUS_STYLES[status] || DEFAULT_STATUS_STYLE
  return (
    <span
      title={`${prettyStatus(status)}: ${count}`}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 ${style}`}
    >
      {count}
    </span>
  )
}

/** Completion % text color helper (matches the rest of the reports). */
const completionColor = (percent: number): string =>
  percent >= 100 ? 'text-green-600' : percent >= 75 ? 'text-amber-600' : 'text-red-600'

const StoreDateWiseChecklistCompletion: React.FC = () => {
  // Filters
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([])
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedChecklistPriority, setSelectedChecklistPriority] = useState<string>('')
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>(getDefaultFromDate())
  const [toDate, setToDate] = useState<string>(getTodayString())
  const [showFilters, setShowFilters] = useState(false)

  // Master checklist filter (optional)
  const [checklists, setChecklists] = useState<TaskChecklist[]>([])
  const [selectedChecklistId, setSelectedChecklistId] = useState<string>('')

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
  const [report, setReport] = useState<StoreDateWiseChecklistResponse | null>(null)
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

  // Load master checklists for the optional filter dropdown on mount.
  const fetchChecklists = useCallback(async () => {
    try {
      const data = await taskService.getTaskChecklists()
      const active = [...data]
        .filter((c) => c.isActive)
        .sort((a, b) => (a.regionalText || '').localeCompare(b.regionalText || ''))
      setChecklists(active)
    } catch {
      // Checklist dropdown is optional; proceed without it.
      setChecklists([])
    }
  }, [])

  useEffect(() => {
    fetchRoles()
    fetchChecklists()
  }, [fetchRoles, fetchChecklists])

  const fetchReport = useCallback(async (opts: {
    storeIds: number[]
    city?: string
    checklistPriority?: string
    roleId?: string
    masterChecklistId?: string
    from?: string
    to?: string
  }) => {
    // Without a store scope the API would return every store — never allowed here.
    if (opts.storeIds.length === 0) return
    setLoading(true)
    setError(null)
    setLoaded(false)
    try {
      const data = await taskService.getStoreDateWiseChecklistCompletion({
        storeIds: opts.storeIds,
        city: opts.city || undefined,
        checklistPriority: opts.checklistPriority || undefined,
        roleId: opts.roleId ? parseInt(opts.roleId, 10) : undefined,
        masterChecklistId: opts.masterChecklistId ? parseInt(opts.masterChecklistId, 10) : undefined,
        fromDate: opts.from || undefined,
        toDate: opts.to || undefined,
      })
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch the store-date-wise checklist completion report')
      setReport(null)
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [])

  // Initial load: as soon as the mapped stores resolve, fetch the default range
  // (last 7 days) for those stores — a store selection is optional, not required.
  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (initialLoadDone.current || isLoadingStores) return
    if (mappedStoreIds.length === 0) return
    initialLoadDone.current = true
    fetchReport({
      storeIds: mappedStoreIds,
      from: getDefaultFromDate(),
      to: getTodayString(),
    })
  }, [isLoadingStores, mappedStoreIds, fetchReport])

  const handleSearch = () => {
    fetchReport({
      // Selected stores, or every mapped store when nothing is selected.
      storeIds: resolveReportStoreIds(selectedStoreIds, mappedStoreIds),
      city: selectedCity,
      checklistPriority: selectedChecklistPriority,
      roleId: selectedRoleId,
      masterChecklistId: selectedChecklistId,
      from: fromDate,
      to: toDate,
    })
  }

  const handleReset = () => {
    setSelectedStoreIds([])
    setSelectedCity('')
    setSelectedChecklistPriority('')
    setSelectedRoleId('')
    setSelectedChecklistId('')
    setFromDate(getDefaultFromDate())
    setToDate(getTodayString())
    setReport(null)
    setError(null)
    setLoaded(false)
    // Nothing selected after a reset → fall back to every mapped store.
    if (mappedStoreIds.length > 0) {
      fetchReport({
        storeIds: mappedStoreIds,
        from: getDefaultFromDate(),
        to: getTodayString(),
      })
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

  const checklistOptions: MultiSelectOption[] = checklists.map(c => ({
    value: c.mstChecklistId,
    label: `${c.regionalText || c.title} [${c.isMandatory ? 'Mandatory' : 'Optional'} | #${c.mstChecklistId}] `,
  }))

  const columns = report?.dates || []
  // Sort pivot rows by store name ascending (matches the store dropdown order).
  const rows = [...(report?.rows || [])].sort(
    (a, b) => (a.storeName || '').localeCompare(b.storeName || ''),
  )
  const hasData = rows.length > 0 && columns.length > 0
  const noMappedStores = !isLoadingStores && !storesError && mappedStoreIds.length === 0

  // Per-store aggregates across the whole date range (shown in the first column).
  const storeAggs = rows.map(row => {
    const total = Object.values(row.values).reduce((sum, cell) => sum + cell.total, 0)
    const completed = Object.values(row.values).reduce((sum, cell) => sum + cell.completed, 0)
    const statusCounts: Record<string, number> = {}
    Object.values(row.values).forEach(cell => {
      Object.entries(cell.statusCounts || {}).forEach(([status, count]) => {
        statusCounts[status] = (statusCounts[status] || 0) + count
      })
    })
    return {
      total,
      completed,
      statusCounts,
      completionPercent: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
    }
  })

  // Per-date aggregates across all stores (footer row).
  const dateAggs = columns.map(col => {
    const total = rows.reduce((sum, row) => sum + (row.values[col.date]?.total || 0), 0)
    const completed = rows.reduce((sum, row) => sum + (row.values[col.date]?.completed || 0), 0)
    const statusCounts: Record<string, number> = {}
    rows.forEach(row => {
      const cell = row.values[col.date]
      if (cell) {
        Object.entries(cell.statusCounts || {}).forEach(([status, count]) => {
          statusCounts[status] = (statusCounts[status] || 0) + count
        })
      }
    })
    return {
      total,
      completed,
      statusCounts,
      completionPercent: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
    }
  })

  const orderedStatuses = Array.from(new Set(
    rows.flatMap(row => Object.values(row.values).flatMap(cell => Object.keys(cell.statusCounts || {})))
  )).sort(statusSort)

  // Download the report as an Excel file preserving the same pivot layout
  // shown in the UI: Store rows x Date columns (DD-MM-YYYY), status-wise
  // counts + completion % per store + day, a per-store Total column, and a
  // final "All Stores" summary row. `xlsx` is imported on demand so it stays
  // out of the staff PWA's main bundle.
  const handleDownloadReport = async () => {
    if (!report || !hasData) return
    try {
      const XLSX = await import('xlsx')

      const headerRow = [
        'Store',
        'Store Code',
        'City',
        ...columns.map(col => formatDateDDMMYYYY(col.date)),
        'Total (All Dates)',
      ]

      const cellLines = (total: number, completed: number, completionPercent: number, statusCounts: Record<string, number>): string => {
        const lines = [`${completionPercent}% (${completed}/${total})`]
        Object.entries(statusCounts || {})
          .filter(([, count]) => count > 0)
          .sort(([a], [b]) => statusSort(a, b))
          .forEach(([status, count]) => lines.push(`${prettyStatus(status)}: ${count}`))
        return lines.join('\n')
      }

      const bodyRows = rows.map((row, rowIndex) => {
        const agg = storeAggs[rowIndex]
        return [
          row.storeName,
          row.storeCode,
          row.city || '',
          ...columns.map(col => {
            const cell = row.values[col.date]
            if (!cell || cell.total === 0) return '-'
            return cellLines(cell.total, cell.completed, cell.completionPercent, cell.statusCounts || {})
          }),
          cellLines(agg.total, agg.completed, agg.completionPercent, agg.statusCounts),
        ]
      })

      const grandTotal = rows.reduce(
        (sum, row) => sum + Object.values(row.values).reduce((s, cell) => s + cell.total, 0),
        0,
      )
      const grandCompleted = rows.reduce(
        (sum, row) => sum + Object.values(row.values).reduce((s, cell) => s + cell.completed, 0),
        0,
      )
      const allStoresRow = [
        'All Stores',
        '',
        '',
        ...dateAggs.map(agg =>
          agg.total > 0 ? `${agg.completionPercent}% (${agg.completed}/${agg.total})` : '-',
        ),
        `${grandTotal > 0 ? Number(((grandCompleted / grandTotal) * 100).toFixed(1)) : 0}% (${grandCompleted}/${grandTotal})`,
      ]

      const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows, allStoresRow])
      worksheet['!cols'] = [
        { wch: 30 },
        { wch: 14 },
        { wch: 20 },
        ...columns.map(() => ({ wch: 30 })),
        { wch: 32 },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')

      const dateStamp = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(workbook, `store-date-wise-checklist-completion-${dateStamp}.xlsx`)
    } catch (err) {
      console.error('Failed to export the store-date-wise checklist completion report', err)
      toast.error('Failed to download the report')
    }
  }

  return (
    <>
      <PageHeader
        title="Store-Date-Wise Checklist Completion"
        subtitle="Daily completion % and status-wise counts per store across the selected date range and filters."
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
          hasActiveFilters={!!(selectedStoreIds.length || selectedCity || selectedChecklistPriority ||
            selectedChecklistId || selectedRoleId || fromDate || toDate)}
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

            {/* Master Checklist (optional) */}
            <FormSelect
              label="Checklist"
              name="masterChecklistId"
              value={selectedChecklistId}
              onChange={(e) => setSelectedChecklistId(e.target.value)}
              options={checklistOptions}
              placeholder="All Checklists"
            />

            {/* From Date */}
            <FormField
              label="From Date"
              name="fromDate"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />

            {/* To Date */}
            <FormField
              label="To Date"
              name="toDate"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
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
        <Loading message="Loading store-date-wise checklist completion report..." />
      ) : !loaded ? null : !hasData ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">No data found</h3>
          <p className="text-muted-foreground">
            No checklist execution data is available for your mapped stores, the selected date range and filters.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden bg-card">
          {/* Status legend */}
          {orderedStatuses.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 border-b border-border">
              <span className="font-medium text-muted-foreground">Legend:</span>
              {orderedStatuses.map(status => (
                <span
                  key={status}
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-medium ${STATUS_STYLES[status] || DEFAULT_STATUS_STYLE}`}
                >
                  {prettyStatus(status)}
                </span>
              ))}
            </div>
          )}

          <div className="overflow-x-auto max-h-[1000px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="sticky top-0 left-0 z-30 px-4 py-4 text-left w-[210px] bg-muted/80 font-medium text-foreground border-r border-border">
                    Store
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col.date}
                      className="sticky top-0 z-20 px-3 py-4 text-center font-semibold text-foreground bg-muted/80 border-r border-border min-w-[200px]"
                    >
                      {formatDateDDMMYYYY(col.date)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: StoreDateWiseChecklistRow, rowIndex: number) => {
                  const agg = storeAggs[rowIndex]
                  return (
                    <tr key={row.storeId} className="border-t border-border">
                      <td className="py-3 pl-4 pr-2 font-medium sticky left-0 z-10 w-[210px] bg-card border-r border-border align-top">
                        <div>{row.storeName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[row.storeCode, row.city].filter(Boolean).join(' • ') || '—'}
                        </div>
                        {/* Store aggregate across the whole range */}
                        {agg.total > 0 && (
                          <div className="mt-1.5 text-sm font-semibold">
                            <span className="mr-1.5 text-[10px] font-normal text-muted-foreground uppercase">
                              Total
                            </span>
                            <span className={completionColor(agg.completionPercent)}>
                              {agg.completionPercent}%
                            </span>
                            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                              ({agg.completed}/{agg.total})
                            </span>
                          </div>
                        )}
                        {/* Store aggregate status chips */}
                        {Object.keys(agg.statusCounts).length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {orderedStatuses.map(status => {
                              const count = agg.statusCounts[status] || 0
                              if (count <= 0) return null
                              return <StatusChip key={status} status={status} count={count} />
                            })}
                          </div>
                        )}
                      </td>
                      {columns.map((col) => {
                        const cell = row.values[col.date]
                        if (!cell || cell.total === 0) {
                          return (
                            <td key={col.date} className="px-3 py-3 text-center text-muted-foreground border-r border-border min-w-[200px]">
                              <span className="text-muted-foreground">-</span>
                            </td>
                          )
                        }
                        const statusList = Object.entries(cell.statusCounts || {})
                          .filter(([, c]) => c > 0)
                          .sort(([a], [b]) => statusSort(a, b))
                        return (
                          <td key={col.date} className="px-3 py-3 text-center border-r border-border min-w-[200px]">
                            <div className="text-sm font-semibold">
                              <span className={completionColor(cell.completionPercent)}>
                                {cell.completionPercent}%
                              </span>
                              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                                ({cell.completed}/{cell.total})
                              </span>
                            </div>
                            {statusList.length > 0 && (
                              <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                                {statusList.map(([status, count]) => (
                                  <StatusChip key={status} status={status} count={count} />
                                ))}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30 font-medium">
                  <td className="px-4 py-3 sticky left-0 z-10 bg-muted border-r border-border">
                    All Stores
                  </td>
                  {columns.map((col, colIndex) => {
                    const agg = dateAggs[colIndex]
                    if (agg.total === 0) {
                      return (
                        <td key={col.date} className="px-3 py-3 text-center border-r border-border min-w-[200px]">
                          <span className="text-muted-foreground">-</span>
                        </td>
                      )
                    }
                    return (
                      <td key={col.date} className="px-3 py-3 text-center border-r border-border min-w-[200px]">
                        <div className="text-sm font-semibold">
                          <span className={completionColor(agg.completionPercent)}>
                            {agg.completionPercent}%
                          </span>
                          <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                            ({agg.completed}/{agg.total})
                          </span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
              <caption className="sr-only">Store-date-wise checklist completion pivot report</caption>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

export default StoreDateWiseChecklistCompletion