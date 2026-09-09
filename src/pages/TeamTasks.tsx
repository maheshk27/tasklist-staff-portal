import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  SquareKanban,
  Table2,
  StoreIcon,
  MapPin,
  X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { onboardingService, taskService } from '../services/apiManager'
import PageHeader from '../components/PageHeader'
import FilterSection from '../components/FilterSection'
import FormSelect from '../components/ui/FormSelect'
import FormField from '../components/ui/FormField'
import TaskCard from '../components/TaskCard'
import type { StoreWithMapping } from '../types/user-store'
import type { TaskExecution, TaskExecutionStatus } from '../types/task-execution'
import {
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  ALL_TASK_STATUSES,
} from '../types/task-execution'
import type { StoreUserItem } from '../services/apiManager'
import { formatDate, formatTime } from '../utils/date'

type ViewMode = 'grid' | 'kanban' | 'table'

// ── Kanban column configuration ────────────────────────────────────────────────
interface KanbanColumn {
  key: TaskExecutionStatus
  label: string
  colorClass: string
  headerTextClass: string
  countChipClass: string
  columnStyle: string
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    key: 'NOT_STARTED',
    label: 'Not Started',
    colorClass: 'bg-gray-100 text-gray-800',
    headerTextClass: 'text-gray-800',
    countChipClass: 'bg-gray-100 text-gray-700',
    columnStyle: 'border-gray-200 bg-gray-50/50',
  },
  {
    key: 'IN_PROGRESS',
    label: 'In Progress',
    colorClass: 'bg-blue-100 text-blue-800',
    headerTextClass: 'text-blue-800',
    countChipClass: 'bg-blue-100 text-blue-700',
    columnStyle: 'border-blue-200 bg-blue-50/50',
  },
  {
    key: 'COMPLETED',
    label: 'Completed',
    colorClass: 'bg-green-100 text-green-800',
    headerTextClass: 'text-green-800',
    countChipClass: 'bg-green-100 text-green-700',
    columnStyle: 'border-green-200 bg-green-50/50',
  },
  {
    key: 'SKIPPED',
    label: 'Skipped',
    colorClass: 'bg-orange-100 text-orange-800',
    headerTextClass: 'text-orange-800',
    countChipClass: 'bg-orange-100 text-orange-700',
    columnStyle: 'border-orange-200 bg-orange-50/50',
  },
  {
    key: 'OVERDUE',
    label: 'Overdue',
    colorClass: 'bg-red-100 text-red-800',
    headerTextClass: 'text-red-800',
    countChipClass: 'bg-red-100 text-red-700',
    columnStyle: 'border-red-200 bg-red-50/50',
  },
]

// ── Theme-aware status accent dots (summary cards) ─────────────────────────────
const STATUS_SUMMARY_DOTS: Record<TaskExecutionStatus, string> = {
  NOT_STARTED: 'bg-gray-500',
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  SKIPPED: 'bg-orange-500',
  OVERDUE: 'bg-red-500',
}

const TeamTasks: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // ── Stores ────────────────────────────────────────────────────────────────────
  const [stores, setStores] = useState<StoreWithMapping[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [isLoadingStores, setIsLoadingStores] = useState(true)
  const [storesError, setStoresError] = useState<string | null>(null)

  // ── Store users ───────────────────────────────────────────────────────────────
  const [storeUsers, setStoreUsers] = useState<StoreUserItem[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [isLoadingStoreUsers, setIsLoadingStoreUsers] = useState(false)
  const [storeUsersError, setStoreUsersError] = useState<string | null>(null)

  // ── Date (determines data source: today vs historical) ───────────────────────
  const [selectedDate, setSelectedDate] = useState<string>('')

  // ── View mode ─────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // ── Sort (default: FromTime ASC) ──────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<'fromTime' | 'taskName' | 'regionalText'>('fromTime')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // ── Status filter (from summary click) ───────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<TaskExecutionStatus | null>(null)

  // ── Tasks (unified from today/historical API based on date) ──────────────────
  const [tasks, setTasks] = useState<TaskExecution[]>([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [tasksError, setTasksError] = useState<string | null>(null)

  // ── Check user role - only AREA MANAGER / BRANCH MANAGER / GM can access ─────
  useEffect(() => {
    if (!user || (user.role?.roleName?.toUpperCase() !== 'AREA MANAGER (AM)'
      && user.role?.roleName?.toUpperCase() !== 'BRANCH MANAGER (BM)')
      && user.role?.roleName?.toUpperCase() !== 'GENERAL MANAGER OPERATIONS (GM)') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  // ── Fetch assigned stores on mount ───────────────────────────────────────────
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

  // ── Fetch store users when store changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedStoreId) return

    let cancelled = false

    const fetchStoreUsers = async () => {
      setIsLoadingStoreUsers(true)
      setStoreUsersError(null)
      setSelectedUserId(null)
      setStoreUsers([])

      try {
        const response = await onboardingService.getStoreUsers(selectedStoreId)
        if (!cancelled) {
          const activeUsers = response.users.filter(u => u.mapping.isActive && u.user.isActive)
          setStoreUsers(activeUsers)
        }
      } catch (err) {
        if (!cancelled) {
          setStoreUsersError(err instanceof Error ? err.message : 'Failed to load store users')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStoreUsers(false)
        }
      }
    }

    fetchStoreUsers()
    return () => { cancelled = true }
  }, [selectedStoreId])

  // ── Fetch tasks based on store + user + date ─────────────────────────────────
  // If date is selected → use historical API; otherwise → use today's API
  const fetchTasks = useCallback(async () => {
    if (!selectedStoreId) return

    setIsLoadingTasks(true)
    setTasksError(null)

    try {
      let response
      if (selectedDate) {
        // Historical: use date API
        response = await taskService.getHistoricalTasksByStore(
          selectedStoreId,
          selectedDate,
          selectedUserId ?? undefined,
        )
      } else {
        // Today: use today's task API
        response = await taskService.getTodaysTasksByStore(
          selectedStoreId,
          selectedUserId ?? undefined,
        )
      }

      setTasks(response.data || [])
    } catch (err) {
      setTasksError(
        err instanceof Error
          ? err.message
          : selectedDate
            ? 'Failed to fetch historical tasks'
            : "Failed to fetch today's tasks",
      )
    } finally {
      setIsLoadingTasks(false)
    }
  }, [selectedStoreId, selectedDate, selectedUserId])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])
// ── Handlers ──────────────────────────────────────────────────────────────────
  const handleStoreSelect = (storeId: number) => {
    setSelectedStoreId(storeId)
    setStatusFilter(null) // Reset filter on store change
  }

  const handleUserSelect = (userId: number | null) => {
    setSelectedUserId(userId)
    setStatusFilter(null) // Reset filter on user change
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setStatusFilter(null) // Reset filter on date change
  }

  // ── Get selected store details ────────────────────────────────────────────────
  const selectedStore = selectedStoreId
    ? stores.find(s => s.store.storeId === selectedStoreId)
    : null

  // ── Tasks filtered by status (if filter active) ───────────────────────────────
  const filteredTasks = statusFilter
    ? tasks.filter((t) => t.executionStatus === statusFilter)
    : tasks

  // ── Tasks sorted by the selected sort key + direction ────────────────────────
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'fromTime') {
      cmp = (a.fromTime || '').localeCompare(b.fromTime || '')
    } else if (sortBy === 'taskName') {
      const aTitle = (a.mstTask?.title || `Task #${a.mstTaskId}`).toLowerCase()
      const bTitle = (b.mstTask?.title || `Task #${b.mstTaskId}`).toLowerCase()
      cmp = aTitle.localeCompare(bTitle)
    } else {
      const aRegional = (a.mstTask?.regionalText || '').toLowerCase()
      const bRegional = (b.mstTask?.regionalText || '').toLowerCase()
      cmp = aRegional.localeCompare(bRegional)
    }
    return sortDirection === 'asc' ? cmp : -cmp
  })

  // ── Status summary (counts per status) — common across all layouts ───────────
  const renderStatusSummary = () => {
    if (tasks.length === 0) return null

    const statusCounts = ALL_TASK_STATUSES.reduce<Record<TaskExecutionStatus, number>>(
      (acc, status) => {
        acc[status] = tasks.filter((t) => t.executionStatus === status).length
        return acc
      },
      {} as Record<TaskExecutionStatus, number>,
    )

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ALL_TASK_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? null : status)}
            className={`rounded-xl cursor-pointer border border-border bg-card p-3 text-center transition-colors ${
              statusFilter === status ? 'ring-2 ring-primary' : 'hover:opacity-80'
            }`}
          >
            <div className="text-2xl font-bold text-foreground">{statusCounts[status]}</div>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${STATUS_SUMMARY_DOTS[status]}`} />
              <span className="text-xs font-medium text-muted-foreground">
                {TASK_STATUS_LABELS[status]}
              </span>
            </div>
          </button>
        ))}
      </div>
    )
  }

  // ── View mode switcher (rendered in PageHeader actions) ───────────────────────
  const renderViewSwitcher = () => {
    if (!selectedStoreId) return null

    const viewOptions = [
      { key: 'grid' as const, label: 'Grid', icon: LayoutGrid },
      { key: 'kanban' as const, label: 'Kanban', icon: SquareKanban },
      { key: 'table' as const, label: 'Table', icon: Table2 },
    ]

    return (
      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        {viewOptions.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setViewMode(key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    )
  }
// ── Render filters (search area: Store + User + Date + Sort) ───────────────────
  const renderFilters = () => (
    <div className="bg-card rounded-xl border border-border">
      <FilterSection
        title="Search Filters"
        hasActiveFilters={!!selectedDate || !!selectedUserId}
        actions={
          selectedDate ? (
            <button
              onClick={() => handleDateChange('')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <X className="h-3.5 w-3.5" />
              Clear Date
            </button>
          ) : null
        }
      />
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
              <FormSelect
                label="Store"
                name="selectedStoreId"
                value={selectedStoreId ?? ''}
                onChange={(e) => handleStoreSelect(Number(e.target.value))}
                options={stores.map(({ store }) => ({
                  value: store.storeId,
                  label: `${store.storeName} (${store.storeCode})`,
                }))}
                placeholder="Select Store"
                required
              />

              {selectedStoreId && (
                isLoadingStoreUsers ? (
                  <div className="flex items-center justify-center py-5">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                ) : storeUsersError ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-destructive text-sm">{storeUsersError}</p>
                  </div>
                ) : (
                  <FormSelect
                    label="User"
                    name="selectedUserId"
                    value={selectedUserId ?? ''}
                    onChange={(e) => handleUserSelect(e.target.value ? Number(e.target.value) : null)}
                    options={storeUsers.map(({ user }) => ({
                      value: user.userId,
                      label: `${user.firstName} ${user.lastName} (${user.role?.roleName})`,
                    }))}
                    placeholder="All Users"
                  />
                )
              )}

              <FormField
                label="Date"
                name="selectedDate"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
              />

              <FormSelect
                label="Sort By"
                name="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'fromTime' | 'taskName' | 'regionalText')}
                options={[
                  { value: 'fromTime', label: 'From Time' },
                  { value: 'taskName', label: 'Task Name' },
                  { value: 'regionalText', label: 'Regional Text' },
                ]}
              />

              <FormSelect
                label="Order"
                name="sortDirection"
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                options={[
                  { value: 'asc', label: 'Ascending (A → Z)' },
                  { value: 'desc', label: 'Descending (Z → A)' },
                ]}
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
  )
// ── Render Grid layout ────────────────────────────────────────────────────────
  const renderGridLayout = () => {
    if (isLoadingTasks) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (tasksError) {
      return (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{tasksError}</p>
        </div>
      )
    }

    if (filteredTasks.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-muted-foreground">
            {selectedDate
              ? 'No tasks found for the selected date.'
              : 'No tasks scheduled for today at this store.'}
          </p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-4">
        {sortedTasks.map((task) => (
          <TaskCard
            key={task.taskExecutionId}
            task={task}
            showAssignment
            onClick={(t) => navigate(`/team-tasks/${t.taskExecutionId}`)}
          />
        ))}
      </div>
    )
  }

  // ── Render Kanban layout ──────────────────────────────────────────────────────
  const renderKanbanLayout = () => {
    if (isLoadingTasks) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (tasksError) {
      return (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{tasksError}</p>
        </div>
      )
    }

    if (tasks.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-muted-foreground">
            {selectedDate
              ? 'No tasks found for the selected date.'
              : 'No tasks scheduled for today at this store.'}
          </p>
        </div>
      )
    }

    // Group tasks by status
    const tasksByStatus = KANBAN_COLUMNS.reduce<Record<TaskExecutionStatus, TaskExecution[]>>(
      (acc, column) => {
        acc[column.key] = statusFilter
          ? sortedTasks.filter((t) => t.executionStatus === statusFilter)
          : sortedTasks.filter((t) => t.executionStatus === column.key)
        return acc
      },
      {} as Record<TaskExecutionStatus, TaskExecution[]>,
    )

    return (
      <div className="overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-4" style={{ minWidth: 'max-content', width: '100%' }}>
          {KANBAN_COLUMNS.map((column) => {
            const columnTasks = tasksByStatus[column.key]

            return (
              <div
                key={column.key}
                className={`flex-shrink-0 w-80 rounded-xl border ${column.columnStyle}`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/60 rounded-t-xl bg-white/80">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-semibold ${column.headerTextClass}`}>
                      {column.label}
                    </h4>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${column.countChipClass}`}>
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column body */}
                <div className="p-3 space-y-3 min-h-[200px]">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.taskExecutionId}
                      task={task}
                      compact
                      showAssignment
                      onClick={(t) => navigate(`/team-tasks/${t.taskExecutionId}`)}
                    />
                  ))}

                  {columnTasks.length === 0 && !statusFilter && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No {column.label.toLowerCase()} tasks
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
// ── Render DataTable layout ───────────────────────────────────────────────────
  const renderDataTableLayout = () => {
    if (isLoadingTasks) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (tasksError) {
      return (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{tasksError}</p>
        </div>
      )
    }

    if (filteredTasks.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-muted-foreground">
            {selectedDate
              ? 'No tasks found for the selected date.'
              : 'No tasks scheduled for today at this store.'}
          </p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-semibold text-foreground">Task</th>
              <th className="text-left p-3 font-semibold text-foreground whitespace-nowrap">Date</th>
              <th className="text-left p-3 font-semibold text-foreground whitespace-nowrap">Time</th>
              <th className="text-left p-3 font-semibold text-foreground whitespace-nowrap">Store</th>
              <th className="text-left p-3 font-semibold text-foreground">Status</th>
              <th className="text-left p-3 font-semibold text-foreground whitespace-nowrap">Assigned To</th>
              <th className="text-left p-3 font-semibold text-foreground whitespace-nowrap">Picked By</th>
              <th className="text-left p-3 font-semibold text-foreground whitespace-nowrap">Completed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedTasks.map((task) => {
              const status = task.executionStatus as TaskExecutionStatus
              const statusColorClass = TASK_STATUS_COLORS[status]
              const statusLabel = TASK_STATUS_LABELS[status]

              return (
                <tr
                  key={task.taskExecutionId}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/team-tasks/${task.taskExecutionId}`)}
                >
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                        {task.mstTask?.title || `Task #${task.mstTaskId}`}
                      </span>
                      {task.mstTask?.regionalText && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                          {task.mstTask.regionalText}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {formatDate(task.executionDate)}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {formatTime(task.fromTime)} - {formatTime(task.toTime)}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {task.store
                      ? `${task.store.storeName} (${task.store.storeCode})`
                      : '—'}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColorClass}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {task.user
                      ? `${task.user.firstName} ${task.user.lastName}`
                      : '—'}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {task.pickedByUser
                      ? `${task.pickedByUser.firstName} ${task.pickedByUser.lastName}`
                      : '—'}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {task.completedByUser
                      ? `${task.completedByUser.firstName} ${task.completedByUser.lastName}`
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }
// ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header (with view-switcher actions) */}
      <PageHeader
        title="Team Tasks"
        subtitle="View tasks across your team"
        actions={renderViewSwitcher()}
      />

      {/* Filters: Store + User + Date + Sort */}
      {renderFilters()}

      {/* Status summary — common across all layouts */}
      {selectedStoreId && !isLoadingTasks && tasks.length > 0 && (
        <div className='space-y-3'>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Summary
            </h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
              </span>
              {statusFilter && (
                <button
                  onClick={() => setStatusFilter(null)}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  ← Show All
                </button>
              )}
            </div>
          </div>
          {renderStatusSummary()}
        </div>
      )}

      {/* Content area — only render when store is selected */}
      {selectedStoreId && (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          {/* Toolbar: title + count — responsive (wraps on mobile) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <h2 className="text-base font-semibold text-foreground">
              {selectedDate ? `Tasks for ${formatDate(selectedDate)}` : "Today's Tasks"}
              {tasks.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
                  {statusFilter ? ' · filtered' : ''})
                </span>
              )}
            </h2>
            {selectedStore && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <StoreIcon className="h-3.5 w-3.5 text-primary" />
                {`Store: ${selectedStore.store.storeName}`}
              </span>
            )}
          </div>

          {/* Layout content */}
          <div className="min-w-0 p-4">
            {viewMode === 'grid' && renderGridLayout()}
            {viewMode === 'kanban' && renderKanbanLayout()}
            {viewMode === 'table' && renderDataTableLayout()}
          </div>
        </div>
      )}

      {/* Empty state when no store selected */}
      {!selectedStoreId && !isLoadingStores && stores.length > 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🏪</div>
          <p className="text-muted-foreground">Select a store to view your tasks.</p>
        </div>
      )}
    </div>
  )
}


export default TeamTasks
