import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { ticketService } from '../../../services/apiManager'
import type { TicketResponseDto, TicketCommentResponseDto, CreateTicketCommentDto, UpdateTicketCommentDto, TicketAttachmentResponseDto, TicketStatusHistoryResponseDto } from '../../../types/ticket'
import { formatDate, formatTime } from '../../../utils/date'
import { ArrowLeft, RotateCcw, CheckCircle, ThumbsUp, Play, Pause, CheckCheck, Pencil } from 'lucide-react'

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

// Helper function to get user initials for avatar
const getUserInitials = (user?: { firstName: string; lastName: string; userName: string }) => {
  if (!user) return '?'
  const first = user.firstName?.[0] || ''
  const last = user.lastName?.[0] || ''
  return (first + last).toUpperCase() || user.userName?.[0]?.toUpperCase() || '?'
}

// Social Media Style Comment Card Component
interface CommentCardProps {
  comment: TicketCommentResponseDto
  isOwnComment: boolean
  isEditing: boolean
  editText: string
  isCommentLoading: boolean
  onEditTextChange: (text: string) => void
  onEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
}

const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  isOwnComment,
  isEditing,
  editText,
  isCommentLoading,
  onEditTextChange,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}) => {
  const authorName = getUserDisplayName(comment.createdByUser) || `User #${comment.createdBy}`
  const authorInitials = getUserInitials(comment.createdByUser)
  const commentDate = `${formatDate(comment.createdAt)} ${formatTime(comment.createdAt)}`

  const avatarColors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-cyan-500',
  ]
  const colorIndex = (comment.createdBy || 0) % avatarColors.length
  const avatarColor = avatarColors[colorIndex]

  if (isEditing) {
    return (
      <div className="flex gap-3 sm:gap-4">
        <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full ${avatarColor} flex items-center justify-center`}>
          <span className="text-white text-xs sm:text-sm font-semibold">{authorInitials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => onEditTextChange(e.target.value)}
              className="w-full p-3 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              rows={3}
              placeholder="Write a comment..."
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onCancelEdit}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={onSaveEdit}
                disabled={isCommentLoading || !editText.trim()}
                className="px-4 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isCommentLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 sm:gap-4 group">
      <div className="flex-shrink-0 flex flex-col items-center">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${avatarColor} flex items-center justify-center shadow-sm`}>
          <span className="text-white text-xs sm:text-sm font-semibold">{authorInitials}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{authorName}</span>
          {isOwnComment && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">You</span>
          )}
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{commentDate}</span>
        </div>
        <p className="text-sm text-foreground/90 mt-1 leading-relaxed whitespace-pre-wrap break-words">
          {comment.comment}
        </p>
        {isOwnComment && (
          <div className="flex items-center gap-1 mt-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={onDelete}
              disabled={isCommentLoading}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
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
      <div className="flex items-center justify-center py-8 sm:py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <button
          onClick={() => navigate('/tickets')}
          className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tickets
        </button>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive text-sm">{error || 'Ticket not found'}</p>
        </div>
      </div>
    )
  }

  const breached = isSlaBreached(ticket.slaDueAt, ticket.status)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Back button */}
      <div className="flex items-center">
        <button
          onClick={() => navigate('/tickets')}
          className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tickets
        </button>
      </div>

      {/* Role-based Action Buttons */}
      <div>
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-end">
          {/* Edit Ticket Button */}
          {canEdit && (
            <button
              onClick={() => navigate(`/tickets/${ticket.ticketId}/edit`)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Pencil className="h-4 w-4" />
              Edit Ticket
            </button>
          )}

          {/* Requester Actions */}
          {isRequester && canReopen && (
            <button
              onClick={() => handleStatusChange('REOPENED')}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4" />
              Reopen Ticket
            </button>
          )}
          {isRequester && canClose && (
            <button
              onClick={() => handleStatusChange('CLOSED')}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-4 w-4" />
              Close Ticket
            </button>
          )}

          {/* Assignee Actions */}
          {isAssignee && canAccept && (
            <button
              onClick={() => handleStatusChange('ACKNOWLEDGED')}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ThumbsUp className="h-4 w-4" />
              Accept
            </button>
          )}
          {isAssignee && canStartWork && (
            <button
              onClick={() => handleStatusChange('IN_PROGRESS')}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-4 w-4" />
              Start Work
            </button>
          )}
          {isAssignee && canPutOnHold && (
            <button
              onClick={() => handleStatusChange('ON_HOLD')}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pause className="h-4 w-4" />
              Put On Hold
            </button>
          )}
          {isAssignee && canResolve && (
            <button
              onClick={() => handleStatusChange('RESOLVED')}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="h-4 w-4" />
              Resolve
            </button>
          )}

          {!isRequester && !isAssignee && !canEdit && (
            <p className="text-sm text-muted-foreground">No actions available. You are neither the requester nor the assignee of this ticket.</p>
          )}
        </div>
      </div>

      {/* Main Ticket Info Card */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
        {/* Header row with ticket number and status */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">{ticket.ticketNumber}</span>
              {breached && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                  SLA Breached
                </span>
              )}
            </div>
          </div>
          <span className={`self-start px-3 py-1 text-xs sm:text-sm font-medium rounded-full whitespace-nowrap ${getStatusColor(ticket.status)}`}>
            {getStatusLabel(ticket.status)}
          </span>
        </div>

        {/* Title and Description */}
        <div className="space-y-3">
          <h1 className="text-lg sm:text-xl font-bold text-foreground leading-tight my-2">{ticket.ticketList?.ticketTitle}</h1>
          {ticket.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{ticket.description}</p>
          )}
        </div>

        {/* Store + Category Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Store</p>
            <p className="text-sm mt-1">{ticket.store?.storeName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</p>
            <p className="text-sm mt-1">{ticket.ticketList?.department?.departmentName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</p>
            <p className="text-sm mt-1">{ticket.ticketList?.ticketCategory?.categoryName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</p>
            <p className="text-sm mt-1">{ticket.ticketList?.ticketPriority?.name || 'N/A'}</p>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Timeline</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Raised</span>
              <span className="text-sm font-medium mt-1">{formatDate(ticket.raisedAt || ticket.createdAt)} {formatTime(ticket.raisedAt || ticket.createdAt)}</span>
            </div>
            {ticket.assignedAt && (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned</span>
                <span className="text-sm font-medium mt-1">{formatDate(ticket.assignedAt)} {formatTime(ticket.assignedAt)}</span>
              </div>
            )}
            {ticket.acknowledgedAt && (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Acknowledged</span>
                <span className="text-sm font-medium mt-1">{formatDate(ticket.acknowledgedAt)} {formatTime(ticket.acknowledgedAt)}</span>
              </div>
            )}
            {ticket.resolvedAt && (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolved</span>
                <span className="text-sm font-medium mt-1">{formatDate(ticket.resolvedAt)} {formatTime(ticket.resolvedAt)}</span>
              </div>
            )}
            {ticket.closedAt && (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Closed</span>
                <span className="text-sm font-medium mt-1">{formatDate(ticket.closedAt)} {formatTime(ticket.closedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* People & SLA Section */}
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">People & SLA</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created by</span>
              <span className="text-sm font-medium mt-1">{getUserDisplayName(ticket.createdByUser) || `User #${ticket.createdBy}`}</span>
            </div>
            {ticket.assignedToUser && (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned to</span>
                <span className="text-sm font-medium mt-1">{getUserDisplayName(ticket.assignedToUser)}</span>
              </div>
            )}
            {ticket.slaDueAt && (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SLA Due</span>
                <span className={`text-sm font-medium mt-1 ${breached ? 'text-red-600' : ''}`}>
                  {formatDate(ticket.slaDueAt)} {formatTime(ticket.slaDueAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Resolution Notes */}
        {ticket.resolutionNotes && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">Resolution Notes</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{ticket.resolutionNotes}</p>
          </div>
        )}
      </div>

      {/* Ticket Comments Section */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold">Comments ({comments.length})</h2>
          {(isRequester || isAssignee) && (
            <button
              onClick={() => setShowCommentModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              + Add Comment
            </button>
          )}
        </div>

        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-muted/20 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground font-medium">No comments yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Be the first to share your thoughts</p>
          </div>
        ) : (
          <div className="space-y-1">
            {comments.map((comment) => (
              <div key={comment.id} className="p-3 sm:p-4 rounded-xl hover:bg-muted/30 transition-colors">
                <CommentCard
                  comment={comment}
                  isOwnComment={canEditComment(comment) ?? false}
                  isEditing={editingCommentId === comment.id}
                  editText={editCommentText}
                  isCommentLoading={isCommentLoading}
                  onEditTextChange={setEditCommentText}
                  onEdit={() => handleEditComment(comment)}
                  onSaveEdit={() => handleUpdateComment(comment.id)}
                  onCancelEdit={handleCancelEdit}
                  onDelete={() => handleDeleteClick(comment.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Attachments Section */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold">Attachments ({attachments.length})</h2>
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
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isAttachmentLoading ? '⬆️ Uploading...' : '📎 Upload File'}
              </button>
            </>
          )}
        </div>

        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 bg-muted/30 rounded-lg">No attachments yet. Upload a file to attach it to this ticket.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.ticketAttachmentId}
                className="flex flex-col p-3 sm:p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{getFileIcon(attachment.fileName)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" title={attachment.fileName}>{attachment.fileName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {getUserDisplayName(attachment.uploadedByUser) || `User #${attachment.uploadedBy}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(attachment.createdAt)} {formatTime(attachment.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => window.open(attachment.fileUrl, '_blank')}
                    className="flex-1 px-3 py-2 text-xs bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-center font-medium"
                  >
                    👁️ View
                  </button>
                  {canDeleteAttachment(attachment) && (
                    <button
                      onClick={() => handleAttachmentDeleteClick(attachment.ticketAttachmentId)}
                      disabled={isAttachmentLoading}
                      className="flex-1 px-3 py-2 text-xs bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 text-center font-medium"
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
      <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Status Change History</h2>

        {isStatusHistoryLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : statusHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 bg-muted/30 rounded-lg">No status change history found.</p>
        ) : (
          <div className="relative">
            {/* Timeline line - hidden on mobile for cleaner look */}
            <div className="hidden sm:block absolute left-4 top-0 bottom-0 w-px bg-border"></div>

            <div className="space-y-0">
              {statusHistory.map((entry, index) => (
                <div key={entry.ticketHistoryId} className="relative flex items-start gap-3 sm:gap-4 pb-4 sm:pb-6 last:pb-0">
                  {/* Timeline dot - smaller on mobile */}
                  <div className={`hidden sm:flex relative z-10 flex-shrink-0 w-8 h-8 rounded-full items-center justify-center text-xs font-medium ${index === 0
                    ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-200'
                    : 'bg-muted text-muted-foreground'
                    }`}>
                    {index === 0 ? '●' : '○'}
                  </div>

                  {/* Mobile indicator dot */}
                  <div className={`sm:hidden flex-shrink-0 w-2 h-2 rounded-full mt-2 ${index === 0 ? 'bg-blue-500' : 'bg-muted-foreground/40'}`}></div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
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
                      <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2" title={entry.remarks}>
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

      {/* ======================= */}
      {/* MODALS */}
      {/* ======================= */}

      {/* Add Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-xl sm:rounded-xl p-4 sm:p-6 shadow-lg w-full sm:max-w-md sm:mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Your Comment
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  rows={4}
                  placeholder="Enter your comment..."
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  onClick={() => {
                    setShowCommentModal(false)
                    setNewComment('')
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddComment}
                  disabled={isCommentLoading || !newComment.trim()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-xl sm:rounded-xl p-4 sm:p-6 shadow-lg w-full sm:max-w-md sm:mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Comment</h3>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this comment? This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isCommentLoading}
                  className="w-full sm:w-auto px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isCommentLoading}
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-xl sm:rounded-xl p-4 sm:p-6 shadow-lg w-full sm:max-w-md sm:mx-4 max-h-[90vh] overflow-y-auto">
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
                  className="w-full p-3 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  rows={4}
                  placeholder="Enter remarks..."
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  onClick={() => {
                    setShowRemarksModal(false)
                    setRemarks('')
                    setPendingStatus(null)
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemarksSubmit}
                  className="w-full sm:w-auto px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
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
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-card border border-border rounded-t-xl sm:rounded-xl p-4 sm:p-6 shadow-lg w-full sm:max-w-md sm:mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Attachment</h3>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this attachment? This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  onClick={handleAttachmentDeleteCancel}
                  disabled={isAttachmentLoading}
                  className="w-full sm:w-auto px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAttachmentDeleteConfirm}
                  disabled={isAttachmentLoading}
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
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