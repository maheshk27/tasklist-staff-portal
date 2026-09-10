import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ChevronLeft,
  Clock,
  Hourglass,
  PlayCircle,
  CircleCheckBig,
  PartyPopper,
  BadgeCheck,
  MapPin,
  Lock,
  Paperclip,
  X,
  FileText,
  ShieldCheck,
  Flag,
} from 'lucide-react'
import { taskService } from '../services/apiManager'
import { decodeToken, getStoredTokens } from '../utils/auth'
import type { TaskChecklistExecution, ChecklistStatus } from '../types/task-checklist-execution'
import { CHECKLIST_STATUS_COLORS, CHECKLIST_STATUS_LABELS, CHECKLIST_PRIORITY_LABELS } from '../types/task-checklist-execution'
import type { EvidenceResponseDto } from '../types/evidence'
import { getEvidenceFileIcon, isImageFile } from '../types/evidence'
import { ActionButton } from '../components/ui/ActionButton'
import PageHeader from '../components/PageHeader'
import { getPriorityColor } from '../utils/priority'
import { formatDateTime, formatTime, isTimeToStart } from '../utils/date'

const fileUploadBaseUrl = import.meta.env.VITE_FILE_UPLOAD_BASE_URL || ''

interface ChecklistExecutionDetailProps {
  readOnly?: boolean
}

//type checklistExecution?.checklistStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

const ChecklistExecutionDetail: React.FC<ChecklistExecutionDetailProps> = ({ readOnly = false }) => {
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

  // Delete evidence confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

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
      setEvidenceList([]);
    } finally {
      setIsLoadingEvidence(false)
    }
  }, [checklistExecutionId])

  useEffect(() => {
    fetchEvidence()
  }, [fetchEvidence])

  const isLocked = checklistExecution?.checklistStatus === 'COMPLETED' || readOnly
  const isReadOnly = checklistExecution?.checklistStatus !== 'IN_PROGRESS' || readOnly

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

    // If proof/evidence is mandatory, the checklist cannot be completed
    // without at least one evidence file uploaded.
    if (checklistExecution?.taskChecklist?.proofMandatory === true && evidenceList.length === 0) {
      toast.error('Please upload the required evidence before completing this checklist.')
      return
    }

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
    // TEMP DIAGNOSTICS — keep the real reasons so the toast can show them
    const failureReasons: string[] = []

    for (let i = 0; i < files.length; i++) {
      try {
        await taskService.uploadChecklistEvidence(Number(checklistExecutionId), files[i])
        uploadedCount++
      } catch (err) {
        errorCount++
        failureReasons.push(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    // Reset both file inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    const docInput = document.getElementById('document-upload') as HTMLInputElement | null
    if (docInput) {
      docInput.value = ''
    }

    // Always refresh: a request can complete server-side even when the client
    // gives up on it, so the list must reflect what was actually stored.
    await fetchEvidence()

    if (uploadedCount > 0) {
      toast.success(`${uploadedCount} file${uploadedCount > 1 ? 's' : ''} uploaded successfully`)
    }

    if (errorCount > 0) {
      // TEMP DIAGNOSTICS — show the actual reason; staff test on mobile and
      // cannot open a browser console to read it.
      toast.error(
        `${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload: ${failureReasons.join('; ')}`,
        { duration: 10000 },
      )
    }

    setIsUploading(false)
  }

  // Navigate back based on readOnly mode
  const goBack = () => {
    if (readOnly) {
      navigate(taskExecutionId ? `/team-tasks/${taskExecutionId}` : '/team-tasks')
    } else {
      navigate(taskExecutionId ? `/my-tasks/${taskExecutionId}` : '/my-tasks')
    }
  }

  // Navigate to the mapped task execution ('/my-tasks/:id' or '/team-tasks/:id')
  const goToTask = () => {
    if (!taskExecutionId) return
    navigate(readOnly ? `/team-tasks/${taskExecutionId}` : `/my-tasks/${taskExecutionId}`)
  }

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
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
          onClick={goBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Task
        </button>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{error || 'Checklist execution not found'}</p>
        </div>
      </div>
    )
  }

  // Derived checklist config from the linked TaskChecklist
  const checklistPriority = checklistExecution.taskChecklist?.priority
  const checklistPriorityLabel = checklistPriority ? CHECKLIST_PRIORITY_LABELS[checklistPriority as keyof typeof CHECKLIST_PRIORITY_LABELS] : undefined
  const isProofMandatory = checklistExecution.taskChecklist?.proofMandatory === true
  const uploadType = checklistExecution.taskChecklist?.uploadType || 'PHOTO'
  const isPhotoUpload = uploadType === 'PHOTO'
  const checklistStatusColor = CHECKLIST_STATUS_COLORS[checklistExecution.checklistStatus] || 'bg-gray-100 text-gray-800'
  const checklistStatusLabel = CHECKLIST_STATUS_LABELS[checklistExecution.checklistStatus] || checklistExecution.checklistStatus

  return (
    <div className="space-y-6">
      {/* Page header (back only) */}
      <button
        onClick={goBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {readOnly ? 'Team Tasks' : 'My Tasks'}
      </button>
      <PageHeader
        title="Checklist Execution"
        subtitle="View and manage your assigned checklist"
      />

      {/* Action Buttons — Start / Complete Task */}
      {!readOnly && (
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            {checklistExecution?.checklistStatus === 'NOT_STARTED' && (
              <>
                {isTimeToStart(checklistExecution.fromTime) ? (
                  <ActionButton
                    action="signin"
                    layout="grid"
                    title="Start Task"
                    onClick={handleStartTask}
                    disabled={isStarting}
                  />
                ) : (
                  <ActionButton
                    action="signin"
                    layout="grid"
                    title={`Starts at ${formatTime(checklistExecution.fromTime)}`}
                    disabled={true}
                  />
                )}
              </>
            )}

            {(checklistExecution?.checklistStatus === 'IN_PROGRESS' || checklistExecution?.checklistStatus === 'OVERDUE') && (
              <ActionButton
                action="activate"
                layout="grid"
                title="Complete Task"
                onClick={() => {
                  if (checklistExecution?.taskChecklist?.proofMandatory === true && evidenceList.length === 0) {
                    toast.error('Please upload the required evidence before completing this checklist.')
                    return
                  }
                  setShowCompleteConfirm(true)
                }}
                disabled={isCompleting}
              />
            )}
          </div>
      )}

      {/* ==== Checklist Info Card ==== */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 space-y-3">
          {/* Title */}
          <h1 className="text-lg font-medium text-foreground leading-tight">
            {checklistExecution.taskChecklist?.title || `Checklist #${checklistExecution.mstChecklistId}`}
          </h1>

          {/* Regional text */}
          {checklistExecution.taskChecklist?.regionalText && (
            <p className="text-md text-muted-foreground">{checklistExecution.taskChecklist.regionalText}</p>
          )}

          {/* Meta strip — scheduled time, mapped task, ID */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
            {checklistExecution.fromTime && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatDateTime(checklistExecution.fromTime)}
                {checklistExecution.toTime ? ` - ${formatTime(checklistExecution.toTime)}` : ''}
              </span>
            )}
            <button
              onClick={goToTask}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary hover:underline"
              title={`View task #${taskExecutionId}`}
            >
              <MapPin className="h-3.5 w-3.5" />
              {taskExecutionId ? `Mapped Task: #${taskExecutionId}` : 'Mapped Task: —'}
            </button>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5" />
              ID: #{checklistExecution.taskChecklistExecutionId}
            </span>
          </div>

          {/* Description */}
          {checklistExecution.taskChecklist?.description && (
            <div className="">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Description
              </label>
              <p className="text-sm text-muted-foreground">{checklistExecution.taskChecklist.description}</p>
            </div>
          )}

          {/* Badges — mandatory, priority, status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium ${checklistStatusColor}`}>
              {checklistStatusLabel}
            </span>
            {checklistExecution.taskChecklist?.isMandatory && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium text-red-600 bg-red-50">
                Mandatory
              </span>
            )}
            {checklistPriority && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${getPriorityColor(checklistPriority)}`}>
                {checklistPriorityLabel || checklistPriority}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ==== Evidence Card — only shown when proof/evidence is mandatory ==== */}
      {isProofMandatory && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                Evidence Files
                {evidenceList.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({evidenceList.length})
                  </span>
                )}
              </h2>
            </div>

            {/* Upload buttons — only when in_progress and not readOnly */}
            {checklistExecution?.checklistStatus === 'IN_PROGRESS' && !readOnly && (
              <div className="flex items-center gap-2">
                {isPhotoUpload ? (
                  <>
                    {/* Camera input — only for image uploads (PHOTO), uses rear camera on mobile */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      capture="environment"
                      onChange={handleUploadEvidence}
                      className="hidden"
                      accept="image/*"
                    />
                    <ActionButton
                      action="add"
                      layout="grid"
                      title="Camera"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    />
                  </>
                ) : (
                  <>
                    {/* File input — for documents (PDF / EXCEL), hidden, opened via the label below */}
                    <input
                      type="file"
                      onChange={handleUploadEvidence}
                      className="hidden"
                      id="document-upload"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    />
                    <label
                      htmlFor="document-upload"
                      className={`px-4 py-2 border border-border rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center gap-2 ${isUploading
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-muted'
                        }`}
                    >
                      <FileText className="w-4 h-4" />
                      Documents
                    </label>
                  </>
                )}
              </div>
            )}

            {readOnly ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Read-only view
              </span>
            ) : checklistExecution?.checklistStatus !== 'IN_PROGRESS' && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                {isLocked ? 'Locked' : 'Start the task to upload files'}
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
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Paperclip className="h-7 w-7" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {isLocked ? 'No evidence files were uploaded.' : checklistExecution?.checklistStatus === 'NOT_STARTED' ? 'Start the task to upload evidence files.' : 'No evidence files uploaded yet.'}
                </p>
                {checklistExecution?.checklistStatus === 'IN_PROGRESS' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPhotoUpload
                      ? 'Click "Camera" to capture a photo or pick an image from your device.'
                      : `Click "Documents" to upload a ${uploadType.toLowerCase()} file.`}
                  </p>
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
                        {formatDateTime(evidence.createdAt)}
                      </p>
                    </div>

                    {/* Remove button — only when in_progress and not readOnly */}
                    {checklistExecution?.checklistStatus === 'IN_PROGRESS' && !readOnly && (
                      <button
                        onClick={() => setDeleteConfirmId(evidence.taskEvidenceId)}
                        className="absolute top-1 right-1 w-8 h-8 bg-destructive/80 text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                        title="Remove"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==== Activity Card (Action + Timeline + Completed By) ==== */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Activity</h2>
          </div>
        </div>
        <div className="p-4">
          {/* Action + Timeline side by side (1 col mobile, 2 cols sm+) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Action section — hidden when readOnly */}
            {!readOnly && (
              <div className="h-full rounded-xl border border-border p-4">
                {checklistExecution?.checklistStatus === 'NOT_STARTED' && (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Hourglass className="h-7 w-7" />
                    </div>
                    {isTimeToStart(checklistExecution.fromTime) ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-orange-500 font-medium mb-1">
                          Checklist starts at {formatTime(checklistExecution.fromTime)}
                        </p>
                        <p className="text-xs text-muted-foreground mb-4">
                          Please wait until the scheduled start time to begin.
                        </p>
                        <ActionButton
                          action="signin"
                          layout="grid"
                          title={`Starts at ${formatTime(checklistExecution.fromTime)}`}
                          disabled={true}
                        />
                      </>
                    )}
                  </div>
                )}

                {(checklistExecution?.checklistStatus === 'IN_PROGRESS' || checklistExecution?.checklistStatus === 'OVERDUE') && (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <PlayCircle className="h-7 w-7" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Task is in {checklistExecution?.checklistStatus === 'IN_PROGRESS' ? 'progress' : 'overdue'}.
                    </p>
                    {checklistExecution.startedAt && (
                      <p className="text-xs text-muted-foreground mb-4">
                        Started at: {formatDateTime(checklistExecution.startedAt)}
                      </p>
                    )}
                    <ActionButton
                      action="activate"
                      layout="grid"
                      title="Complete Task"
                      onClick={() => {
                        if (checklistExecution?.taskChecklist?.proofMandatory === true && evidenceList.length === 0) {
                          toast.error('Please upload the required evidence before completing this checklist.')
                          return
                        }
                        setShowCompleteConfirm(true)
                      }}
                      disabled={isCompleting}
                    />
                  </div>
                )}

                {checklistExecution?.checklistStatus === 'COMPLETED' && (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <PartyPopper className="h-7 w-7" />
                    </div>
                    <p className="text-sm text-green-600 font-medium">Checklist completed</p>
                    {checklistExecution.completedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Completed at: {formatDateTime(checklistExecution.completedAt)}
                      </p>
                    )}
                    {checklistExecution.completedByUser && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Completed by {checklistExecution.completedByUser.firstName} {checklistExecution.completedByUser.lastName}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Timeline section — vertical stepper, responsive */}
            <div className="h-full rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Timeline</h3>

              {(() => {
                const startedAt = checklistExecution.startedAt
                const completedAt = checklistExecution.completedAt
                const isCompleted = checklistExecution.checklistStatus === 'COMPLETED'

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

          {/* Completed By section */}
          {/* {checklistExecution.completedByUser && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Completed By</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {checklistExecution.completedByUser.firstName} {checklistExecution.completedByUser.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">@{checklistExecution.completedByUser.userName}</p>
                </div>
              </div>
            </div>
          )} */}

          {/* Created / Updated info */}
          {checklistExecution && (
            <div className="mt-5 border-t border-border pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Created: {formatDateTime(checklistExecution.createdAt)}</span>
              <span>Updated: {formatDateTime(checklistExecution.updatedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ==== Notes Card ==== */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Notes</h2>
          </div>
          {isLocked && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Read-only
            </span>
          )}
        </div>
        <div className="p-6">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isLocked ? "Notes are locked after completion." : checklistExecution?.checklistStatus === 'NOT_STARTED' ? "Start the task first to add notes." : "Add notes for this checklist item..."}
            rows={3}
            disabled={isReadOnly}
            className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
          />
          {checklistExecution?.checklistStatus === 'IN_PROGRESS' && !readOnly && (
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

export default ChecklistExecutionDetail