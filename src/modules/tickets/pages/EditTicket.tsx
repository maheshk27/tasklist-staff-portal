import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { ticketService } from '../../../services/apiManager'
import type { TicketResponseDto, TicketPriorityDto } from '../../../types/ticket'
import toast from 'react-hot-toast'

const SEVERITY_OPTIONS = ['Minor', 'Major', 'Critical', 'Blocker']

const EditTicket: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ticket, setTicket] = useState<TicketResponseDto | null>(null)
  const [priorities, setPriorities] = useState<TicketPriorityDto[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: '',
    severity: '',
    resolutionNotes: '',
  })

  // Fetch ticket data and priorities
  useEffect(() => {
    if (!id) return
    let cancelled = false

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [ticketRes, prioritiesRes] = await Promise.all([
          ticketService.getTicket(Number(id)),
          ticketService.getTicketPriorities(),
        ])
        if (cancelled) return

        if (ticketRes.data) {
          setTicket(ticketRes.data)
          setFormData({
            title: ticketRes.data.title,
            description: ticketRes.data.description || '',
            priority: ticketRes.data.priority || '',
            severity: ticketRes.data.severity || '',
            resolutionNotes: ticketRes.data.resolutionNotes || '',
          })
        }

        if (prioritiesRes.data) {
          setPriorities(prioritiesRes.data)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !user) return

    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!formData.priority) {
      toast.error('Priority is required')
      return
    }
    if (!formData.severity) {
      toast.error('Severity is required')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await ticketService.updateTicket(Number(id), {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        severity: formData.severity,
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

  const updateField = (field: string, value: string) => {
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
      <div>
        <h1 className="text-3xl font-bold">Edit Ticket</h1>
        <p className="text-muted-foreground mt-2">
          {ticket.ticketNumber} — {ticket.title}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-5">
        {/* Ticket info (read-only) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg text-sm">
          <div>
            <span className="text-muted-foreground">Store:</span>{' '}
            <span className="font-medium">{ticket.store?.storeName || 'N/A'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Category:</span>{' '}
            <span className="font-medium">{ticket.ticketCategory?.categoryName || 'N/A'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <span className="font-medium">{ticket.status}</span>
          </div>
          {ticket.assignedToUser && (
            <div>
              <span className="text-muted-foreground">Assigned to:</span>{' '}
              <span className="font-medium">{ticket.assignedToUser.firstName} {ticket.assignedToUser.lastName}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
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

        {/* Priority & Severity row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Priority <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.priority}
              required
              onChange={(e) => updateField('priority', e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Select Priority</option>
              {priorities.map(p => (
                <option key={p.id} value={p.name}>{`${p.name} (SLA: ${p.slaHours} Hours)`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Severity <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.severity}
              required
              onChange={(e) => updateField('severity', e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Select Severity</option>
              {SEVERITY_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
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