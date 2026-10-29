import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StoreIcon, MapPin, Eye, PlayCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { onboardingService, taskService } from '../services/apiManager'
import type { StoreWithMapping } from '../types/user-store'
import type { SurveyWithStatus } from '../types/daily-survey'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import FilterSection from '../components/FilterSection'
import FormSelect from '../components/ui/FormSelect'
import FormField from '../components/ui/FormField'
import { canStartSurvey } from '../utils/surveyPermission'

const SurveyList: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Permission: only BM/ABM/ABM(OTL)/STL/OTL roles can start surveys.
  // Others can only view surveys.
  const userCanStartSurvey = canStartSurvey(user?.role?.roleName)

  // Stores
  const [stores, setStores] = useState<StoreWithMapping[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [isLoadingStores, setIsLoadingStores] = useState(true)
  const [storesError, setStoresError] = useState<string | null>(null)

  // Survey date
  const today = new Date().toLocaleDateString('en-CA') // Format as YYYY-MM-DD for input[type=date]
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

    // Only allow starting survey for today's date
    if (surveyDate !== today) {
      toast.error('Surveys can only be started for today\'s date')
      return
    }

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
    // Allow viewing historical surveys, but only continue for today's date
    navigate(`/survey/${dailySurveyId}`, { 
      state: { viewOnly: surveyDate !== today }
    })
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Daily Survey"
        subtitle="Select store and date to view surveys"
      />

      {/* Filters: Store + Date */}
      <div className="bg-card rounded-xl border border-border">
        <FilterSection title="Search Filters" />
        <div className="p-4">
          {isLoadingStores ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : storesError ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-destructive text-sm">{storesError}</p>
            </div>
          ) : stores.length === 0 ? (
            <p className="py-4 text-muted-foreground text-sm">No active stores assigned to you.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <FormSelect
                  label="Store"
                  name="selectedStoreId"
                  value={selectedStoreId ?? ''}
                  onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                  options={stores.map(({ store }) => ({
                    value: store.storeId,
                    label: `${store.storeName} (${store.storeCode})`,
                  }))}
                  placeholder="Select Store"
                  required
                />
                <FormField
                  label="Date"
                  name="surveyDate"
                  type="date"
                  value={surveyDate}
                  onChange={(e) => {
                    // Do not allow future dates
                    const selected = e.target.value
                    if (selected && selected > today) {
                      return
                    }
                    setSurveyDate(selected)
                  }}
                  max={today}
                />
              </div>

              {/* Selected store details */}
              {selectedStore && (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-muted/50 px-4 py-2.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <StoreIcon className="h-3.5 w-3.5 text-primary" />
                    {selectedStore.store.storeName}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {[selectedStore.store.addressLine1, selectedStore.store.addressLine2, selectedStore.store.city, selectedStore.store.state, selectedStore.store.pinCode].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </>
          )}
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
              <div className="flex-1 space-y-3">
                <h3 className="text-md font-medium text-foreground">{survey.surveyName}</h3>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {survey.surveyDays && survey.surveyDays.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {survey.surveyDays.map((day) => (
                          <span
                            key={day}
                            className="px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground"
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
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

              <div className="">
                {!survey.dailySurveyId ? (
                  userCanStartSurvey ? (
                    <button
                      onClick={() => handleStartSurvey(survey)}
                      disabled={surveyDate !== today}
                      className={`mt-6 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        surveyDate === today
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                      title={surveyDate !== today ? 'Surveys can only be started for today\'s date' : 'Start Survey'}
                    >
                      <PlayCircle className="h-4 w-4" />
                      Start Survey
                    </button>
                  ) : (
                    <button
                      disabled
                      className="mt-6 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium cursor-not-allowed"
                      title="Only BM, ABM, ABM(OTL), STL and OTL roles can start surveys"
                    >
                      <Eye className="h-4 w-4" />
                      View Only
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleContinueSurvey(survey.dailySurveyId!)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    <Eye className="h-4 w-4" />
                    {surveyDate === today && userCanStartSurvey ? 'Continue Survey' : 'View Survey'}
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