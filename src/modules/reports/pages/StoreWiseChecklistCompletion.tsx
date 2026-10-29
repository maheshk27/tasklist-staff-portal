import React, { useState, useCallback, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { onboardingService, taskService } from '../../../services/apiManager'
import type { StoreWiseChecklistCompletionResponse, StoreWiseChecklistRow } from '../../../types/store-wise-checklist-completion'
import type { Role } from '../../../types/role'
import { useMappedStores, resolveReportStoreIds } from '../../../hooks/useMappedStores'
import MultiSelectDropdown, { type MultiSelectOption } from '../../../components/ui/MultiSelectDropdown'
import Loading from '../../../components/Loading'
import FormSelect from '../../../components/ui/FormSelect'
import FormField from '../../../components/ui/FormField'
import PageHeader from '../../../components/PageHeader'
import { FilterSection } from '../../../components/FilterSection'
import { RotateCcw, Search, Download, Info } from 'lucide-react'
import { formatTime } from '../../../utils/date'

/**
 * Store-wise checklist completion report rendered as a PIVOT table.
 *
 * Row     : Store (storeName, storeCode, city)
 * Columns : Checklist (checklistTitle)
 * Values  : Count of checklist executions with status = COMPLETED
 * Last    : Average % Completed per store
 *
 * Staff-portal differences vs the admin-portal version:
 *  - the store list is built from the logged-in user's store mapping
 *    (inactive mappings excluded) instead of the full store master list;
 *  - the report API is always called with explicit `storeIds` — the selected
 *    stores, or every mapped store when the user selects none — so a staff
 *    user can never pull another store's data.
 */
const StoreWiseChecklistCompletion: React.FC = () => {
  // Filters
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([])
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedChecklistPriority, setSelectedChecklistPriority] = useState<string>('')
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
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
  const [report, setReport] = useState<StoreWiseChecklistCompletionResponse | null>(null)
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
    from?: string
    to?: string
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
      const data = await taskService.getStoreWiseChecklistCompletion({
        storeIds: opts.storeIds,
        city: opts.city || undefined,
        checklistPriority: opts.checklistPriority || undefined,
        roleId: opts.roleId ? parseInt(opts.roleId, 10) : undefined,
        fromDate: opts.from || undefined,
        toDate: opts.to || undefined,
      })
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch the store-wise checklist completion report')
      setReport(null)
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [])

  // Initial load: as soon as the mapped stores resolve, fetch the report for
  // those stores — a store selection is optional, not required.
  const initialLoadDone = useRef(false)
  useEffect(() => {
    if (initialLoadDone.current || isLoadingStores) return
    if (mappedStoreIds.length === 0) return
    initialLoadDone.current = true
    fetchReport({ storeIds: mappedStoreIds })
  }, [isLoadingStores, mappedStoreIds, fetchReport])

  const handleSearch = () => {
    fetchReport({
      // Selected stores, or every mapped store when nothing is selected.
      storeIds: resolveReportStoreIds(selectedStoreIds, mappedStoreIds),
      from: fromDate,
      to: toDate,
      city: selectedCity,
      checklistPriority: selectedChecklistPriority,
      roleId: selectedRoleId,
    })
  }

  const handleReset = () => {
    setSelectedStoreIds([])
    setSelectedCity('')
    setSelectedChecklistPriority('')
    setFromDate('')
    setToDate('')
    setSelectedRoleId('')
    setReport(null)
    setError(null)
    setLoaded(false)
    // Nothing selected after a reset → fall back to every mapped store.
    if (mappedStoreIds.length > 0) fetchReport({ storeIds: mappedStoreIds })
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
  // Sort pivot rows by store name ascending (matches the store dropdown order).
  const rows = [...(report?.rows || [])].sort(
    (a, b) => (a.storeName || '').localeCompare(b.storeName || ''),
  )
  const hasData = rows.length > 0 && checklists.length > 0
  const noMappedStores = !isLoadingStores && !storesError && mappedStoreIds.length === 0

  // Download the report as an Excel file preserving the same pivot layout shown
  // in the UI (Store rows x Checklist columns, completed-execution counts as the
  // values, plus the per-store average %). `xlsx` is imported on demand so it
  // stays out of the staff PWA's main bundle.
  const handleDownloadReport = async () => {
    if (!report || !hasData) return
    try {
      const XLSX = await import('xlsx')

      // Header row mirrors the UI: Store identifiers first, then one column per
      // checklist (title / regional text / time range stacked like the UI), and
      // finally the Average % Completed summary.
      const headerRow = [
        'Store',
        'Store Code',
        'City',
        ...checklists.map((checklist) => {
          const parts = [checklist.checklistTitle]
          if (checklist.checklistRegionalText) parts.push(checklist.checklistRegionalText)
          if (checklist.fromTime || checklist.toTime) {
            parts.push(`${formatTime(checklist.fromTime)} - ${formatTime(checklist.toTime)}`)
          }
          return parts.join('\n')
        }),
        'Average % Completed',
      ]

      // Body rows mirror the UI cells: a zero for checklists with no completed
      // executions, otherwise the completion count.
      const bodyRows = rows.map((row) => [
        row.storeName,
        row.storeCode,
        row.city || '',
        ...checklists.map((checklist) => {
          const completed = row.values[String(checklist.mstChecklistId)] || 0
          return completed > 0 ? completed : 0
        }),
        row.averageCompletionPercent,
      ])

      const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows])

      // Reasonable column widths so long checklist titles stay readable.
      worksheet['!cols'] = [
        { wch: 30 },
        { wch: 14 },
        { wch: 20 },
        ...checklists.map((checklist) => ({
          wch: Math.min(50, Math.max(16, checklist.checklistTitle.length + 4)),
        })),
        { wch: 20 },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')

      const dateStamp = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(workbook, `store-wise-checklist-completion-${dateStamp}.xlsx`)
    } catch (err) {
      console.error('Failed to export the store-wise checklist completion report', err)
      toast.error('Failed to download the report')
    }
  }

  return (
    <>
      <PageHeader
        title="Store-Wise Checklist Completion"
        subtitle="Pivot report of completed checklists for the stores mapped to you."
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
          hasActiveFilters={!!(selectedStoreIds.length || selectedCity || selectedChecklistPriority || selectedRoleId || fromDate || toDate)}
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
        <Loading message="Loading store-wise checklist completion report..." />
      ) : !loaded ? null : !hasData ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">No data found</h3>
          <p className="text-muted-foreground">
            No completed checklist data is available for your mapped stores and the selected filters.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden bg-card">
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
                          className="max-w-[250px] mt-2 font-normal text-muted-foreground"
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
                {rows.map((row: StoreWiseChecklistRow) => (
                  <tr key={row.storeId} className="border-t border-border hover:bg-muted/50">
                    <td className="px-4 py-4 font-medium sticky left-0 z-10 w-[210px] bg-card hover:bg-muted border-r border-border">
                      <div>
                        <span className="font-semibold">{row.storeName}</span>
                        <span className="mx-2 text-muted-foreground">|</span>
                        <span className={row.averageCompletionPercent >= 100 ? 'text-green-600' : row.averageCompletionPercent >= 75 ? 'text-amber-600' : 'text-red-600'}>
                          {row.averageCompletionPercent}%
                          <span className="ml-2 text-muted-foreground">
                            ({row.completedCount}/{row.totalChecklistExecutions})
                          </span>
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[row.storeCode, row.city].filter(Boolean).join(' • ') || '—'}
                      </div>
                    </td>
                    {checklists.map((checklist) => {
                      const completed = row.values[String(checklist.mstChecklistId)] || 0
                      return (
                        <td key={checklist.mstChecklistId} className="px-4 py-4 text-center border-r border-border">
                          {completed > 0 ? completed : <span className="text-muted-foreground">-</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <caption className="sr-only">Store-wise checklist completion pivot report</caption>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

export default StoreWiseChecklistCompletion
