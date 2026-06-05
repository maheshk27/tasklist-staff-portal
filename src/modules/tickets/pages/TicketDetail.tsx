import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { ticketService } from '../../../services/apiManager'
import type { TicketResponseDto } from '../../../types/ticket'
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
  REJECTED: 'Rejected',
}

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState<TicketResponseDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [showRemarksModal, setShowRemarksModal] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

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
  const canAccept =  (ticket?.status === 'OPEN' || ticket?.status === 'REOPENED') && isAssignee
  const canStartWork = ticket?.status === 'ACKNOWLEDGED'
  const canPutOnHold = ticket?.status === 'IN_PROGRESS'
  const canResolve = ticket?.status === 'IN_PROGRESS' || ticket?.status === 'ACKNOWLEDGED'

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
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          Edit Ticket
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">{ticket.ticketNumber}</span>
              {breached && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">SLA Breached</span>
              )}
            </div>
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(ticket.status)}`}>
            {getStatusLabel(ticket.status)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-4">
            {ticket.description && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p className="text-sm">{ticket.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Store</h3>
                <p className="text-sm">{ticket.store?.storeName || 'N/A'}</p>
              </div>
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
                <span>{ticket.createdByUser?.userName || `User #${ticket.createdBy}`}</span>
              </div>
              {ticket.assignedToUser && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Assigned to</span>
                  <span>{ticket.assignedToUser.userName}</span>
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
              <button
                onClick={() => navigate(`/tickets/${ticket.ticketId}/comment`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                💬 Comment
              </button>
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
    </div>
  )
}

export default TicketDetail