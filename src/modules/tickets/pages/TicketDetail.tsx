import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { ticketService } from '../../../services/apiManager'
import type { TicketResponseDto, TicketCommentResponseDto, CreateTicketCommentDto, UpdateTicketCommentDto, TicketAttachmentResponseDto, TicketStatusHistoryResponseDto } from '../../../types/ticket'
import { formatDate, formatTime } from '../../../utils/date'

const TICKET_STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  ACKNOWLEDGED: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  REOPENED: 'bg-purple-100 text-purple-800',
  REJECTED: 'bg-red-100 text-red-800',
}

const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
}

// Helper function to get full user name
const getUserDisplayName = (user?: { userId: number; userName: string; firstName: string; lastName: string }) => {
  if (!user) return null
  return `${user.firstName} ${user.lastName}`.trim() || user.userName
}

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState<TicketResponseDto | null>(null)
  const [comments, setComments] = useState<TicketCommentResponseDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [showRemarksModal, setShowRemarksModal] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

  // Comment modal states
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [isCommentLoading, setIsCommentLoading] = useState(false)

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null)

  // Attachment states
  const [attachments, setAttachments] = useState<TicketAttachmentResponseDto[]>([])
  const [isAttachmentLoading, setIsAttachmentLoading] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState<number | null>(null)
  const [showAttachmentDeleteModal, setShowAttachmentDeleteModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Status history states
  const [statusHistory, setStatusHistory] = useState<TicketStatusHistoryResponseDto[]>([])
  const [isStatusHistoryLoading, setIsStatusHistoryLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const fetchTicket = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await ticketService.getTicket(Number(id))
        if (!cancelled && response.data) {
          setTicket(response.data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch ticket')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchTicket()
    return () => { cancelled = true }
  }, [id])

  // Fetch comments when ticket is loaded
  useEffect(() => {
    if (!id || !ticket) return
    let cancelled = false

    const fetchComments = async () => {
      try {
        const response = await ticketService.getTicketComments(ticket.ticketId)
        if (!cancelled && response.data) {
          setComments(response.data)
        }
      } catch (err) {
        console.error('Failed to fetch comments:', err)
      }
    }

    fetchComments()
    return () => { cancelled = true }
  }, [id, ticket?.ticketId])

  // Fetch attachments when ticket is loaded
  useEffect(() => {
    if (!id || !ticket) return
    let cancelled = false

    const fetchAttachments = async () => {
      try {
        const response = await ticketService.getTicketAttachments(ticket.ticketId)
        if (!cancelled && response.data) {
          setAttachments(response.data)
        }
      } catch (err) {
        console.error('Failed to fetch attachments:', err)
      }
    }

    fetchAttachments()
    return () => { cancelled = true }
  }, [id, ticket?.ticketId])

  // Fetch status history when ticket is loaded
  useEffect(() => {
    if (!id || !ticket) return
    let cancelled = false

    const fetchStatusHistory = async () => {
      setIsStatusHistoryLoading(true)
      try {
        const response = await ticketService.getTicketStatusHistory(ticket.ticketId)
        if (!cancelled && response.data) {
          setStatusHistory(response.data)
        }
      } catch (err) {
        console.error('Failed to fetch status history:', err)
      } finally {
        if (!cancelled) setIsStatusHistoryLoading(false)
      }
    }

    fetchStatusHistory()
    return () => { cancelled = true }
  }, [id, ticket?.ticketId])

  const getStatusColor = (status: string) => TICKET_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  const getStatusLabel = (status: string) => TICKET_STATUS_LABELS[status] || status

  const isSlaBreached = (slaDueAt?: string, status?: string) => {
    if (!slaDueAt || status === 'CLOSED' || status === 'RESOLVED' || status === 'REJECTED') return false
    return new Date(slaDueAt) < new Date()
  }

  // Determine user role relative to ticket
  const isRequester = user && ticket && user.userId === ticket.createdBy
  const isAssignee = user && ticket && ticket.assignedTo === user.userId

  // Check what actions are available based on current status
  const canReopen = ticket?.status === 'CLOSED' || ticket?.status === 'RESOLVED'
  const canClose = ticket?.status !== 'CLOSED' && ticket?.status !== 'REJECTED'
  const canAccept = (ticket?.status === 'OPEN' || ticket?.status === 'REOPENED') && isAssignee
  const canStartWork = ticket?.status === 'ACKNOWLEDGED'
  const canPutOnHold = ticket?.status === 'IN_PROGRESS'
  const canResolve = ticket?.status === 'IN_PROGRESS' || ticket?.status === 'ACKNOWLEDGED'

  const canEdit = user && ticket &&
    ticket.createdBy === user.userId &&
    ['OPEN', 'ACKNOWLEDGED', 'REJECTED', 'REOPENED'].includes(ticket.status)

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket || !user) return

    // For certain actions, require remarks
    if (newStatus === 'ON_HOLD' || newStatus === 'RESOLVED' || newStatus === 'CLOSED' || newStatus === 'REJECTED') {
      setPendingStatus(newStatus)
      setShowRemarksModal(true)
      return
    }

    await updateStatus(newStatus, '')
  }

  const updateStatus = async (newStatus: string, remarksText: string) => {
    if (!ticket || !user) return

    setIsActionLoading(true)
    try {
      await ticketService.updateTicketStatus(ticket.ticketId, {
        status: newStatus,
        remarks: remarksText,
        changedBy: user.userId,
      })

      // Refresh ticket data
      const response = await ticketService.getTicket(ticket.ticketId)
      if (response.data) {
        setTicket(response.data)
      }
      setShowRemarksModal(false)
      setRemarks('')
      setPendingStatus(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleRemarksSubmit = () => {
    if (pendingStatus) {
      updateStatus(pendingStatus, remarks)
    }
  }

  // Comment handlers
  const handleAddComment = async () => {
    if (!ticket || !user || !newComment.trim()) return

    setIsCommentLoading(true)
    try {
      const dto: CreateTicketCommentDto = {
        ticketId: ticket.ticketId,
        comment: newComment.trim(),
        createdBy: user.userId,
      }

      const response = await ticketService.createTicketComment(dto)
      if (response.data) {
        setComments([response.data, ...comments])
        setNewComment('')
        setShowCommentModal(false)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setIsCommentLoading(false)
    }
  }

  const handleEditComment = (comment: TicketCommentResponseDto) => {
    setEditingCommentId(comment.id)
    setEditCommentText(comment.comment)
  }

  const handleUpdateComment = async (commentId: number) => {
    if (!editCommentText.trim()) return

    setIsCommentLoading(true)
    try {
      const dto: UpdateTicketCommentDto = {
        comment: editCommentText.trim(),
      }

      const response = await ticketService.updateTicketComment(commentId, dto)
      if (response.data) {
        setComments(comments.map(c => c.id === commentId ? response.data! : c))
        setEditingCommentId(null)
        setEditCommentText('')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update comment')
    } finally {
      setIsCommentLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingCommentId(null)
    setEditCommentText('')
  }

  const handleDeleteClick = (commentId: number) => {
    setCommentToDelete(commentId)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!commentToDelete) return

    setIsCommentLoading(true)
    try {
      await ticketService.deleteTicketComment(commentToDelete)
      setComments(comments.filter(c => c.id !== commentToDelete))
      setShowDeleteModal(false)
      setCommentToDelete(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete comment')
    } finally {
      setIsCommentLoading(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setCommentToDelete(null)
  }

  // Check if user can edit/delete a comment (only own comments)
  const canEditComment = (comment: TicketCommentResponseDto) => {
    return user && comment.createdBy === user.userId
  }

  // =======================
  // Attachment Handlers
  // =======================

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!ticket || !user || !file) return

    setIsAttachmentLoading(true)
    try {
      const response = await ticketService.uploadTicketAttachment(ticket.ticketId, file, user.userId)
      if (response.data) {
        setAttachments([response.data, ...attachments])
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload attachment')
    } finally {
      setIsAttachmentLoading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAttachmentDeleteClick = (attachmentId: number) => {
    setAttachmentToDelete(attachmentId)
    setShowAttachmentDeleteModal(true)
  }

  const handleAttachmentDeleteConfirm = async () => {
    if (!attachmentToDelete) return

    setIsAttachmentLoading(true)
    try {
      await ticketService.deleteTicketAttachment(attachmentToDelete)
      setAttachments(attachments.filter(a => a.ticketAttachmentId !== attachmentToDelete))
      setShowAttachmentDeleteModal(false)
      setAttachmentToDelete(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete attachment')
    } finally {
      setIsAttachmentLoading(false)
    }
  }

  const handleAttachmentDeleteCancel = () => {
    setShowAttachmentDeleteModal(false)
    setAttachmentToDelete(null)
  }

  const canDeleteAttachment = (attachment: TicketAttachmentResponseDto) => {
    return user && attachment.uploadedBy === user.userId
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️'
    if (['pdf'].includes(ext)) return '📄'
    if (['doc', 'docx'].includes(ext)) return '📝'
    if (['xls', 'xlsx'].includes(ext)) return '📊'
    if (['csv'].includes(ext)) return '📈'
    if (['txt'].includes(ext)) return '📃'
    return '📎'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/tickets')} className="text-sm text-primary hover:underline">&larr; Back to Tickets</button>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{error || 'Ticket not found'}</p>
        </div>
      </div>
    )
  }

  const breached = isSlaBreached(ticket.slaDueAt, ticket.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/tickets')} className="text-sm text-primary hover:underline">&larr; Back to Tickets</button>
        <button
          onClick={() => navigate(`/tickets/${ticket.ticketId}/edit`)}
          className={`px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!canEdit}
        >
          Edit Ticket
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">{ticket.ticketNumber}</span>
              {breached && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 hidden md:inline">SLA Breached</span>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(ticket.status)}`}>
            {getStatusLabel(ticket.status)}
          </span>
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
          {ticket.description && (
            <p className="text-sm text-muted-foreground">{ticket.description}</p>
          )}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Store</h3>
            <p className="text-sm">{ticket.store?.storeName || 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Department</h3>
                <p className="text-sm">{ticket.department?.departmentName || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Category</h3>
                <p className="text-sm">{ticket.ticketCategory?.categoryName || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Priority</h3>
                <p className="text-sm">{ticket.priority || 'N/A'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Severity</h3>
                <p className="text-sm">{ticket.severity || 'N/A'}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Raised</span>
                <span>{formatDate(ticket.raisedAt || ticket.createdAt)} {formatTime(ticket.raisedAt || ticket.createdAt)}</span>
              </div>
              {ticket.assignedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Assigned</span>
                  <span>{formatDate(ticket.assignedAt)} {formatTime(ticket.assignedAt)}</span>
                </div>
              )}
              {ticket.acknowledgedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Acknowledged</span>
                  <span>{formatDate(ticket.acknowledgedAt)} {formatTime(ticket.acknowledgedAt)}</span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Resolved</span>
                  <span>{formatDate(ticket.resolvedAt)} {formatTime(ticket.resolvedAt)}</span>
                </div>
              )}
              {ticket.closedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Closed</span>
                  <span>{formatDate(ticket.closedAt)} {formatTime(ticket.closedAt)}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created by</span>
                <span>{getUserDisplayName(ticket.createdByUser) || `User #${ticket.createdBy}`}</span>
              </div>
              {ticket.assignedToUser && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Assigned to</span>
                  <span>{getUserDisplayName(ticket.assignedToUser)}</span>
                </div>
              )}
              {ticket.slaDueAt && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">SLA Due</span>
                  <span className={breached ? 'text-red-600 font-medium' : ''}>
                    {formatDate(ticket.slaDueAt)} {formatTime(ticket.slaDueAt)}
                  </span>
                </div>
              )}
            </div>

            {ticket.resolutionNotes && (
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Resolution Notes</h3>
                <p className="text-sm">{ticket.resolutionNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role-based Action Buttons */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Actions</h2>

        <div className="space-y-4">
          {/* Requester Actions */}
          {isRequester && (
            <div className="flex flex-wrap gap-2">
              {canReopen && (
                <button
                  onClick={() => handleStatusChange('REOPENED')}
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
                >
                  🔄 Reopen Ticket
                </button>
              )}
              {canClose && (
                <button
                  onClick={() => handleStatusChange('CLOSED')}
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
                >
                  ✅ Close Ticket
                </button>
              )}
            </div>
          )}

          {/* Assignee Actions */}
          {isAssignee && (
            <div className="flex flex-wrap gap-2">
              {canAccept && (
                <button
                  onClick={() => handleStatusChange('ACKNOWLEDGED')}
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm disabled:opacity-50"
                >
                  ✓ Accept
                </button>
              )}
              {canStartWork && (
                <button
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                >
                  ▶ Start Work
                </button>
              )}
              {canPutOnHold && (
                <button
                  onClick={() => handleStatusChange('ON_HOLD')}
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm disabled:opacity-50"
                >
                  ⏸ Put On Hold
                </button>
              )}
              {canResolve && (
                <button
                  onClick={() => handleStatusChange('RESOLVED')}
                  disabled={isActionLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                >
                  ✅ Resolve
                </button>
              )}
            </div>
          )}

          {!isRequester && !isAssignee && (
            <p className="text-sm text-muted-foreground">No actions available. You are neither the requester nor the assignee of this ticket.</p>
          )}
        </div>
      </div>

      {/* Ticket Comments Section */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Comments ({comments.length})</h2>
          {(isRequester || isAssignee) && (
            <button
              onClick={() => setShowCommentModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              + Add Comment
            </button>
          )}
        </div>

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Be the first to comment.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-4 rounded-lg border ${canEditComment(comment) ? 'border-blue-200 bg-blue-50/50' : 'border-border'
                  }`}
              >
                {editingCommentId === comment.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <textarea
                      value={editCommentText}
                      onChange={(e) => setEditCommentText(e.target.value)}
                      className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateComment(comment.id)}
                        disabled={isCommentLoading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="space-y-2">
                    <p className="text-sm">{comment.comment}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {getUserDisplayName(comment.createdByUser) || `User #${comment.createdBy}`}
                        </span>
                        {canEditComment(comment) && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">You</span>
                        )}
                      </div>
                      <span>{formatDate(comment.createdAt)} {formatTime(comment.createdAt)}</span>
                    </div>
                    {canEditComment(comment) && (
                      <div className="flex gap-2 pt-2 border-t border-border mt-2">
                        <button
                          onClick={() => handleEditComment(comment)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(comment.id)}
                          disabled={isCommentLoading}
                          className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Attachments Section */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Attachments ({attachments.length})</h2>
          {(isRequester || isAssignee) && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadAttachment}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isAttachmentLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm disabled:opacity-50"
              >
                {isAttachmentLoading ? '⬆️ Uploading...' : '📎 Upload File'}
              </button>
            </>
          )}
        </div>

        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No attachments yet. Upload a file to attach it to this ticket.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.ticketAttachmentId}
                className="flex flex-col p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 mb-3">
                  <span className="text-2xl flex-shrink-0">{getFileIcon(attachment.fileName)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" title={attachment.fileName}>{attachment.fileName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="truncate">{getUserDisplayName(attachment.uploadedByUser) || `User #${attachment.uploadedBy}`}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(attachment.createdAt)} {formatTime(attachment.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
                  <button
                    onClick={() => window.open(attachment.fileUrl, '_blank')}
                    className="flex-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors text-center"
                  >
                    👁️ View
                  </button>
                  {canDeleteAttachment(attachment) && (
                    <button
                      onClick={() => handleAttachmentDeleteClick(attachment.ticketAttachmentId)}
                      disabled={isAttachmentLoading}
                      className="flex-1 px-3 py-1.5 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors disabled:opacity-50 text-center"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Change History Section */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Status Change History</h2>

        {isStatusHistoryLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : statusHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No status change history found.</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border"></div>

            <div className="space-y-0">
              {statusHistory.map((entry, index) => (
                <div key={entry.ticketHistoryId} className="relative flex items-start gap-4 pb-6 last:pb-0">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${index === 0
                      ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-200'
                      : 'bg-muted text-muted-foreground'
                    }`}>
                    {index === 0 ? '●' : '○'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.fromStatus ? (
                          <>
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(entry.fromStatus)}`}>
                              {getStatusLabel(entry.fromStatus)}
                            </span>
                            <span className="text-muted-foreground text-xs">→</span>
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(entry.toStatus)}`}>
                              {getStatusLabel(entry.toStatus)}
                            </span>
                          </>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(entry.toStatus)}`}>
                            {getStatusLabel(entry.toStatus)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(entry.createdAt)} {formatTime(entry.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {getUserDisplayName(entry.changedByUser) || `User #${entry.changedBy}`}
                    </p>
                    {entry.remarks && (
                      <p className="text-xs text-muted-foreground italic truncate max-w-[200px] mt-1" title={entry.remarks}>
                        — {entry.remarks}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 shadow-lg w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Your Comment
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  rows={4}
                  placeholder="Enter your comment..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowCommentModal(false)
                    setNewComment('')
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddComment}
                  disabled={isCommentLoading || !newComment.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
                >
                  {isCommentLoading ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 shadow-lg w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Comment</h3>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this comment? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isCommentLoading}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isCommentLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                >
                  {isCommentLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remarks Modal */}
      {showRemarksModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 shadow-lg w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {pendingStatus === 'ON_HOLD' && 'Put Ticket On Hold'}
              {pendingStatus === 'RESOLVED' && 'Resolve Ticket'}
              {pendingStatus === 'CLOSED' && 'Close Ticket'}
              {pendingStatus === 'REJECTED' && 'Reject Ticket'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Remarks (optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  rows={4}
                  placeholder="Enter remarks..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowRemarksModal(false)
                    setRemarks('')
                    setPendingStatus(null)
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemarksSubmit}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Attachment Confirmation Modal */}
      {showAttachmentDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 shadow-lg w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Attachment</h3>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this attachment? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleAttachmentDeleteCancel}
                  disabled={isAttachmentLoading}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAttachmentDeleteConfirm}
                  disabled={isAttachmentLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                >
                  {isAttachmentLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TicketDetail