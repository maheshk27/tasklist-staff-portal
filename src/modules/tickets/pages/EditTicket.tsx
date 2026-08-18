import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { ticketService } from '../../../services/apiManager'
import type { TicketResponseDto, TicketListDto } from '../../../types/ticket'
import toast from 'react-hot-toast'

const EditTicket: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticket, setTicket] = useState<TicketResponseDto | null>(null)
  const [ticketLists, setTicketLists] = useState<TicketListDto[]>([])

  const [formData, setFormData] = useState({
    ticketListId: '' as string | number,
    description: '',
    resolutionNotes: '',
  })

  // Fetch ticket data and ticket lists
  useEffect(() => {
    if (!id) return
    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [ticketRes, ticketListsRes] = await Promise.all([
          ticketService.getTicket(Number(id)),
          ticketService.getTicketLists(),
        ])
        if (cancelled) return

        if (ticketRes.data) {
          setTicket(ticketRes.data)
          setFormData(prev => ({
            ...prev,
            ticketListId: ticketRes.data?.ticketListId || '',
            description: ticketRes.data?.description || '',
            resolutionNotes: ticketRes.data?.resolutionNotes || '',
          }))
        }

        if (ticketListsRes.data) {
          setTicketLists(ticketListsRes.data)
        }
      } catch {
        toast.error('Failed to load ticket')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [id])

  // The selected ticket (locked in Edit) determines department + category
  const selectedTicketList = useMemo(
    () => ticketLists.find(list => list.ticketListId === Number(formData.ticketListId)) || ticket?.ticketList,
    [ticketLists, formData.ticketListId, ticket]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !user) return

    if (!formData.ticketListId) {
      toast.error('Ticket could not be resolved')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await ticketService.updateTicket(Number(id), {
        description: formData.description.trim() || undefined,
        resolutionNotes: formData.resolutionNotes.trim() || undefined,
      })

      if (response.success) {
        toast.success('Ticket updated successfully')
        navigate(`/tickets/${id}`)
      } else {
        toast.error(response.message || 'Failed to update ticket')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/tickets')} className="text-sm text-primary hover:underline">&larr; Back to Tickets</button>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">Ticket not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Edit Ticket</h1>
          <p className="text-muted-foreground mt-2">
            {ticket.ticketNumber} — {ticket.ticketList?.ticketTitle || 'N/A'}
          </p>
        </div>
        <button
          onClick={() => navigate(`/tickets/${id}`)}
          className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium inline-flex items-center gap-2 shrink-0"
        >
          &larr; Back to Ticket
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-5">
        {/* Ticket info (read-only) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg text-sm">
          <div>
            <span className="text-muted-foreground">Store:</span>{' '}
            <span className="font-medium">{ticket.store?.storeName || 'N/A'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <span className="font-medium">{ticket.status}</span>
          </div>
        </div>

        {/* Ticket (locked - cannot be changed) */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Ticket <span className="text-destructive">*</span>
          </label>
          <select
            disabled
            value={formData.ticketListId}
            className="w-full p-2 border border-border rounded-lg bg-muted/40 text-foreground text-sm opacity-70 cursor-not-allowed"
          >
            <option value="">Select Ticket</option>
            {ticketLists.map(list => (
              <option key={list.ticketListId} value={list.ticketListId}>
                {list.ticketTitle}{list.regionalText ? ` (${list.regionalText})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Department & Category (auto-set based on the ticket, non-editable) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Department <span className="text-destructive">*</span>
            </label>
            <select
              disabled
              value={selectedTicketList?.departmentId || ''}
              className="w-full p-2 border border-border rounded-lg bg-muted/40 text-foreground text-sm opacity-70 cursor-not-allowed"
            >
              <option value="">Select Department</option>
              {selectedTicketList?.department && (
                <option value={selectedTicketList.department.departmentId}>{selectedTicketList.department.departmentName}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Category <span className="text-destructive">*</span>
            </label>
            <select
              disabled
              value={selectedTicketList?.ticketCategoryId || ''}
              className="w-full p-2 border border-border rounded-lg bg-muted/40 text-foreground text-sm opacity-70 cursor-not-allowed"
            >
              <option value="">Select Category</option>
              {selectedTicketList?.ticketCategory && (
                <option value={selectedTicketList.ticketCategory.ticketCategoryId}>{selectedTicketList.ticketCategory.categoryName}</option>
              )}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
          />
        </div>

        {/* Resolution Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">Resolution Notes</label>
          <textarea
            rows={3}
            value={formData.resolutionNotes}
            onChange={(e) => updateField('resolutionNotes', e.target.value)}
            placeholder="Add resolution notes if the issue is resolved"
            className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/tickets/${id}`)}
            className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditTicket