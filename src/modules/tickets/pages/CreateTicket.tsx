import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { onboardingService, ticketService } from '../../../services/apiManager'
import type { TicketListDto } from '../../../types/ticket'
import type { StoreWithMapping } from '../../../types/user-store'
import toast from 'react-hot-toast'

const CreateTicket: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stores, setStores] = useState<StoreWithMapping[]>([])
  const [ticketLists, setTicketLists] = useState<TicketListDto[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [formData, setFormData] = useState({
    storeId: '' as string | number,
    ticketListId: '' as string | number,
    description: '',
  })

  // Fetch stores and ticket lists (mapping of department/category/priority)
  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const [storesRes, ticketListsRes] = await Promise.all([
          onboardingService.getUserStores(user.userId),
          ticketService.getTicketLists(),
        ])
        if (cancelled) return

        const activeStores = storesRes.stores.filter(s => s.mapping.isActive)
        setStores(activeStores)

        if (ticketListsRes.data) {
          setTicketLists(ticketListsRes.data)
        }

        if (activeStores.length > 0) {
          const firstStore = activeStores[0].store
          setFormData(prev => ({ ...prev, storeId: firstStore.storeId }))
        }
      } catch {
        toast.error('Failed to load data')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [user])

  // Selected ticket determines the department + category (shown non-editable)
  const selectedTicketList = useMemo(
    () => ticketLists.find(list => list.ticketListId === Number(formData.ticketListId)),
    [ticketLists, formData.ticketListId]
  )

  const handleStoreChange = (storeId: number) => {
    setFormData(prev => ({ ...prev, storeId }))
  }

  const updateField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!formData.storeId) {
      toast.error('Please select a store')
      return
    }
    if (!formData.ticketListId) {
      toast.error('Please select a ticket')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await ticketService.createTicket({
        storeId: Number(formData.storeId),
        ticketListId: Number(formData.ticketListId),
        description: formData.description.trim() || undefined,
        createdBy: user.userId,
      })

      if (response.success && response.data) {
        toast.success('Ticket created successfully')
        navigate(`/tickets/${response.data.ticketId}`)
      } else {
        toast.error(response.message || 'Failed to create ticket')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Create New Ticket</h1>
          <p className="text-muted-foreground mt-2">Submit a new support ticket</p>
        </div>
        <button
          onClick={() => navigate('/tickets')}
          className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium inline-flex items-center gap-2 shrink-0"
        >
          &larr; Back to Tickets
        </button>
      </div>
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Store */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Store <span className="text-destructive">*</span>
            </label>
            <select
              required
              value={formData.storeId}
              onChange={(e) => handleStoreChange(Number(e.target.value))}
              className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Select Store</option>
              {stores.map(({ store }) => (
                <option key={store.storeId} value={store.storeId}>
                  {store.storeName} ({store.storeCode})
                </option>
              ))}
            </select>
          </div>

          {/* Ticket (user selects the ticket first) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Ticket <span className="text-destructive">*</span>
            </label>
            <select
              required
              value={formData.ticketListId}
              onChange={(e) => updateField('ticketListId', e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Select Ticket</option>
              {ticketLists.map(list => (
                <option key={list.ticketListId} value={list.ticketListId}>
                  {list.ticketTitle}{list.regionalText ? ` (${list.regionalText})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Department & Category (auto-set based on selected ticket, non-editable) */}
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
            placeholder="Detailed description of the issue"
            className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
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
                Creating...
              </span>
            ) : (
              'Create Ticket'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateTicket
