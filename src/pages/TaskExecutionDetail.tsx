import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LayoutGrid, SquareKanban, Table2, StoreIcon, MapPin, Clock, Hourglass, PlayCircle, CircleCheckBig, PartyPopper, BadgeCheck, CalendarDays, UserRound, ChevronLeft, ArrowDownUp } from 'lucide-react'
import { taskService } from '../services/apiManager'
import { decodeToken, getStoredTokens } from '../utils/auth'
import type { TaskExecution, TaskExecutionStatus } from '../types/task-execution'
import { KANBAN_COLUMNS, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../types/task-execution'
import type { TaskChecklistExecution, ChecklistStatus } from '../types/task-checklist-execution'
import {
  CHECKLIST_STATUS_COLORS,
  CHECKLIST_STATUS_LABELS,
  ALL_CHECKLIST_STATUSES,
} from '../types/task-checklist-execution'
import { ActionButton } from '../components/ui/ActionButton'
import PageHeader from '../components/PageHeader'
import ChecklistCard from '../components/ChecklistCard'
import StatusSummaryCard, { CHECKLIST_STATUS_ICONS } from '../components/StatusSummaryCard'
import { getPriorityColor } from '../utils/priority'
import { formatDate, formatDateTime, formatTime, isTimeToStart } from '../utils/date'
import { getTaskDelayNote } from '../utils/execution-delay'
import { DelayNote } from '../components/BaseCard'

type ViewMode = 'grid' | 'kanban' | 'table'

interface TaskExecutionDetailProps {
  readOnly?: boolean
}
const TaskExecutionDetail: React.FC<TaskExecutionDetailProps> = ({ readOnly = false }) => {
  const { taskExecutionId } = useParams<{ taskExecutionId: string }>()
  const navigate = useNavigate()

  // Task execution state
  const [taskExecution, setTaskExecution] = useState<TaskExecution | null>(null)
  const [isLoadingTask, setIsLoadingTask] = useState(true)
  const [taskError, setTaskError] = useState<string | null>(null)

  // Checklist executions state
  const [checklistExecutions, setChecklistExecutions] = useState<TaskChecklistExecution[]>([])
  const [isLoadingChecklists, setIsLoadingChecklists] = useState(true)
  const [checklistsError, setChecklistsError] = useState<string | null>(null)

  // Action state
  const [isStarting, setIsStarting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // Complete confirmation modal
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)

  // Checklist status filter (from summary click)
  const [checklistStatusFilter, setChecklistStatusFilter] = useState<ChecklistStatus | null>(null)

  // Checklist view mode
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Checklist sort (default: FromTime ASC — single dropdown combines key + direction)
  const [checklistSort, setChecklistSort] = useState<string>('fromTime-asc')

  // Date check - only allow actions on today's date
  const today = new Date().toLocaleDateString('en-CA')
  const isTodayTask = taskExecution?.executionDate === today
  const isActionAllowed = !readOnly && isTodayTask

  // Fetch task execution
  useEffect(() => {
    if (!taskExecutionId) return

    let cancelled = false

    const fetchTask = async () => {
      setIsLoadingTask(true)
      setTaskError(null)

      try {
        const response = await taskService.getTaskExecution(Number(taskExecutionId))
        if (!cancelled && response.data) {
          setTaskExecution(response.data)
        }
      } catch (err) {
        if (!cancelled) {
          setTaskError(err instanceof Error ? err.message : 'Failed to fetch task details')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTask(false)
        }
      }
    }

    fetchTask()
    return () => { cancelled = true }
  }, [taskExecutionId])

  // Fetch checklist executions
  useEffect(() => {
    if (!taskExecutionId) return

    let cancelled = false

    const fetchChecklists = async () => {
      setIsLoadingChecklists(true)
      setChecklistsError(null)

      try {
        const response = await taskService.getTaskChecklistExecutions(Number(taskExecutionId))
        if (!cancelled && response.data) {
          setChecklistExecutions(response.data)
        }
      } catch (err) {
        if (!cancelled) {
          setChecklistsError(err instanceof Error ? err.message : 'Failed to fetch checklists')
        }
      } finally {
        if (!cancelled) {
          setIsLoadingChecklists(false)
        }
      }
    }

    fetchChecklists()
    return () => { cancelled = true }
  }, [taskExecutionId])

  // Get current userId from token
  const getCurrentUserId = (): number | null => {
    const { accessToken } = getStoredTokens()
    if (!accessToken) return null
    const decoded = decodeToken(accessToken)
    return decoded?.userId ?? null
  }

  // Start task
  const handleStartTask = async () => {
    if (!taskExecution || isStarting) return
    setIsStarting(true)
    try {
      await taskService.updateTaskExecution(taskExecution.taskExecutionId, {
        executionStatus: 'IN_PROGRESS',
      })
      const refreshed = await taskService.getTaskExecution(taskExecution.taskExecutionId)
      if (refreshed.data) {
        setTaskExecution(refreshed.data)
      }
      toast.success('Task started')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start task')
    } finally {
      setIsStarting(false)
    }
  }

  // Complete task
  const handleCompleteTask = async () => {
    if (!taskExecution || isCompleting) return
    const userId = getCurrentUserId()

    setIsCompleting(true)
    try {
      const updateData: Record<string, unknown> = {
        executionStatus: 'COMPLETED',
      }
      if (userId) {
        updateData.completedBy = userId
      }
      await taskService.updateTaskExecution(taskExecution.taskExecutionId, updateData)
      const refreshed = await taskService.getTaskExecution(taskExecution.taskExecutionId)
      if (refreshed.data) {
        setTaskExecution(refreshed.data)
      }
      toast.success('Task completed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete task')
    } finally {
      setIsCompleting(false)
    }
  }

  // Navigate back based on readOnly mode
  const goBack = () => {
    navigate(readOnly ? '/team-tasks' : '/my-tasks')
  }
  // Loading state
  if (isLoadingTask) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (taskError || !taskExecution) {
    return (
      <div className="space-y-6">
        <button onClick={goBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          ← Back to {readOnly ? 'Team Tasks' : 'My Tasks'}
        </button>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{taskError || 'Task execution not found'}</p>
        </div>
      </div>
    )
  }

  const status = taskExecution.executionStatus as TaskExecutionStatus
  const statusColorClass = TASK_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  const statusLabel = TASK_STATUS_LABELS[status] || taskExecution.executionStatus
  const taskDelayNote = getTaskDelayNote(taskExecution)
  const hasAssignee = Boolean(taskExecution.user || taskExecution.store)

  // Checklists filtered by status (if filter active)
  const filteredChecklists = checklistStatusFilter
    ? checklistExecutions.filter((cl) => cl.checklistStatus === checklistStatusFilter)
    : checklistExecutions

  // Checklists sorted by the selected sort combination (default: fromTime ASC)
  const sortedChecklists = [...filteredChecklists].sort((a, b) => {
    let cmp = 0
    if (checklistSort.startsWith('fromTime')) {
      cmp = (a.fromTime || '').localeCompare(b.fromTime || '')
    } else if (checklistSort.startsWith('sequence')) {
      cmp = (a.taskChecklist?.sequence ?? 999) - (b.taskChecklist?.sequence ?? 999)
    } else if (checklistSort.startsWith('name')) {
      const aName = (a.taskChecklist?.title || `Checklist #${a.mstChecklistId}`).toLowerCase()
      const bName = (b.taskChecklist?.title || `Checklist #${b.mstChecklistId}`).toLowerCase()
      cmp = aName.localeCompare(bName)
    } else {
      const aRegional = (a.taskChecklist?.regionalText || '').toLowerCase()
      const bRegional = (b.taskChecklist?.regionalText || '').toLowerCase()
      cmp = aRegional.localeCompare(bRegional)
    }
    return checklistSort.endsWith('desc') ? -cmp : cmp
  })

  const SORT_OPTIONS = [
    { value: 'fromTime-asc', label: 'From Time (Ascending)' },
    { value: 'fromTime-desc', label: 'From Time (Descending)' },
    // { value: 'sequence-asc', label: 'Sequence (Ascending)' },
    // { value: 'sequence-desc', label: 'Sequence (Descending)' },
    { value: 'name-asc', label: 'Checklist Name (A → Z)' },
    { value: 'name-desc', label: 'Checklist Name (Z → A)' },
    { value: 'regional-asc', label: 'Regional Text (A → Z)' },
    { value: 'regional-desc', label: 'Regional Text (Z → A)' },
  ]

  // Checklist detail navigation
  const goToChecklist = (cl: TaskChecklistExecution) => {
    navigate(readOnly
      ? `/team-tasks/${taskExecutionId}/checklist/${cl.taskChecklistExecutionId}`
      : `/my-tasks/${taskExecutionId}/checklist/${cl.taskChecklistExecutionId}`)
  }

  // ── Checklist view mode switcher (rendered in PageHeader actions) ─────────────
  const renderViewSwitcher = () => {
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
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${viewMode === key
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

  // ── Checklist status summary (counts per status) — common across all layouts ──
  const renderChecklistStatusSummary = () => {
    if (checklistExecutions.length === 0) return null

    const statusCounts = ALL_CHECKLIST_STATUSES.reduce<Record<ChecklistStatus, number>>(
      (acc, s) => {
        acc[s] = checklistExecutions.filter((cl) => cl.checklistStatus === s).length
        return acc
      },
      {} as Record<ChecklistStatus, number>,
    )

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {ALL_CHECKLIST_STATUSES.map((s) => {
          const { icon: Icon, dot } = CHECKLIST_STATUS_ICONS[s]
          return (
            <StatusSummaryCard
              key={s}
              status={s}
              count={statusCounts[s]}
              label={CHECKLIST_STATUS_LABELS[s]}
              icon={Icon}
              dotColor={dot}
              isActive={checklistStatusFilter === s}
              onClick={() => setChecklistStatusFilter(checklistStatusFilter === s ? null : s)}
            />
          )
        })}
      </div>
    )
  }
  // ── Checklist Grid layout ─────────────────────────────────────────────────────
  const renderChecklistGridLayout = () => {
    if (isLoadingChecklists) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (checklistsError) {
      return (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{checklistsError}</p>
        </div>
      )
    }

    if (filteredChecklists.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-muted-foreground">
            {checklistExecutions.length === 0
              ? 'No checklists for this task.'
              : 'No checklists match the selected status.'}
          </p>
          {checklistStatusFilter && (
            <button
              onClick={() => setChecklistStatusFilter(null)}
              className="mt-3 text-sm text-primary hover:underline"
            >
              ← Show All
            </button>
          )}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
        {sortedChecklists.map((cl) => (
          <ChecklistCard
            key={cl.taskChecklistExecutionId}
            checklist={cl}
            onClick={goToChecklist}
          />
        ))}
      </div>
    )
  }

  // ── Checklist Kanban layout ───────────────────────────────────────────────────
  const renderChecklistKanbanLayout = () => {
    if (isLoadingChecklists) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (checklistsError) {
      return (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{checklistsError}</p>
        </div>
      )
    }

    if (checklistExecutions.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-muted-foreground">No checklists for this task.</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-4" style={{ minWidth: 'max-content', width: '100%' }}>
          {KANBAN_COLUMNS.map((column) => {
            const columnTasks = checklistStatusFilter
              ? sortedChecklists.filter((cl) => cl.checklistStatus === checklistStatusFilter)
              : sortedChecklists.filter((cl) => cl.checklistStatus === column.key)

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
                  {columnTasks.map((cl) => (
                    <ChecklistCard
                      key={cl.taskChecklistExecutionId}
                      checklist={cl}
                      compact
                      onClick={goToChecklist}
                    />
                  ))}

                  {columnTasks.length === 0 && !checklistStatusFilter && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No {column.label.toLowerCase()} checklists
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
  // ── Checklist DataTable layout ────────────────────────────────────────────────
  const renderChecklistTableLayout = () => {
    if (isLoadingChecklists) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (checklistsError) {
      return (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{checklistsError}</p>
        </div>
      )
    }

    if (filteredChecklists.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-muted-foreground">
            {checklistExecutions.length === 0
              ? 'No checklists for this task.'
              : 'No checklists match the selected status.'}
          </p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-semibold text-foreground">Checklist</th>
              <th className="text-left p-3 font-semibold text-foreground whitespace-nowrap">Date</th>
              <th className="text-left p-3 font-semibold text-foreground whitespace-nowrap">Time</th>
              <th className="text-left p-3 font-semibold text-foreground">Mandatory</th>
              <th className="text-left p-3 font-semibold text-foreground">Status</th>
              <th className="text-left p-3 font-semibold text-foreground whitespace-nowrap">Priority</th>
              <th className="text-left p-3 font-semibold text-foreground whitespace-nowrap">Completed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedChecklists.map((cl) => {
              const checklistStatus = cl.checklistStatus as ChecklistStatus
              const statusColorClass = CHECKLIST_STATUS_COLORS[checklistStatus]
              const statusLabel = CHECKLIST_STATUS_LABELS[checklistStatus]

              return (
                <tr
                  key={cl.taskChecklistExecutionId}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => goToChecklist(cl)}
                >
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                        {cl.taskChecklist?.title || `Checklist #${cl.mstChecklistId}`}
                      </span>
                      {cl.taskChecklist?.regionalText && (
                        <span className="text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                          {cl.taskChecklist.regionalText}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {cl.fromTime ? formatDate(cl.fromTime) : '—'}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {cl.fromTime ? `${formatTime(cl.fromTime)} - ${formatTime(cl.toTime)}` : '—'}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {cl.taskChecklist?.isMandatory ? 'Yes' : 'No'}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColorClass}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {cl.taskChecklist?.priority ? (
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(cl.taskChecklist.priority)}`}>
                        {cl.taskChecklist.priority}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {cl.completedByUser
                      ? `${cl.completedByUser.firstName} ${cl.completedByUser.lastName}`
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
  return (
    <div className="space-y-6">
      {/* Page header (with back + layout switcher only) */}
      <button
        onClick={goBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {readOnly ? 'Team Tasks' : 'My Tasks'}
      </button>
      <PageHeader
        title="Task Execution"
        subtitle="View task details and manage checklists"
        actions={
          <>
            {renderViewSwitcher()}
          </>
        }
      />

      {/* Task info card — title, regional text, store/date/time */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 space-y-2">
          {/* Title + status badge */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-medium text-foreground">
              {taskExecution.mstTask?.title || `Task #${taskExecution.mstTaskId}`}
            </h1>
          </div>

          {/* Regional text */}
          {taskExecution.mstTask?.regionalText && (
            <p className="text-md text-muted-foreground">{taskExecution.mstTask.regionalText}</p>
          )}

          {/* Meta strip — store, date, time */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
            {taskExecution.store && (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <StoreIcon className="h-3.5 w-3.5 text-primary" />
                {taskExecution.store.storeName} ({taskExecution.store.storeCode})
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {taskExecution.store
                ? [taskExecution.store.city, taskExecution.store.state].filter(Boolean).join(', ')
                : '—'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {taskExecution.executionDate ? formatDate(taskExecution.executionDate) : '-'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {taskExecution.fromTime ? `${formatTime(taskExecution.fromTime)}` : '--:--'}
              {taskExecution.toTime ? ` - ${formatTime(taskExecution.toTime)}` : ''}
            </span>
          </div>

          {/* Description */}
          {taskExecution.mstTask?.description && (
            <p className="text-sm text-muted-foreground">{taskExecution.mstTask.description}</p>
          )}

          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium ${statusColorClass}`}>
            {statusLabel}
          </div>
        </div>
      </div>
      {/* ==== Checklists section — Grid / Kanban / Table ==== */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {/* Toolbar: title + count */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <h2 className="text-base font-semibold text-foreground">
            Checklists
            {!isLoadingChecklists && checklistExecutions.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredChecklists.length} {filteredChecklists.length === 1 ? 'checklist' : 'checklists'}
                {checklistStatusFilter ? ' · filtered' : ''})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
            <select
              id="checklist-sort"
              value={checklistSort}
              onChange={(e) => setChecklistSort(e.target.value)}
              className="p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status summary — common across all layouts */}
        {!isLoadingChecklists && checklistExecutions.length > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Summary</h3>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {checklistExecutions.length} total
                </span>
                {checklistStatusFilter && (
                  <button
                    onClick={() => setChecklistStatusFilter(null)}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    ← Show All
                  </button>
                )}
              </div>
            </div>
            <div className="px-4 py-3">
              {renderChecklistStatusSummary()}
            </div>
          </>
        )}

        {/* Layout content */}
        <div className="min-w-0 p-4">
          {viewMode === 'grid' && renderChecklistGridLayout()}
          {viewMode === 'kanban' && renderChecklistKanbanLayout()}
          {viewMode === 'table' && renderChecklistTableLayout()}
        </div>
      </div>
      {/* ==== Activity Card (Action + Timeline + Completed By) ==== */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Activity</h2>
        </div>
        <div className="p-4">
          {/* Delay / completed-late warning */}
          {taskDelayNote && <div className="mb-4"><DelayNote text={taskDelayNote} /></div>}

          {/* Action + Timeline side by side (1 col mobile, 2 cols sm+) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Action section — hide when there are checklist items or readOnly */}
            {isActionAllowed && (!checklistExecutions || checklistExecutions.length === 0) && (
              <div className="h-full rounded-xl border border-border p-4">
                {taskExecution.executionStatus === 'NOT_STARTED' && (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Hourglass className="h-7 w-7" />
                    </div>
                    {isTimeToStart(taskExecution.fromTime) ? (
                      <>
                        <p className="text-sm text-muted-foreground mb-4">
                          This task is pending. Start it to begin working.
                        </p>
                        <ActionButton
                          action="signin"
                          layout="grid"
                          title="Start Task"
                          onClick={handleStartTask}
                          disabled={isStarting}
                        />
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-orange-500 font-medium mb-1">
                          Task starts at {formatTime(taskExecution.fromTime)}
                        </p>
                        <p className="text-xs text-muted-foreground mb-4">
                          Please wait until the scheduled start time to begin.
                        </p>
                        <ActionButton
                          action="signin"
                          layout="grid"
                          title={`Starts at ${formatTime(taskExecution.fromTime)}`}
                          disabled={true}
                        />
                      </>
                    )}
                  </div>
                )}

                {(taskExecution.executionStatus === 'IN_PROGRESS' ||
                  taskExecution.executionStatus === 'OVERDUE') && (
                    <div className="text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <PlayCircle className="h-7 w-7" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Task is in progress.
                      </p>
                      {taskExecution.startedAt && (
                        <p className="text-xs text-muted-foreground mb-4">
                          Started at: {formatDateTime(taskExecution.startedAt)}
                        </p>
                      )}
                      <ActionButton
                        action="activate"
                        layout="grid"
                        title="Complete Task"
                        onClick={() => setShowCompleteConfirm(true)}
                        disabled={isCompleting}
                      />
                    </div>
                  )}

                {taskExecution.executionStatus === 'COMPLETED' && (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <PartyPopper className="h-7 w-7" />
                    </div>
                    <p className="text-sm text-green-600 font-medium">Task completed</p>
                    {taskExecution.completedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Completed at: {formatDateTime(taskExecution.completedAt)}
                      </p>
                    )}
                    {taskExecution.completedByUser && (
                      <p className="text-xs text-muted-foreground">
                        by {taskExecution.completedByUser.firstName} {taskExecution.completedByUser.lastName}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Historical task notice */}
            {!readOnly && !isTodayTask && (
              <div className="h-full rounded-xl border border-border p-4">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                    <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    This is a historical task.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Actions can only be performed on today's tasks.
                  </p>
                </div>
              </div>
            )}
            {/* Timeline section — vertical stepper, responsive */}
            <div className="h-full rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Timeline</h3>

              {(() => {
                const startedAt = taskExecution.startedAt
                const completedAt = taskExecution.completedAt
                const isCompleted = taskExecution.executionStatus === 'COMPLETED'

                const steps = [
                  {
                    key: 'started',
                    label: 'Started',
                    value: startedAt ? formatDateTime(startedAt) : null,
                    icon: <PlayCircle className="h-4 w-4" />,
                    iconClass: 'bg-blue-100 text-blue-600 ring-2 ring-blue-100',
                  },
                  {
                    key: 'completed',
                    label: 'Completed',
                    value: completedAt ? formatDateTime(completedAt) : null,
                    icon: isCompleted
                      ? <CircleCheckBig className="h-4 w-4" />
                      : <BadgeCheck className="h-4 w-4" />,
                    iconClass: isCompleted
                      ? 'bg-green-100 text-green-600 ring-2 ring-green-100'
                      : 'bg-muted text-muted-foreground ring-2 ring-muted',
                  },
                ]

                return (
                  <div className="relative">
                    <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />
                    <div className="space-y-6 relative">
                      {steps.map((step) => (
                        <div key={step.key} className="flex items-start gap-4">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step.iconClass}`}
                          >
                            {step.icon}
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="text-sm font-medium text-foreground">{step.label}</p>
                            {step.value ? (
                              <p className="text-sm text-muted-foreground mt-0.5">{step.value}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic mt-0.5">Not {step.label.toLowerCase()} yet</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Assignee Details */}
          {(taskExecution.user || taskExecution.store) && (
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Assignee Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {taskExecution.user && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {taskExecution.user.firstName} {taskExecution.user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{taskExecution.user.userName}
                        {taskExecution.user.emailId ? ` · ${taskExecution.user.emailId}` : ''}
                      </p>
                    </div>
                  </div>
                )}

                {taskExecution.store && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <StoreIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {taskExecution.store.storeName} ({taskExecution.store.storeCode})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[taskExecution.store.city, taskExecution.store.state].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Completed By section */}
          {taskExecution.completedByUser && (
            <div className={hasAssignee ? 'mt-4 border-t border-border pt-4' : ''}>
              <h3 className="text-sm font-semibold text-foreground mb-3">Completed By</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {taskExecution.completedByUser.firstName} {taskExecution.completedByUser.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">@{taskExecution.completedByUser.userName}</p>
                </div>
              </div>
            </div>
          )}

          {/* Created / Updated info */}
          <div className="mt-5 border-t border-border pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Created: {formatDateTime(taskExecution.createdAt)}</span>
            <span>Updated: {formatDateTime(taskExecution.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* ==== Complete Confirmation Modal — hidden when readOnly or historical ==== */}
      {isActionAllowed && showCompleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowCompleteConfirm(false)}
        >
          <div
            className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Confirm Completion</h3>
                <p className="text-sm text-muted-foreground">Once marked as completed, this action cannot be undone. Are you sure?</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCompleteConfirm(false)
                  handleCompleteTask()
                }}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Yes, Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskExecutionDetail
