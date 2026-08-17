import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { taskService } from '../services/apiManager'
import { decodeToken, getStoredTokens } from '../utils/auth'
import type { TaskExecution, TaskExecutionStatus } from '../types/task-execution'
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../types/task-execution'
import type { TaskChecklistExecution, ChecklistStatus } from '../types/task-checklist-execution'
import { CHECKLIST_STATUS_COLORS, CHECKLIST_STATUS_LABELS, ALL_CHECKLIST_STATUSES } from '../types/task-checklist-execution'
import { ActionButton } from '../components/ui/ActionButton'
import { formatDate, formatDateTime, formatTime, isTimeToStart } from '../utils/date'

// Helper to get the badge color for a checklist priority
const getPriorityColor = (priority?: string): string => {
  switch (priority) {
    case 'CRITICAL': return 'bg-red-100 text-red-700'
    case 'HIGH': return 'bg-orange-100 text-orange-700'
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-700'
    case 'LOW': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

interface TaskExecutionDetailProps {
  readOnly?: boolean
}

type EffectiveStatus = 'not_started' | 'in_progress' | 'completed'

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

  // Compute effective status
  const effectiveStatus: EffectiveStatus = !taskExecution
    ? 'not_started'
    : taskExecution.executionStatus === 'COMPLETED'
      ? 'completed'
      : taskExecution.startedAt
        ? 'in_progress'
        : 'not_started'

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
        <button onClick={goBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          ← Back to {readOnly ? 'Team Tasks' : 'My Tasks'}
        </button>
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

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={goBack}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        ← Back to {readOnly ? 'Team Tasks' : 'My Tasks'}
      </button>

      {/* Task Info Card */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">
              {taskExecution.mstTask?.title || `Task #${taskExecution.mstTaskId}`}
            </h1>
            {taskExecution.mstTask?.regionalText && (
              <p className="text-sm text-muted-foreground mt-1">{taskExecution.mstTask.regionalText}</p>
            )}
          </div>
          <span className={`shrink-0 px-3 py-1 text-sm font-medium rounded-full ${statusColorClass}`}>
            {statusLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
          {taskExecution.store && (
            <div>
              <span className="font-medium text-foreground">Store:</span>{' '}
              {taskExecution.store.storeName} ({taskExecution.store.storeCode})
            </div>
          )}
          <div>
            <span className="font-medium text-foreground">Execution Date:</span>{' '}
            {taskExecution.executionDate ? formatDate(taskExecution.executionDate) : '-'}
          </div>
          {taskExecution.fromTime && (
            <div>
              <span className="font-medium text-foreground">Time:</span>{' '}
              {taskExecution.fromTime ? formatTime(taskExecution.fromTime) : '--:--'}
              {taskExecution.toTime ? ` - ${formatTime(taskExecution.toTime)}` : ''}
            </div>
          )}
        </div>

        {taskExecution.mstTask?.description && (
          <p className="text-sm text-muted-foreground mt-3">{taskExecution.mstTask.description}</p>
        )}
      </div>

      {/* ==== Activity Card (Action + Timeline + Completed By) ==== */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Activity</h2>
        </div>
        <div className="p-6">
          {/* Action section — hide when there are checklist items or readOnly */}
          {!readOnly && (!checklistExecutions || checklistExecutions.length === 0) && (
            <div className="mb-6 pb-6 border-b border-border">
              {effectiveStatus === 'not_started' && (
                <div className="text-center">
                  <div className="text-3xl mb-3">⏳</div>
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
                        ⏰ Task starts at {formatTime(taskExecution.fromTime)}
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Please wait until the scheduled start time to begin.
                      </p>
                      <ActionButton
                        action="signin"
                        layout="grid"
                        title={`Starts at ${formatTime(taskExecution.fromTime)}`}
                        onClick={handleStartTask}
                        disabled={true}
                      />
                    </>
                  )}
                </div>
              )}

              {effectiveStatus === 'in_progress' && (
                <div className="text-center">
                  <div className="text-3xl mb-3">🔄</div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Task is in progress.
                  </p>
                  {taskExecution.startedAt && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Started at: {
                        formatDateTime(taskExecution.startedAt)}
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

              {effectiveStatus === 'completed' && (
                <div className="text-center">
                  <div className="text-3xl mb-3">🎉</div>
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

          {/* Timeline section */}
          <div className="mb-6 pb-6 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground mb-4">Timeline</h3>
            <div className="relative">
              <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-border" />
              <div className="space-y-6 relative">
                <div className="flex items-start gap-4">
                  <div className="w-[17px] shrink-0 flex justify-center relative z-10">
                    <div className={`w-3 h-3 rounded-full ring-2 ${effectiveStatus === 'not_started' ? 'bg-gray-300 ring-gray-100' : 'bg-blue-500 ring-blue-100'
                      }`} />
                  </div>
                  <div className="flex-1 pt-0">
                    <p className="text-sm font-medium text-foreground">Started</p>
                    {taskExecution.startedAt ? (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {formatDateTime(taskExecution.startedAt)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic mt-0.5">Not started yet</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-[17px] shrink-0 flex justify-center relative z-10">
                    <div className={`w-3 h-3 rounded-full ring-2 ${effectiveStatus === 'completed' ? 'bg-green-500 ring-green-100' : 'bg-gray-300 ring-gray-100'
                      }`} />
                  </div>
                  <div className="flex-1 pt-0">
                    <p className="text-sm font-medium text-foreground">Completed</p>
                    {taskExecution.completedAt ? (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {formatDateTime(taskExecution.completedAt)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic mt-0.5">Not completed yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Completed By section */}
          {taskExecution.completedByUser && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Completed By</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
                  {taskExecution.completedByUser.firstName?.[0] || 'U'}
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
        </div>
      </div>

      {/* Checklists */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">
            Checklists
            {checklistExecutions.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({checklistExecutions.length})
              </span>
            )}
          </h2>
        </div>

        {/* Status-wise summary count */}
        {!isLoadingChecklists && checklistExecutions.length > 0 && (
          <div className="px-6 py-3 border-b border-border flex flex-wrap gap-2">
            {ALL_CHECKLIST_STATUSES.map((s) => {
              const count = checklistExecutions.filter((cl) => cl.checklistStatus === s).length
              if (count === 0) return null
              return (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${CHECKLIST_STATUS_COLORS[s]}`}
                >
                  {CHECKLIST_STATUS_LABELS[s]}
                  <span className="font-bold">{count}</span>
                </span>
              )
            })}
          </div>
        )}

        <div className="p-6">
          {isLoadingChecklists ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : checklistsError ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-destructive text-sm">{checklistsError}</p>
            </div>
          ) : checklistExecutions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-muted-foreground">No checklists for this task.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...checklistExecutions]
                .sort((a, b) => (a.taskChecklist?.sequence ?? 999) - (b.taskChecklist?.sequence ?? 999))
                .map((cl) => {
                  const checklistStatus = cl.checklistStatus as ChecklistStatus
                  const statusColorClass = CHECKLIST_STATUS_COLORS[checklistStatus] || 'bg-gray-100 text-gray-800'
                  const statusLabel = CHECKLIST_STATUS_LABELS[checklistStatus] || cl.checklistStatus

                  return (
                    <div
                      key={cl.taskChecklistExecutionId}
                      onClick={() => navigate(readOnly
                        ? `/team-tasks/${taskExecutionId}/checklist/${cl.taskChecklistExecutionId}`
                        : `/my-tasks/${taskExecutionId}/checklist/${cl.taskChecklistExecutionId}`
                      )}
                      className="w-full text-left border border-border rounded-lg p-4 bg-background hover:shadow-md transition-shadow hover:border-primary/30 group"
                    >
                      <h3 className="font-medium text-foreground mb-2">
                        {cl.taskChecklist?.sequence != null && (
                          <span className="text-muted-foreground mr-1.5">{cl.taskChecklist.sequence}.</span>
                        )}
                        {cl.taskChecklist?.title || `Checklist #${cl.mstChecklistId}`}

                      </h3>


                      {/* Regional text */}
                      {cl.taskChecklist?.regionalText && (
                        <p className="text-sm text-muted-foreground mb-2">{cl.taskChecklist.regionalText}</p>
                      )}

                      {cl.fromTime && cl.toTime && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <span>🕐</span>
                          <span>
                            {formatDate(cl.fromTime)}, {formatTime(cl.fromTime)} - {formatTime(cl.toTime)}
                          </span>
                        </div>
                      )}

                      {/* Completed info */}
                      {cl.completedByUser && (
                        <p className="text-xs text-muted-foreground mb-2">
                          Completed by: {cl.completedByUser.firstName} {cl.completedByUser.lastName}
                        </p>
                      )}

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {cl.taskChecklist?.priority && (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${getPriorityColor(cl.taskChecklist.priority)}`}>
                              🚩 {cl.taskChecklist.priority}
                            </span>
                          )}
                          {cl.taskChecklist?.isMandatory && (
                            <span className="ml-2 text-xs text-red-500 font-medium">(Mandatory)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full ${statusColorClass}`}>
                            {statusLabel}
                          </span>
                          <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>

      {/* ==== Created / Updated info ==== */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
        <span>Created: {formatDateTime(taskExecution.createdAt)}</span>
        <span>Updated: {formatDateTime(taskExecution.updatedAt)}</span>
      </div>

      {/* ==== Complete Confirmation Modal — hidden when readOnly ==== */}
      {!readOnly && showCompleteConfirm && (
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