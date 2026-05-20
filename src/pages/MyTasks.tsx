import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { onboardingService, taskService } from '../services/apiManager'
import type { StoreWithMapping } from '../types/user-store'
import type { TaskExecution, TaskExecutionStatus } from '../types/task-execution'
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../types/task-execution'
import { formatDate, formatTime } from '../utils/date'

type TabType = 'today' | 'historical'

const MyTasks: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Stores
  const [stores, setStores] = useState<StoreWithMapping[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [isLoadingStores, setIsLoadingStores] = useState(true)
  const [storesError, setStoresError] = useState<string | null>(null)

  // Tabs
  const [activeTab, setActiveTab] = useState<TabType>('today')

  // Today's tasks
  const [todaysTasks, setTodaysTasks] = useState<TaskExecution[]>([])
  const [isLoadingTodaysTasks, setIsLoadingTodaysTasks] = useState(false)
  const [todaysTasksError, setTodaysTasksError] = useState<string | null>(null)

  // Historical tasks
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [historicalTasks, setHistoricalTasks] = useState<TaskExecution[]>([])
  const [isLoadingHistoricalTasks, setIsLoadingHistoricalTasks] = useState(false)
  const [historicalTasksError, setHistoricalTasksError] = useState<string | null>(null)

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
          // Auto-select first store if available
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

  // Fetch today's tasks when store changes
  useEffect(() => {
    if (!selectedStoreId) return

    let cancelled = false

    const fetchTodaysTasks = async () => {
      setIsLoadingTodaysTasks(true)
      setTodaysTasksError(null)

      try {
        const response = await taskService.getTodaysTasks(selectedStoreId)
        if (!cancelled) {
          setTodaysTasks(response.data || [])
        }
      } catch (err) {
        if (!cancelled) {
          setTodaysTasksError(err instanceof Error ? err.message : 'Failed to fetch today\'s tasks')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTodaysTasks(false)
        }
      }
    }

    fetchTodaysTasks()
    return () => { cancelled = true }
  }, [selectedStoreId])

  // Fetch historical tasks when store AND date change
  const fetchHistoricalTasks = useCallback(async () => {
    if (!selectedStoreId || !selectedDate) return

    setIsLoadingHistoricalTasks(true)
    setHistoricalTasksError(null)

    try {
      const response = await taskService.getHistoricalTasks(selectedStoreId, selectedDate)
      setHistoricalTasks(response.data || [])
    } catch (err) {
      setHistoricalTasksError(err instanceof Error ? err.message : 'Failed to fetch historical tasks')
    } finally {
      setIsLoadingHistoricalTasks(false)
    }
  }, [selectedStoreId, selectedDate])

  useEffect(() => {
    fetchHistoricalTasks()
  }, [fetchHistoricalTasks])

  // Handle store selection
  const handleStoreSelect = (storeId: number) => {
    setSelectedStoreId(storeId)
  }

  // Get selected store details
  const selectedStore = selectedStoreId
    ? stores.find(s => s.store.storeId === selectedStoreId)
    : null

  // Render store dropdown with details
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
      return (
        <p className="text-muted-foreground text-sm">No active stores assigned to you.</p>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        {/* Dropdown + count */}
        <div className="flex items-center gap-3">
          <label htmlFor="store-select" className="text-sm font-medium text-foreground whitespace-nowrap">
            Store
          </label>
          <select
            id="store-select"
            value={selectedStoreId ?? ''}
            onChange={(e) => handleStoreSelect(Number(e.target.value))}
            className="p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[200px]"
          >
            {stores.map(({ store }) => (
              <option key={store.storeId} value={store.storeId}>
                {store.storeName} ({store.storeCode})
              </option>
            ))}
          </select>
          {/* <span className="text-xs text-muted-foreground whitespace-nowrap">
            {stores.length} store{stores.length !== 1 ? 's' : ''}
          </span> */}
        </div>

        {/* Selected store details */}
        {selectedStore && (
          <div className="text-xs text-muted-foreground py-1.5 rounded-md">
            <p>{selectedStore.store.addressLine1}{selectedStore.store.addressLine2 ? `, ${selectedStore.store.addressLine2}` : ''}</p>
            <p>{selectedStore.store.city}, {selectedStore.store.state} {selectedStore.store.pinCode}</p>
          </div>
        )}
      </div>
    )
  }

  // Render task card
  const renderTaskCard = (task: TaskExecution) => {
    const status = task.executionStatus as TaskExecutionStatus
    const statusColorClass = TASK_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
    const statusLabel = TASK_STATUS_LABELS[status] || task.executionStatus

    return (
      <button
        key={task.taskExecutionId}
        onClick={() => navigate(`/my-tasks/${task.taskExecutionId}`)}
        className="w-full text-left border border-border rounded-lg p-4 bg-background hover:shadow-md transition-shadow hover:border-primary/30 group"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {task.mstTask?.title || `Task #${task.mstTaskId}`}
            </h3>
            {task.mstTask?.regionalText && (
              <p className="text-sm text-muted-foreground mt-0.5">{task.mstTask.regionalText}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColorClass}`}>
              {statusLabel}
            </span>
            <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

       {/*  {task.mstTask?.startTime && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>🕐</span>
            <span>
              {task.mstTask.startTime}
              {task.mstTask.endTime ? ` - ${task.mstTask.endTime}` : ''}
            </span>
          </div>
        )} */}

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>🕐</span>
          <span>{formatDate(task.executionDate)}</span>
          <span>{formatTime(task.fromTime)} - {formatTime(task.toTime)}</span>
        </div>

        {task.mstTask?.description && (
          <p className="text-sm text-muted-foreground mb-2">{task.mstTask.description}</p>
        )}

        {task.notes && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
            <span className="shrink-0">📝</span>
            <p>{task.notes}</p>
          </div>
        )}

        {task.store && (
          <p className="text-xs text-muted-foreground">
            Store: {task.store.storeName} ({task.store.storeCode})
          </p>
        )}

        {task.pickedByUser && (
          <p className="text-xs text-muted-foreground">
            Picked by: {task.pickedByUser.firstName} {task.pickedByUser.lastName}
          </p>
        )}

        {task.completedByUser && (
          <p className="text-xs text-muted-foreground">
            Completed by: {task.completedByUser.firstName} {task.completedByUser.lastName}
          </p>
        )}
      </button>
    )
  }

  // Render task list
  const renderTaskList = (
    tasks: TaskExecution[],
    isLoading: boolean,
    error: string | null,
    emptyMessage: string,
  ) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )
    }

    if (tasks.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {tasks.map(renderTaskCard)}
      </div>
    )
  }

  // Render tabs
  const renderTabs = () => {
    if (!selectedStoreId) return null

    return (
      <div className="bg-card border border-border rounded-lg shadow-sm">
        {/* Tab bar */}
        <div className="border-b border-border">
          <div className="flex">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'today'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <span className="flex items-center gap-2">
                <span>📋</span>
                Today's Tasks
              </span>
              {activeTab === 'today' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('historical')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'historical'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <span className="flex items-center gap-2">
                <span>📜</span>
                Task History
              </span>
              {activeTab === 'historical' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'today' ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Today's Tasks</h3>
                {todaysTasks.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {todaysTasks.length} task{todaysTasks.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {renderTaskList(
                todaysTasks,
                isLoadingTodaysTasks,
                todaysTasksError,
                'No tasks scheduled for today at this store.',
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Task History</h3>
                {historicalTasks.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {historicalTasks.length} task{historicalTasks.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Date picker */}
              <div className="mb-6 flex justify-end">
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="history-date"
                    className="text-sm font-medium text-foreground whitespace-nowrap"
                  >
                    Select Date
                  </label>
                  <input
                    id="history-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="p-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {selectedDate ? (
                renderTaskList(
                  historicalTasks,
                  isLoadingHistoricalTasks,
                  historicalTasksError,
                  'No tasks found for the selected date.',
                )
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📅</div>
                  <p className="text-muted-foreground">Select a date to view historical tasks.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Tasks</h1>
        <p className="text-muted-foreground mt-2">View and manage your assigned tasks</p>
      </div>
      {renderStoreSelector()}
      {renderTabs()}
    </div>
  )
}

export default MyTasks