import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { ticketService } from '../../../services/apiManager'
import type { TicketResponseDto, TicketListDto } from '../../../types/ticket'
import FormSelect from '../../../components/ui/FormSelect'
import FormField from '../../../components/ui/FormField'
import toast from 'react-hot-toast'
import { ActionButton } from '../../../components/ui/ActionButton'
import PageHeader from '../../../components/PageHeader'
import { ArrowLeft } from 'lucide-react'

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
      <PageHeader
        title="Edit Ticket"
        subtitle={`${ticket.ticketNumber} — ${ticket.ticketList?.ticketTitle || 'N/A'}`}
        actions={
          <button
            onClick={() => navigate(`/tickets/${id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tickets
          </button>
        }
      />
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg shadow-sm">
        <div className="p-6 space-y-6">
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

          {/* Department -> Category -> Ticket cascade (read-only since the ticket cannot be changed) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <FormSelect
              label="Department"
              name="departmentId"
              value={selectedTicketList?.departmentId || ''}
              onChange={() => { }}
              options={selectedTicketList?.department ? [{
                value: selectedTicketList.department.departmentId,
                label: selectedTicketList.department.departmentName,
              }] : []}
              placeholder="Select Department"
              disabled
              required
            />
            <FormSelect
              label="Category"
              name="ticketCategoryId"
              value={selectedTicketList?.ticketCategoryId || ''}
              onChange={() => { }}
              options={selectedTicketList?.ticketCategory ? [{
                value: selectedTicketList.ticketCategory.ticketCategoryId,
                label: selectedTicketList.ticketCategory.categoryName,
              }] : []}
              placeholder="Select Category"
              disabled
              required
            />
            {/* Ticket (locked - cannot be changed) */}
            <FormSelect
              label="Ticket"
              name="ticketListId"
              value={formData.ticketListId}
              onChange={() => { }}
              options={ticketLists.map(list => ({
                value: list.ticketListId,
                label: `${list.ticketTitle}${list.regionalText ? ` (${list.regionalText})` : ''}`,
              }))}
              placeholder="Select Ticket"
              disabled
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Description */}
            <FormField
              label="Description"
              name="description"
              type="textarea"
              value={formData.description}
              placeholder="Detailed description of the issue"
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
            />

            {/* Resolution Notes */}
            <FormField
              label="Resolution Notes"
              name="resolutionNotes"
              type="textarea"
              value={formData.resolutionNotes}
              onChange={(e) => updateField('resolutionNotes', e.target.value)}
              placeholder="Add resolution notes if the issue is resolved"
              rows={4}
            />
          </div>
        </div>
        {/* Actions */}
        <div className="flex justify-between gap-3 p-6 border-t border-border">
          <button
            type="button"
            onClick={() => navigate(`/tickets/${id}`)}
            className="h-11 px-8 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
          >
            Cancel
          </button>
          <ActionButton
            variant='default'
            action='save'
            layout="grid"
            size="lg"
            disabled={isSubmitting}
            title={isSubmitting ? 'Saving' : 'Save Changes'}
          />
        </div>
      </form>
    </div>
  )
}

export default EditTicket