import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { taskService } from '../services/apiManager'
import type { TaskExecution, TaskExecutionStatus } from '../types/task-execution'
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../types/task-execution'
import type { TaskChecklistExecution, ChecklistStatus } from '../types/task-checklist-execution'
import { CHECKLIST_STATUS_COLORS, CHECKLIST_STATUS_LABELS } from '../types/task-checklist-execution'

const TaskExecutionDetail: React.FC = () => {
  const { taskExecutionId } = useParams<{ taskExecutionId: string }>()
  const navigate = useNavigate()

  // Task execution state
  const [taskExecution, setTaskExecution] = useState<TaskExecution | null>(null)
  const [isLoadingTask, setIsLoadingTask] = useState(true)
  const [taskError, setTaskError] = useState<string | null>(null)

  // Task notes
  const [taskNotes, setTaskNotes] = useState('')

  // Checklist executions state
  const [checklistExecutions, setChecklistExecutions] = useState<TaskChecklistExecution[]>([])
  const [isLoadingChecklists, setIsLoadingChecklists] = useState(true)
  const [checklistsError, setChecklistsError] = useState<string | null>(null)

  // Save state
  const [isSaving, setIsSaving] = useState(false)

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
          setTaskNotes(response.data.notes || '')
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

  // Save task notes
  const handleSaveNotes = async () => {
    if (!taskExecution) return

    setIsSaving(true)
    try {
      await taskService.updateTaskExecution(taskExecution.taskExecutionId, {
        notes: taskNotes,
      })

      const refreshed = await taskService.getTaskExecution(taskExecution.taskExecutionId)
      if (refreshed.data) {
        setTaskExecution(refreshed.data)
        setTaskNotes(refreshed.data.notes || '')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save notes'
      // Ignore toast - just show error
      console.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  // Loading state
  if (isLoadingTask) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/my-tasks')} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to My Tasks
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
        <button onClick={() => navigate('/my-tasks')} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to My Tasks
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
        onClick={() => navigate('/my-tasks')}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        ← Back to My Tasks
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
          {taskExecution.mstTask?.startTime && (
            <div>
              <span className="font-medium text-foreground">Time:</span>{' '}
              {taskExecution.mstTask.startTime}
              {taskExecution.mstTask.endTime ? ` - ${taskExecution.mstTask.endTime}` : ''}
            </div>
          )}
          <div>
            <span className="font-medium text-foreground">Execution Date:</span>{' '}
            {taskExecution.executionDate ? new Date(taskExecution.executionDate).toLocaleDateString() : '-'}
          </div>
        </div>

        {taskExecution.mstTask?.description && (
          <p className="text-sm text-muted-foreground mt-3">{taskExecution.mstTask.description}</p>
        )}
      </div>

      {/* Task Notes */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Task Notes</h2>
        <textarea
          value={taskNotes}
          onChange={(e) => setTaskNotes(e.target.value)}
          placeholder="Add notes about this task..."
          rows={3}
          className="w-full p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleSaveNotes}
            disabled={isSaving}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              isSaving
                ? 'bg-primary/50 text-primary-foreground/50 cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                Saving...
              </span>
            ) : (
              'Save Notes'
            )}
          </button>
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
                  <button
                    key={cl.taskChecklistExecutionId}
                    onClick={() => navigate(`/my-tasks/${taskExecutionId}/checklist/${cl.taskChecklistExecutionId}`)}
                    className="w-full text-left border border-border rounded-lg p-4 bg-background hover:shadow-md transition-shadow hover:border-primary/30 group"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground">
                          {cl.taskChecklist?.sequence != null && (
                            <span className="text-muted-foreground mr-1.5">{cl.taskChecklist.sequence}.</span>
                          )}
                          {cl.taskChecklist?.title || `Checklist #${cl.mstChecklistId}`}
                          {cl.taskChecklist?.isMandatory && (
                            <span className="ml-2 text-xs text-red-500 font-medium">(Mandatory)</span>
                          )}
                        </h3>
                        {cl.taskChecklist?.regionalText && (
                          <p className="text-sm text-muted-foreground mt-0.5">{cl.taskChecklist.regionalText}</p>
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

                    {/* Description */}
                    {cl.taskChecklist?.description && (
                      <p className="text-sm text-muted-foreground mb-2">{cl.taskChecklist.description}</p>
                    )}

                    {/* Time range */}
                    {cl.taskChecklist?.startTime && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span>🕐</span>
                        <span>
                          {cl.taskChecklist.startTime}
                          {cl.taskChecklist.endTime ? ` - ${cl.taskChecklist.endTime}` : ''}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {cl.notes ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">{cl.notes}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No notes</p>
                    )}

                    {/* Completed info */}
                    {cl.completedByUser && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Completed by: {cl.completedByUser.firstName} {cl.completedByUser.lastName}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskExecutionDetail