import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { taskService } from '../../../services/apiManager'
import type {
  StoreSurveyDateWiseResponse,
  SurveyDateRow,
  SurveyDateCell,
} from '../../../types/store-survey-date-wise-completion'
import type { DailySurvey } from '../../../types/daily-survey'
import { useMappedStores, resolveReportStoreIds } from '../../../hooks/useMappedStores'
import MultiSelectDropdown, { type MultiSelectOption } from '../../../components/ui/MultiSelectDropdown'
import Loading from '../../../components/Loading'
import FormSelect from '../../../components/ui/FormSelect'
import FormField from '../../../components/ui/FormField'
import PageHeader from '../../../components/PageHeader'
import { FilterSection } from '../../../components/FilterSection'
import { RotateCcw, Search, Download, Info, ExternalLink } from 'lucide-react'

/**
 * Store survey date wise completion status report rendered as a PIVOT table.
 *
 * Row     : Store (storeName, storeCode, city)
 * Columns : Date (DD-MM-YYYY; every calendar day in the selected range)
 * Values  : One card per survey on that store + day with its status,
 *           completion % and completed/total items
 *
 * Staff-portal differences vs the admin-portal version:
 *  - the store list is built from the logged-in user's store mapping
 *    (inactive mappings excluded) instead of the full store master list;
 *  - the report API is always called with explicit `storeIds` — the selected
 *    stores, or every mapped store when the user selects none;
 *  - clicking a survey card opens the (existing, view-only aware) staff survey
 *    page for that daily survey instead of an embedded admin modal.
 */

/** Today as a local YYYY-MM-DD string. */
const getTodayString = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 7 days ago as a local YYYY-MM-DD string (default date range). */
const getDefaultFromDate = (): string => {
  const now = new Date()
  now.setDate(now.getDate() - 6)
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

/** Status badge color helper (mirrors the survey status colours used app-wide). */
const getStatusStyle = (status: string): string => {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'IN_PROGRESS':
    case 'IN-PROGRESS':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'DRAFT':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    case 'NOT_STARTED':
    case 'NOT-STARTED':
      return 'bg-gray-100 text-gray-600 border-gray-200'
    case 'SUBMITTED':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200'
    case 'VERIFIED':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

const StoreSurveyDateWiseCompletion: React.FC = () => {
  const navigate = useNavigate()

  // Filters
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([])
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>(getDefaultFromDate())
  const [toDate, setToDate] = useState<string>(getTodayString())
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

  // Daily surveys for the optional "Survey" filter.
  const [surveys, setSurveys] = useState<DailySurvey[]>([])

  // Results
  const [report, setReport] = useState<StoreSurveyDateWiseResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Load surveys for the filter dropdown on mount.
  const fetchSurveys = useCallback(async () => {
    try {
      const data = await taskService.getDailySurveys()
      const sorted = [...data].sort((a, b) => a.surveyName.localeCompare(b.surveyName))
      setSurveys(sorted)
    } catch {
      // Survey dropdown is optional; proceed without it.
      setSurveys([])
    }
  }, [])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  const fetchReport = useCallback(async (opts: {
    storeIds: number[]
    city?: string
    surveyId?: string
    from?: string
    to?: string
  }) => {
    // Without a store scope the API would return every store — never allowed here.
    if (opts.storeIds.length === 0) return
    setLoading(true)
    setError(null)
    setLoaded(false)
    try {
      const data = await taskService.getStoreSurveyDateWiseCompletion({
        storeIds: opts.storeIds,
        city: opts.city || undefined,
        surveyId: opts.surveyId ? parseInt(opts.surveyId, 10) : undefined,
        fromDate: opts.from || undefined,
        toDate: opts.to || undefined,
      })
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch the store survey date wise completion report')
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
      surveyId: selectedSurveyId,
      from: fromDate,
      to: toDate,
    })
  }

  const handleReset = () => {
    setSelectedStoreIds([])
    setSelectedCity('')
    setSelectedSurveyId('')
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

  /**
   * Drill-down: open the staff survey page for the clicked cell. The route is
   * already permission/history aware and renders view-only when needed, and the
   * `viewOnly` nav state forces read-only so a report never mutates data.
   */
  const handleCellClick = (dailySurveyId: number | undefined) => {
    if (!dailySurveyId) return
    navigate(`/survey/${dailySurveyId}`, { state: { viewOnly: true } })
  }

  // Stores shown in the multi-select, filtered by the selected city (optional).
  const filteredStores = selectedCity
    ? stores.filter(s => s.city === selectedCity)
    : stores
  const storeOptions: MultiSelectOption[] = filteredStores.map(store => ({
    value: store.storeId,
    label: `${store.storeName} (${store.storeCode})`,
  }))

  const dates = report?.dates || []
  // Sort pivot rows by store name ascending (matches the store dropdown order).
  const rows = [...(report?.rows || [])].sort(
    (a, b) => (a.storeName || '').localeCompare(b.storeName || ''),
  )
  const hasData = rows.length > 0 && dates.length > 0
  const noMappedStores = !isLoadingStores && !storesError && mappedStoreIds.length === 0

  // Download the report as an Excel file preserving the same pivot layout
  // shown in the UI: Store rows x Date columns (DD-MM-YYYY). Each cell lists
  // every survey for that store + day with its status, name and completion
  // (mirroring the survey cards), or "-" when the store has no surveys.
  // `xlsx` is imported on demand so it stays out of the staff PWA's main bundle.
  const handleDownloadReport = async () => {
    if (!report || !hasData) return
    try {
      const XLSX = await import('xlsx')

      const headerRow = [
        'Store',
        'Store Code',
        'City',
        ...dates.map(date => formatDateDDMMYYYY(date.date)),
      ]

      const bodyRows = rows.map(row => [
        row.storeName,
        row.storeCode,
        row.city || '',
        ...dates.map(date => {
          const cells = row.values[date.date] || []
          if (cells.length === 0) return '-'
          return cells
            .map(cell =>
              `[${cell.surveyStatus}] ${cell.surveyName} — ${cell.completionPercent}% (${cell.completedItems}/${cell.totalItems})`,
            )
            .join('\n')
        }),
      ])

      const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows])
      worksheet['!cols'] = [
        { wch: 30 },
        { wch: 14 },
        { wch: 20 },
        ...dates.map(() => ({ wch: 45 })),
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')

      const dateStamp = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(workbook, `store-survey-date-wise-completion-${dateStamp}.xlsx`)
    } catch (err) {
      console.error('Failed to export the store survey date wise completion report', err)
      toast.error('Failed to download the report')
    }
  }

  return (
    <>
      <PageHeader
        title="Store-Date-Wise Survey Completion"
        subtitle="Pivot report of daily survey completion status per store."
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
          title="Search & Filter Survey"
          hasActiveFilters={!!(selectedStoreIds.length || selectedCity || selectedSurveyId || fromDate || toDate)}
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
              name="city"
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

            {/* Daily Survey */}
            <FormSelect
              label="Survey"
              name="survey"
              value={selectedSurveyId}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              options={surveys.map(s => ({ value: s.surveyId, label: s.surveyName }))}
              placeholder="All Surveys"
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
        <Loading message="Loading store survey date wise completion report..." />
      ) : !loaded ? null : !hasData ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">No data found</h3>
          <p className="text-muted-foreground">
            No survey data is available for your mapped stores, the selected date range and filters.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden bg-card">
          {/* Status legend + drill-down hint */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 border-b border-border">
            <span className="font-medium text-muted-foreground">Legend:</span>
            {['DRAFT', 'COMPLETED', 'IN_PROGRESS', 'NOT_STARTED', 'SUBMITTED', 'VERIFIED'].map(status => (
              <span
                key={status}
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-medium ${getStatusStyle(status)}`}
              >
                {status}
              </span>
            ))}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ExternalLink className="h-3.5 w-3.5" /> Click a survey to open its details
            </span>
          </div>

          <div className="overflow-x-auto max-h-[1000px]">
            <table className="text-sm table-fixed">
              <thead className="bg-muted/50">
                <tr>
                  <th className="sticky top-0 left-0 z-30 px-4 py-4 text-left w-[210px] bg-muted/80 font-medium text-foreground border-r border-border">Store</th>
                  {dates.map((date) => (
                    <th key={date.date} className="sticky top-0 z-20 px-4 py-4 text-center font-medium text-foreground bg-muted/80 border-r border-border min-w-[200px]">{formatDateDDMMYYYY(date.date)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: SurveyDateRow) => (
                  <tr key={row.storeId} className="border-t border-border">
                    <td className="py-3 pl-4 pr-2 font-medium sticky left-0 z-10 w-[210px] bg-card hover:bg-muted border-r border-border align-top">
                      <div>{row.storeName}</div>
                      <div className="text-xs text-muted-foreground truncate uppercase my-1">{row.storeCode || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate uppercase">{row.city || '—'}</div>
                    </td>
                    {dates.map((date) => {
                      const cells: SurveyDateCell[] = row.values[date.date] || []
                      return (
                        <td key={date.date} className="w-[200px] px-2 py-2 text-center border-r border-border align-top">
                          {cells.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              {cells.map((cell, idx) => (
                                <div
                                  key={`${cell.dailySurveyId}-${idx}`}
                                  className={`w-full flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md border ${cell.dailySurveyId ? 'cursor-pointer hover:shadow-sm transition-all' : ''} ${getStatusStyle(cell.surveyStatus)}`}
                                  title={cell.dailySurveyId ? `${cell.surveyName} — click to view survey details` : cell.surveyName}
                                  onClick={() => handleCellClick(cell.dailySurveyId)}
                                >
                                  <span className="text-xs font-medium leading-tight line-clamp-1 break-words w-full" title={cell.surveyName}>
                                    {cell.surveyName}
                                  </span>
                                  <span className="text-base font-bold leading-tight">
                                    {cell.completionPercent}%
                                  </span>
                                  <span className="text-[9px] opacity-70 leading-tight">
                                    {cell.completedItems}/{cell.totalItems}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <caption className="sr-only">Store survey date wise completion status pivot report</caption>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

export default StoreSurveyDateWiseCompletion