import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { taskService } from '../services/apiManager'
import { decodeToken, getStoredTokens } from '../utils/auth'
import type { TaskChecklistExecution, ChecklistStatus } from '../types/task-checklist-execution'
import type { EvidenceResponseDto } from '../types/evidence'
import { getEvidenceFileIcon, isImageFile } from '../types/evidence'
import { ActionButton } from '../components/ui/ActionButton'

type EffectiveStatus = 'not_started' | 'in_progress' | 'completed'

const ChecklistExecutionDetail: React.FC = () => {
  const { taskExecutionId, checklistExecutionId } = useParams<{
    taskExecutionId: string
    checklistExecutionId: string
  }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Checklist state
  const [checklistExecution, setChecklistExecution] = useState<TaskChecklistExecution | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Notes editing
  const [notes, setNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

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

  // Fetch checklist execution
  const fetchChecklistExecution = useCallback(async () => {
    if (!checklistExecutionId) return
    try {
      const response = await taskService.getTaskChecklistExecution(Number(checklistExecutionId))
      if (response.data) {
        setChecklistExecution(response.data)
        setNotes(response.data.notes || '')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch checklist execution')
    }
  }, [checklistExecutionId])

  useEffect(() => {
    if (!checklistExecutionId) return
    setIsLoading(true)
    setError(null)
    fetchChecklistExecution().finally(() => setIsLoading(false))
  }, [fetchChecklistExecution, checklistExecutionId])

  // Fetch evidence
  const fetchEvidence = useCallback(async () => {
    if (!checklistExecutionId) return
    setIsLoadingEvidence(true)
    try {
      const response = await taskService.getChecklistEvidence(Number(checklistExecutionId))
      if (response.data) {
        setEvidenceList(response.data)
      }
    } catch {
      // Silently fail — evidence is optional
    } finally {
      setIsLoadingEvidence(false)
    }
  }, [checklistExecutionId])

  useEffect(() => {
    fetchEvidence()
  }, [fetchEvidence])

  // Compute effective status
  const effectiveStatus: EffectiveStatus = !checklistExecution
    ? 'not_started'
    : checklistExecution.checklistStatus === 'COMPLETED'
      ? 'completed'
      : checklistExecution.startedAt
        ? 'in_progress'
        : 'not_started'

  const isLocked = effectiveStatus === 'completed'
  const isReadOnly = effectiveStatus !== 'in_progress'

  // Get current userId from token
  const getCurrentUserId = (): number | null => {
    const { accessToken } = getStoredTokens()
    if (!accessToken) return null
    const decoded = decodeToken(accessToken)
    return decoded?.userId ?? null
  }

  // Start task
  const handleStartTask = async () => {
    if (!checklistExecutionId || isStarting) return
    setIsStarting(true)
    try {
      await taskService.updateTaskChecklistExecution(Number(checklistExecutionId), {
        checklistStatus: 'IN_PROGRESS' as ChecklistStatus,
      })
      await fetchChecklistExecution()
      toast.success('Task started')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start task')
    } finally {
      setIsStarting(false)
    }
  }

  // Complete task
  const handleCompleteTask = async () => {
    if (!checklistExecutionId || isCompleting) return
    const userId = getCurrentUserId()

    setIsCompleting(true)
    try {
      const updateData: Record<string, unknown> = {
        checklistStatus: 'COMPLETED' as ChecklistStatus,
      }
      if (userId) {
        updateData.completedBy = userId
      }
      await taskService.updateTaskChecklistExecution(Number(checklistExecutionId), updateData)
      await fetchChecklistExecution()
      toast.success('Checklist completed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete checklist')
    } finally {
      setIsCompleting(false)
    }
  }

  // Save notes
  const handleSaveNotes = async () => {
    if (!checklistExecutionId || isLocked) return

    setIsSavingNotes(true)
    try {
      await taskService.updateTaskChecklistExecution(Number(checklistExecutionId), {
        notes,
      })

      const refreshed = await taskService.getTaskChecklistExecution(Number(checklistExecutionId))
      if (refreshed.data) {
        setChecklistExecution(refreshed.data)
        setNotes(refreshed.data.notes || '')
      }

      toast.success('Notes saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save notes')
    } finally {
      setIsSavingNotes(false)
    }
  }

  // Upload evidence
  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !checklistExecutionId || isLocked) return

    setIsUploading(true)
    let uploadedCount = 0
    let errorCount = 0

    for (let i = 0; i < files.length; i++) {
      try {
        await taskService.uploadChecklistEvidence(Number(checklistExecutionId), files[i])
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

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(`/my-tasks/${taskExecutionId}`)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Back to Task
        </button>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  // Error
  if (error || !checklistExecution) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(`/my-tasks/${taskExecutionId}`)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Back to Task
        </button>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{error || 'Checklist execution not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/my-tasks/${taskExecutionId}`)}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          ← Back to Task
        </button>
        <span className="text-xs text-muted-foreground">
          ID: #{checklistExecution.taskChecklistExecutionId}
        </span>
      </div>

      {/* ==== Checklist Info Card ==== */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-5 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">
                {checklistExecution.taskChecklist?.title || `Checklist #${checklistExecution.mstChecklistId}`}
              </h1>
              {checklistExecution.taskChecklist?.regionalText && (
                <p className="text-sm text-muted-foreground mt-1">{checklistExecution.taskChecklist.regionalText}</p>
              )}
              {checklistExecution.taskChecklist?.isMandatory && (
                <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  <span>●</span> Mandatory
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Description */}
          {checklistExecution.taskChecklist?.description && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Description
              </label>
              <p className="text-sm text-muted-foreground">{checklistExecution.taskChecklist.description}</p>
            </div>
          )}

          {/* Time range */}
          {checklistExecution.taskChecklist?.startTime && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Scheduled Time
              </label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>🕐</span>
                <span>
                  {checklistExecution.taskChecklist.startTime}
                  {checklistExecution.taskChecklist.endTime ? ` - ${checklistExecution.taskChecklist.endTime}` : ''}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Status
              </label>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  effectiveStatus === 'completed' ? 'bg-green-500' :
                  effectiveStatus === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500'
                }`} />
                <span className="text-sm font-medium text-foreground">
                  {effectiveStatus === 'not_started' ? 'Not Started' :
                   effectiveStatus === 'in_progress' ? 'In Progress' : 'Completed'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Mapped Task
              </label>
              <button
                onClick={() => navigate(`/my-tasks/${taskExecutionId}`)}
                className="text-sm text-primary hover:underline"
              >
                View Task #{taskExecutionId}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==== Notes Card ==== */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Notes</h2>
          {isLocked && <span className="text-xs text-muted-foreground">🔒 Locked</span>}
          {effectiveStatus === 'not_started' && <span className="text-xs text-muted-foreground">Start the task to add notes</span>}
        </div>
        <div className="p-6">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isLocked ? "Notes are locked after completion." : effectiveStatus === 'not_started' ? "Start the task first to add notes." : "Add notes for this checklist item..."}
            rows={3}
            disabled={isReadOnly}
            className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
          />
          {effectiveStatus === 'in_progress' && (
            <div className="flex justify-end mt-3">
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/50 disabled:text-primary-foreground/50 disabled:cursor-not-allowed transition-colors"
              >
                {isSavingNotes ? (
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
      </div>

      {/* ==== Evidence Card ==== */}
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

          {/* Upload button — only when in_progress */}
          {effectiveStatus === 'in_progress' && (
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

          {effectiveStatus !== 'in_progress' && (
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
                        const backendUrl = import.meta.env.VITE_TASK_API_BASE_URL || ''
                        setPreviewImage(`${backendUrl}${evidence.evidenceUrl}`)
                      }}
                      className="w-full aspect-square overflow-hidden bg-muted"
                    >
                      <img
                        src={`${import.meta.env.VITE_TASK_API_BASE_URL || ''}${evidence.evidenceUrl}`}
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

                  {/* Remove button — only when in_progress */}
                  {effectiveStatus === 'in_progress' && (
                    <button
                      onClick={() => setEvidenceList(prev => prev.filter(e => e.taskEvidenceId !== evidence.taskEvidenceId))}
                      className="absolute top-1 right-1 w-5 h-5 bg-destructive/80 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
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
          {/* Action section */}
          <div className="mb-6 pb-6 border-b border-border">
            {effectiveStatus === 'not_started' && (
              <div className="text-center">
                <div className="text-3xl mb-3">⏳</div>
                <p className="text-sm text-muted-foreground mb-4">
                  This checklist is pending. Start it to begin working.
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
                {checklistExecution.startedAt && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Started at: {new Date(checklistExecution.startedAt).toLocaleString()}
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
                <p className="text-sm text-green-600 font-medium">Checklist completed</p>
                {checklistExecution.completedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Completed at: {new Date(checklistExecution.completedAt).toLocaleString()}
                  </p>
                )}
                {checklistExecution.completedByUser && (
                  <p className="text-xs text-muted-foreground">
                    by {checklistExecution.completedByUser.firstName} {checklistExecution.completedByUser.lastName}
                  </p>
                )}
              </div>
            )}
          </div>

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
                    {checklistExecution.startedAt ? (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {new Date(checklistExecution.startedAt).toLocaleString()}
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
                    {checklistExecution.completedAt ? (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {new Date(checklistExecution.completedAt).toLocaleString()}
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
          {checklistExecution.completedByUser && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Completed By</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
                  {checklistExecution.completedByUser.firstName?.[0] || 'U'}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {checklistExecution.completedByUser.firstName} {checklistExecution.completedByUser.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">@{checklistExecution.completedByUser.userName}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==== Created / Updated info ==== */}
      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
        <span>Created: {new Date(checklistExecution.createdAt).toLocaleString()}</span>
        <span>Updated: {new Date(checklistExecution.updatedAt).toLocaleString()}</span>
      </div>

      {/* ==== Complete Confirmation Modal ==== */}
      {showCompleteConfirm && (
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

export default ChecklistExecutionDetail