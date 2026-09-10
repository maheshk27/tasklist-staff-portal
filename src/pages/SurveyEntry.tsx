import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { taskService } from '../services/apiManager'
import type { SurveyEntry } from '../types/daily-survey'
import toast from 'react-hot-toast'
import { formatDateTime } from '../utils/date'
import PageHeader from '../components/PageHeader'
import { ArrowLeft, Eye } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { canStartSurvey } from '../utils/surveyPermission'

const SurveyEntryPage: React.FC = () => {
  const { dailySurveyId } = useParams<{ dailySurveyId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Permission: only BM/ABM/ABM(OTL)/STL/OTL roles can start/update surveys.
  // Others can only view.
  const userCanStartSurvey = canStartSurvey(user?.role?.roleName)

  const [entries, setEntries] = useState<SurveyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({})
  const [submissionDetails, setSubmissionDetails] = useState<{
    totalItems: number
    completedItems: number
    submittedAt?: string
    submittedBy?: { userId: number; firstName: string; lastName: string } | null
    verifiedAt?: string
    verifiedBy?: { userId: number; firstName: string; lastName: string } | null
    surveyDate?: string
    storeId?: number
    surveyName?: string
    surveyDays?: string[]
  } | null>(null)

  // Local form data for each entry
  const [formData, setFormData] = useState<Record<number, {
    stockOutCount: number
    isRackClean: boolean
    isBoardAvailable: boolean
    actionTaken: string
    entryStatus: string
  }>>({})

  // Fetch submission with entries in a single API call
  useEffect(() => {
    if (!dailySurveyId) return

    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await taskService.getSurveySubmission(Number(dailySurveyId))

        if (!cancelled && res.success && res.data) {
          const data = res.data

          // Set submission details
          setSubmissionDetails({
            totalItems: data.totalItems || 0,
            completedItems: data.completedItems || 0,
            submittedAt: data.submittedAt,
            submittedBy: data.submittedBy,
            verifiedAt: data.verifiedAt,
            verifiedBy: data.verifiedBy,
            surveyDate: data.surveyDate,
            storeId: data.storeId,
            surveyName: data.surveyName,
            surveyDays: data.surveyDays,
          })

          // Set entries from the same response
          const entryList = data.entries || []
          setEntries(entryList)

          // Initialize form data from entries
          const initialFormData: Record<number, any> = {}
          entryList.forEach((entry: SurveyEntry) => {
            initialFormData[entry.surveyEntryId] = {
              stockOutCount: entry.stockOutCount,
              isRackClean: entry.isRackClean,
              isBoardAvailable: entry.isBoardAvailable,
              actionTaken: entry.actionTaken || '',
              entryStatus: entry.entryStatus || 'NOT_STARTED',
            }
          })
          setFormData(initialFormData)
        } else if (!cancelled) {
          setError(res.message || 'Failed to load submission')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [dailySurveyId])

  const handleInputChange = (entryId: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [entryId]: {
        ...prev[entryId],
        [field]: value,
      },
    }))
  }

  const handleSubmitEntry = async (entry: SurveyEntry) => {
    const data = formData[entry.surveyEntryId]
    if (!data) return

    setSubmitting(prev => ({ ...prev, [entry.surveyEntryId]: true }))

    try {
      const response = await taskService.updateSurveyEntry(
        Number(dailySurveyId),
        entry.surveyEntryId,
        {
          stockOutCount: data.stockOutCount,
          isRackClean: data.isRackClean,
          isBoardAvailable: data.isBoardAvailable,
          actionTaken: data.actionTaken,
          entryStatus: data.entryStatus,
        },
      )

      if (response.success) {
        // Update both entries and formData to reflect the new status immediately
        setEntries(prev => prev.map(e =>
          e.surveyEntryId === entry.surveyEntryId
            ? { ...e, entryStatus: data.entryStatus, stockOutCount: data.stockOutCount, isRackClean: data.isRackClean, isBoardAvailable: data.isBoardAvailable, actionTaken: data.actionTaken }
            : e
        ))
        setFormData(prev => ({
          ...prev,
          [entry.surveyEntryId]: {
            ...prev[entry.surveyEntryId],
            entryStatus: data.entryStatus,
          },
        }))
        toast.success('Entry updated successfully')
      } else {
        toast.error(response.message || 'Failed to update entry')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update entry')
    } finally {
      setSubmitting(prev => ({ ...prev, [entry.surveyEntryId]: false }))
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Not Started</span>
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">In Progress</span>
      case 'COMPLETED':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Completed</span>
      case 'SKIPPED':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">Skipped</span>
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{error}</p>
          <button
            onClick={() => navigate('/survey')}
            className="mt-3 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Back to Surveys
          </button>
        </div>
      </div>
    )
  }

  // Calculate summary stats
  const completedCount = entries.filter(e => e.entryStatus === 'COMPLETED').length
  const inProgressCount = entries.filter(e => e.entryStatus === 'IN_PROGRESS').length
  const notStartedCount = entries.filter(e => e.entryStatus === 'NOT_STARTED').length
  // const skippedCount = entries.filter(e => e.entryStatus === 'SKIPPED').length

  const rackCleanCount = entries.filter(e => e.isRackClean === true && e.entryStatus === 'COMPLETED').length
  const boardAvailableCount = entries.filter(e => e.isBoardAvailable === true && e.entryStatus === 'COMPLETED').length

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/survey')}
        className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Survey
      </button>
      <PageHeader
        title={submissionDetails?.surveyName || 'Survey Entry Details'}
        subtitle=""
      />

      {/* View-Only Notice for non-privileged roles */}
      {!userCanStartSurvey && (
        <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Eye className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">View-Only Mode</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Your role does not have permission to start or update this survey.
              You can only view the survey details.
            </p>
          </div>
        </div>
      )}

      {/* Submission Summary Card */}
      {submissionDetails && (
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Submission Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Total Items */}
            <div className="bg-background rounded-lg p-4 border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Items</p>
              <p className="text-2xl font-bold mt-1">{submissionDetails.totalItems}</p>
            </div>

            {/* Not Started */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-700 uppercase tracking-wide">Not Started</p>
              <p className="text-2xl font-bold mt-1 text-gray-800">{notStartedCount}</p>
            </div>

            {/* In Progress */}
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-xs text-yellow-700 uppercase tracking-wide">In Progress</p>
              <p className="text-2xl font-bold mt-1 text-yellow-800">{inProgressCount}</p>
            </div>

            {/* Completed */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-xs text-green-700 uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold mt-1 text-green-800">{completedCount}</p>
            </div>

            {/* Skipped */}
            {/*  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-xs text-red-700 uppercase tracking-wide">Skipped</p>
              <p className="text-2xl font-bold mt-1 text-red-800">{skippedCount}</p>
            </div> */}

            {/* Rack Clean */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-xs text-blue-700 uppercase tracking-wide">Rack Clean</p>
              <p className="text-2xl font-bold mt-1 text-blue-800">{rackCleanCount}</p>
            </div>

            {/* Board Available */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-xs text-purple-700 uppercase tracking-wide">Board Available</p>
              <p className="text-2xl font-bold mt-1 text-purple-800">{boardAvailableCount}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{submissionDetails.totalItems > 0 ? Math.round((completedCount / submissionDetails.totalItems) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-primary rounded-full h-2.5 transition-all"
                style={{
                  width: submissionDetails.totalItems > 0
                    ? `${Math.round((completedCount / submissionDetails.totalItems) * 100)}%`
                    : '0%'
                }}
              />
            </div>
          </div>

          {/* Submission Metadata */}
          {(submissionDetails.submittedBy || submissionDetails.verifiedBy || submissionDetails.surveyDate) && (
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {submissionDetails?.surveyDays && submissionDetails.surveyDays.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Survey Days:</span>
                  <span className="ml-1 font-medium">{submissionDetails.surveyDays.join(", ")}</span>
                </div>
                
              )}
              {submissionDetails.surveyDate && (
                <div>
                  <span className="text-muted-foreground">Survey Date:</span>
                  <span className="ml-1 font-medium">{submissionDetails.surveyDate}</span>
                </div>
              )}
              {submissionDetails.submittedBy && (
                <div>
                  <span className="text-muted-foreground">Submitted by:</span>
                  <span className="ml-1 font-medium">
                    {submissionDetails.submittedBy.firstName} {submissionDetails.submittedBy.lastName}
                  </span>
                </div>
              )}
              {submissionDetails.verifiedBy && (
                <div>
                  <span className="text-muted-foreground">Verified by:</span>
                  <span className="ml-1 font-medium">
                    {submissionDetails.verifiedBy.firstName} {submissionDetails.verifiedBy.lastName}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-muted-foreground">No entries found for this survey.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entries.map((entry) => {
            const data = formData[entry.surveyEntryId]
            if (!data) return null

            return (
              <div
                key={entry.surveyEntryId}
                className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-4 pb-3 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      {/* <span className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-semibold text-primary">
                        {index + 1}
                      </span> */}
                      <div className="text-md text-foreground font-medium">
                        {(entry as any).surveyItemName || `Item #${entry.surveyItemId}`}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(entry.entryStatus)}
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Stock Out Count */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Stock Out Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={data.stockOutCount}
                      onChange={(e) => handleInputChange(entry.surveyEntryId, 'stockOutCount', parseInt(e.target.value) || 0)}
                      disabled={!userCanStartSurvey}
                      className={`w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${!userCanStartSurvey ? 'opacity-60 cursor-not-allowed' : ''}`}
                      placeholder="Enter stock out count"
                    />
                  </div>

                  {/* Rack Clean - Yes/No */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Rack Clean</label>
                    <div className="flex gap-3">
                      <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-colors ${data.isRackClean ? 'bg-green-50 border-green-300 text-green-800' : 'border-border hover:bg-muted/50'
                        } ${!userCanStartSurvey ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name={`rackClean-${entry.surveyEntryId}`}
                          checked={data.isRackClean === true}
                          onChange={() => handleInputChange(entry.surveyEntryId, 'isRackClean', true)}
                          disabled={!userCanStartSurvey}
                          className="sr-only"
                        />
                        <svg className={`w-5 h-5 ${data.isRackClean ? 'text-green-600' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium">Yes</span>
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-colors ${data.isRackClean === false ? 'bg-red-50 border-red-300 text-red-800' : 'border-border hover:bg-muted/50'
                        } ${!userCanStartSurvey ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name={`rackClean-${entry.surveyEntryId}`}
                          checked={data.isRackClean === false}
                          onChange={() => handleInputChange(entry.surveyEntryId, 'isRackClean', false)}
                          disabled={!userCanStartSurvey}
                          className="sr-only"
                        />
                        <svg className={`w-5 h-5 ${data.isRackClean === false ? 'text-red-600' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-sm font-medium">No</span>
                      </label>
                    </div>
                  </div>

                  {/* Board Available - Yes/No */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Board Available</label>
                    <div className="flex gap-3">
                      <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-colors ${data.isBoardAvailable ? 'bg-green-50 border-green-300 text-green-800' : 'border-border hover:bg-muted/50'
                        } ${!userCanStartSurvey ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name={`boardAvailable-${entry.surveyEntryId}`}
                          checked={data.isBoardAvailable === true}
                          onChange={() => handleInputChange(entry.surveyEntryId, 'isBoardAvailable', true)}
                          disabled={!userCanStartSurvey}
                          className="sr-only"
                        />
                        <svg className={`w-5 h-5 ${data.isBoardAvailable ? 'text-green-600' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium">Yes</span>
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-colors ${data.isBoardAvailable === false ? 'bg-red-50 border-red-300 text-red-800' : 'border-border hover:bg-muted/50'
                        } ${!userCanStartSurvey ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="radio"
                          name={`boardAvailable-${entry.surveyEntryId}`}
                          checked={data.isBoardAvailable === false}
                          onChange={() => handleInputChange(entry.surveyEntryId, 'isBoardAvailable', false)}
                          disabled={!userCanStartSurvey}
                          className="sr-only"
                        />
                        <svg className={`w-5 h-5 ${data.isBoardAvailable === false ? 'text-red-600' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-sm font-medium">No</span>
                      </label>
                    </div>
                  </div>

                  {/* Entry Status */}
                  {/* {['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['IN_PROGRESS', 'COMPLETED'].map(status => (
                        <label key={status} className={`p-2 border text-center rounded-lg transition-colors ${data.entryStatus === status ? 'bg-primary/10 border-primary text-primary' : 'border-border hover:bg-muted/50'
                          } ${!userCanStartSurvey ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="radio"
                            name={`entryStatus-${entry.surveyEntryId}`}
                            checked={data.entryStatus === status}
                            onChange={() => handleInputChange(entry.surveyEntryId, 'entryStatus', status)}
                            disabled={!userCanStartSurvey}
                            className="sr-only"
                          />
                          <span className="text-sm font-medium">{status == "IN_PROGRESS" ? 'In Progess' : 'Completed'}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Action Taken */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Action Taken
                    </label>
                    <textarea
                      value={data.actionTaken}
                      onChange={(e) => handleInputChange(entry.surveyEntryId, 'actionTaken', e.target.value)}
                      readOnly={!userCanStartSurvey}
                      className={`w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none ${!userCanStartSurvey ? 'opacity-60 cursor-not-allowed' : ''}`}
                      rows={2}
                      placeholder="Enter action taken (optional)"
                    />
                  </div>

                  {
                    entry.entryStatus === 'COMPLETED' && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
                        Submitted By: {entry.submittedBy ? `${entry.submittedBy.firstName} ${entry.submittedBy.lastName}` : 'N/A'} <br />
                        Submitted At: {entry.submittedAt ? formatDateTime(entry.submittedAt) : 'N/A'}
                      </div>
                    )
                  }

                  {/* Submit Button */}
                  {!userCanStartSurvey ? (
                    <div className="w-full px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium text-center cursor-not-allowed">
                      View Only — cannot update entries
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSubmitEntry(entry)}
                      disabled={submitting[entry.surveyEntryId] || data.entryStatus === 'NOT_STARTED' || data.entryStatus === 'SKIPPED'}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting[entry.surveyEntryId] ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Submit
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SurveyEntryPage