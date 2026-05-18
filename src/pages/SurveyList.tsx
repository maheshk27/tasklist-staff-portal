import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { onboardingService, taskService } from '../services/apiManager'
import type { StoreWithMapping } from '../types/user-store'
import type { SurveyWithStatus } from '../types/daily-survey'
import toast from 'react-hot-toast'

const SurveyList: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Stores
  const [stores, setStores] = useState<StoreWithMapping[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [isLoadingStores, setIsLoadingStores] = useState(true)
  const [storesError, setStoresError] = useState<string | null>(null)

  // Survey date
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const [surveyDate, setSurveyDate] = useState(today)

  // Surveys
  const [surveys, setSurveys] = useState<SurveyWithStatus[]>([])
  const [isLoadingSurveys, setIsLoadingSurveys] = useState(false)
  const [surveysError, setSurveysError] = useState<string | null>(null)

  // Fetch assigned stores on mount
  useEffect(() => {
    let cancelled = false

    const fetchStores = async () => {
      if (!user) return
      setIsLoadingStores(true)
      setStoresError(null)

      try {
        const response = await onboardingService.getUserStores(user.userId)
        if (!cancelled) {
          const activeStores = response.stores.filter(s => s.mapping.isActive)
          setStores(activeStores)
          if (activeStores.length > 0) {
            setSelectedStoreId(activeStores[0].store.storeId)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setStoresError(err instanceof Error ? err.message : 'Failed to load stores')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStores(false)
        }
      }
    }

    fetchStores()
    return () => { cancelled = true }
  }, [user])

  // Fetch active surveys when store or date changes
  useEffect(() => {
    if (!selectedStoreId) return

    let cancelled = false

    const fetchSurveys = async () => {
      setIsLoadingSurveys(true)
      setSurveysError(null)

      try {
        const response = await taskService.getActiveSurveysForStaff(selectedStoreId, surveyDate)
        if (!cancelled) {
          setSurveys(response.data || [])
        }
      } catch (err) {
        if (!cancelled) {
          setSurveysError(err instanceof Error ? err.message : 'Failed to fetch surveys')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSurveys(false)
        }
      }
    }

    fetchSurveys()
    return () => { cancelled = true }
  }, [selectedStoreId, surveyDate])

  // Handle start survey
  const handleStartSurvey = async (survey: SurveyWithStatus) => {
    if (!user || !selectedStoreId) return

    try {
      const response = await taskService.createSurveySubmission({
        surveyId: survey.surveyId,
        storeId: selectedStoreId,
        surveyDate: surveyDate,
        submittedBy: user.userId,
      })

      if (response.success && response.data?.dailySurveyId) {
        toast.success('Survey started successfully')
        navigate(`/survey/${response.data.dailySurveyId}`)
      } else {
        toast.error(response.message || 'Failed to start survey')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start survey')
    }
  }

  // Handle continue survey
  const handleContinueSurvey = (dailySurveyId: number) => {
    navigate(`/survey/${dailySurveyId}`)
  }

  // Get selected store details
  const selectedStore = selectedStoreId
    ? stores.find(s => s.store.storeId === selectedStoreId)
    : null

  // Helper to get status badge color
  const getStatusBadgeClass = (status: string | null | undefined) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800'
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800'
      case 'VERIFIED':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string | null | undefined) => {
    if (!status) return 'Not Started'
    switch (status) {
      case 'DRAFT': return 'Draft'
      case 'SUBMITTED': return 'Submitted'
      case 'VERIFIED': return 'Verified'
      case 'COMPLETED': return 'Completed'
      default: return status
    }
  }

  // Render store selector
  const renderStoreSelector = () => {
    if (isLoadingStores) {
      return (
        <div className="flex justify-end">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (storesError) {
      return (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{storesError}</p>
        </div>
      )
    }

    if (stores.length === 0) {
      return <p className="text-muted-foreground text-sm">No active stores assigned to you.</p>
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <label htmlFor="store-select" className="text-sm font-medium text-foreground whitespace-nowrap">
            Store
          </label>
          <select
            id="store-select"
            value={selectedStoreId ?? ''}
            onChange={(e) => setSelectedStoreId(Number(e.target.value))}
            className="p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[200px]"
          >
            {stores.map(({ store }) => (
              <option key={store.storeId} value={store.storeId}>
                {store.storeName} ({store.storeCode})
              </option>
            ))}
          </select>
        </div>

        {selectedStore && (
          <div className="text-xs text-muted-foreground">
            <p>{selectedStore.store.addressLine1}, {selectedStore.store.city}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Daily Survey</h1>
        <p className="text-muted-foreground mt-2">Select store and date to view surveys</p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full sm:w-auto">
            {renderStoreSelector()}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label htmlFor="survey-date" className="text-sm font-medium text-foreground whitespace-nowrap">
              Date
            </label>
            <input
              id="survey-date"
              type="date"
              value={surveyDate}
              onChange={(e) => setSurveyDate(e.target.value)}
              className="p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Surveys list */}
      {!selectedStoreId ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <div className="text-4xl mb-4">🏪</div>
          <p className="text-muted-foreground">Please select a store to view surveys.</p>
        </div>
      ) : isLoadingSurveys ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : surveysError ? (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{surveysError}</p>
        </div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-muted-foreground">No active surveys found for this store and date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys.map((survey) => (
            <div
              key={survey.surveyId}
              className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-foreground">{survey.surveyName}</h3>
                  <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeClass(survey.surveyStatus)}`}>
                    {getStatusLabel(survey.surveyStatus)}
                  </span>
                </div>

                {survey.dailySurveyId && (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {survey.completedItems}/{survey.totalItems}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{
                          width: survey.totalItems && survey.totalItems > 0
                            ? `${Math.round(((survey.completedItems || 0) / survey.totalItems) * 100)}%`
                            : '0%'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-3 border-t border-border">
                {!survey.dailySurveyId ? (
                  <button
                    onClick={() => handleStartSurvey(survey)}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    Start Survey
                  </button>
                ) : (
                  <button
                    onClick={() => handleContinueSurvey(survey.dailySurveyId!)}
                    className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    Continue Survey
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SurveyList