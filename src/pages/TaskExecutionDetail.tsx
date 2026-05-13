import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { taskService } from '../services/apiManager'
import { decodeToken, getStoredTokens } from '../utils/auth'
import type { TaskExecution, TaskExecutionStatus } from '../types/task-execution'
import { TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../types/task-execution'
import type { TaskChecklistExecution, ChecklistStatus } from '../types/task-checklist-execution'
import { CHECKLIST_STATUS_COLORS, CHECKLIST_STATUS_LABELS } from '../types/task-checklist-execution'
import type { EvidenceResponseDto } from '../types/evidence'
import { getEvidenceFileIcon, isImageFile } from '../types/evidence'
import { ActionButton } from '../components/ui/ActionButton'

const fileUploadBaseUrl = import.meta.env.VITE_FILE_UPLOAD_BASE_URL || ''

interface TaskExecutionDetailProps {
  readOnly?: boolean
}

type EffectiveStatus = 'not_started' | 'in_progress' | 'completed'

const TaskExecutionDetail: React.FC<TaskExecutionDetailProps> = ({ readOnly = false }) => {
  const { taskExecutionId } = useParams<{ taskExecutionId: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Task execution state
  const [taskExecution, setTaskExecution] = useState<TaskExecution | null>(null)
  const [isLoadingTask, setIsLoadingTask] = useState(true)
  const [taskError, setTaskError] = useState<string | null>(null)

  // Task notes
  const [taskNotes, setTaskNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Checklist executions state
  const [checklistExecutions, setChecklistExecutions] = useState<TaskChecklistExecution[]>([])
  const [isLoadingChecklists, setIsLoadingChecklists] = useState(true)
  const [checklistsError, setChecklistsError] = useState<string | null>(null)

  // Evidence
  const [evidenceList, setEvidenceList] = useState<EvidenceResponseDto[]>([])
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Action state
  const [isStarting, setIsStarting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Complete confirmation modal
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)

  // Delete evidence confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

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

  // Fetch evidence
  const fetchEvidence = useCallback(async () => {
    if (!taskExecutionId) return
    setIsLoadingEvidence(true)
    try {
      const response = await taskService.getTaskEvidence(Number(taskExecutionId))
      if (response.data) {
        setEvidenceList(response.data)
      }
    } catch {
      // Silently fail — evidence is optional
      setEvidenceList([]);
    } finally {
      setIsLoadingEvidence(false)
    }
  }, [taskExecutionId])

  useEffect(() => {
    fetchEvidence()
  }, [fetchEvidence])

  // Compute effective status
  const effectiveStatus: EffectiveStatus = !taskExecution
    ? 'not_started'
    : taskExecution.executionStatus === 'COMPLETED'
      ? 'completed'
      : taskExecution.startedAt
        ? 'in_progress'
        : 'not_started'

  const isLocked = effectiveStatus === 'completed' || readOnly
  const isReadOnly = effectiveStatus !== 'in_progress' || readOnly

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
        setTaskNotes(refreshed.data.notes || '')
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
        setTaskNotes(refreshed.data.notes || '')
      }
      toast.success('Task completed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete task')
    } finally {
      setIsCompleting(false)
    }
  }

  // Save task notes
  const handleSaveNotes = async () => {
    if (!taskExecution || isLocked) return

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

      toast.success('Notes saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save notes')
    } finally {
      setIsSaving(false)
    }
  }

  // Upload evidence
  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !taskExecution || isLocked) return

    setIsUploading(true)
    let uploadedCount = 0
    let errorCount = 0

    for (let i = 0; i < files.length; i++) {
      try {
        await taskService.uploadTaskEvidence(taskExecution.taskExecutionId, files[i])
        uploadedCount++
      } catch {
        errorCount++
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (uploadedCount > 0) {
      toast.success(`${uploadedCount} file${uploadedCount > 1 ? 's' : ''} uploaded successfully`)
      await fetchEvidence()
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload`)
    }

    setIsUploading(false)
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Task Notes</h2>
          {isLocked && <span className="text-xs text-muted-foreground">🔒 Read-only</span>}
        </div>
        <textarea
          value={taskNotes}
          onChange={(e) => setTaskNotes(e.target.value)}
          placeholder={isLocked ? "Notes are locked after completion." : effectiveStatus === 'not_started' ? "Start the task first to add notes." : "Add notes about this task..."}
          rows={3}
          disabled={isReadOnly}
          className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
        />
        {effectiveStatus === 'in_progress' && !readOnly && (
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSaveNotes}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/50 disabled:text-primary-foreground/50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current"></div>
                  Saving...
                </span>
              ) : (
                'Save Notes'
              )}
            </button>
          </div>
        )}
      </div>

      {/* ==== Evidence Files Card ==== */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Evidence Files
            {evidenceList.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({evidenceList.length})
              </span>
            )}
          </h2>

          {/* Upload button — only when in_progress and not readOnly */}
          {effectiveStatus === 'in_progress' && !readOnly && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleUploadEvidence}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              <ActionButton
                action="add"
                layout="grid"
                title="Add Files"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              />
            </div>
          )}

          {readOnly ? (
            <span className="text-xs text-muted-foreground">🔒 Read-only view</span>
          ) : effectiveStatus !== 'in_progress' && (
            <span className="text-xs text-muted-foreground">
              {isLocked ? '🔒 Locked' : 'Start the task to upload files'}
            </span>
          )}
        </div>

        <div className="p-6">
          {isLoadingEvidence ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : evidenceList.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-3">📎</div>
              <p className="text-sm text-muted-foreground">
                {isLocked ? 'No evidence files were uploaded.' : effectiveStatus === 'not_started' ? 'Start the task to upload evidence files.' : 'No evidence files uploaded yet.'}
              </p>
              {effectiveStatus === 'in_progress' && (
                <p className="text-xs text-muted-foreground mt-1">Click "Add Files" to upload images, documents, or videos.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {evidenceList.map((evidence) => (
                <div
                  key={evidence.taskEvidenceId}
                  className="group relative border border-border rounded-lg overflow-hidden bg-background hover:shadow-md transition-shadow"
                >
                  {isImageFile(evidence.mimeType) ? (
                    <button
                      onClick={() => {
                        setPreviewImage(`${fileUploadBaseUrl}/${evidence.evidenceUrl}`)
                      }}
                      className="w-full aspect-square overflow-hidden bg-muted"
                    >
                      <img
                        src={`${fileUploadBaseUrl}/${evidence.evidenceUrl}`}
                        alt={evidence.fileName || 'Evidence'}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-muted">
                      <span className="text-3xl">{getEvidenceFileIcon(evidence.mimeType)}</span>
                    </div>
                  )}

                  <div className="p-2">
                    <p className="text-xs text-foreground truncate" title={evidence.fileName}>
                      {evidence.fileName || 'Unnamed file'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(evidence.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Remove button — only when in_progress and not readOnly */}
                  {effectiveStatus === 'in_progress' && !readOnly && (
                    <button
                      onClick={() => setDeleteConfirmId(evidence.taskEvidenceId)}
                      className="absolute top-1 right-1 w-5 h-5 bg-destructive/80 text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                      title="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
                      Started at: {new Date(taskExecution.startedAt).toLocaleString()}
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
                      Completed at: {new Date(taskExecution.completedAt).toLocaleString()}
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
                    <div className={`w-3 h-3 rounded-full ring-2 ${
                      effectiveStatus === 'not_started' ? 'bg-gray-300 ring-gray-100' : 'bg-blue-500 ring-blue-100'
                    }`} />
                  </div>
                  <div className="flex-1 pt-0">
                    <p className="text-sm font-medium text-foreground">Started</p>
                    {taskExecution.startedAt ? (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {new Date(taskExecution.startedAt).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic mt-0.5">Not started yet</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-[17px] shrink-0 flex justify-center relative z-10">
                    <div className={`w-3 h-3 rounded-full ring-2 ${
                      effectiveStatus === 'completed' ? 'bg-green-500 ring-green-100' : 'bg-gray-300 ring-gray-100'
                    }`} />
                  </div>
                  <div className="flex-1 pt-0">
                    <p className="text-sm font-medium text-foreground">Completed</p>
                    {taskExecution.completedAt ? (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {new Date(taskExecution.completedAt).toLocaleString()}
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
                    onClick={() => navigate(readOnly
                      ? `/team-tasks/${taskExecutionId}/checklist/${cl.taskChecklistExecutionId}`
                      : `/my-tasks/${taskExecutionId}/checklist/${cl.taskChecklistExecutionId}`
                    )}
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

      {/* ==== Created / Updated info ==== */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
        <span>Created: {new Date(taskExecution.createdAt).toLocaleString()}</span>
        <span>Updated: {new Date(taskExecution.updatedAt).toLocaleString()}</span>
      </div>

      {/* ==== Complete Confirmation Modal — hidden when readOnly */}
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

      {/* ==== Delete Evidence Confirmation Modal — hidden when readOnly */}
      {!readOnly && deleteConfirmId !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Confirm Delete</h3>
                <p className="text-sm text-muted-foreground">Are you sure you want to delete this evidence file? This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await taskService.deleteEvidence(deleteConfirmId!)
                    toast.success('Evidence deleted')
                    await fetchEvidence()
                  } catch {
                    toast.error('Failed to delete evidence')
                  }
                  setDeleteConfirmId(null)
                }}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==== Image Preview Modal ==== */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center shadow-md hover:bg-muted transition-colors z-10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={previewImage}
              alt="Evidence preview"
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskExecutionDetail