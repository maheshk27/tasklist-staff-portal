import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { onboardingService, ticketService } from '../../../services/apiManager'
import type { TicketListDto } from '../../../types/ticket'
import type { StoreWithMapping } from '../../../types/user-store'
import { ArrowLeft } from 'lucide-react'
import PageHeader from '../../../components/PageHeader'
import FormSelect from '../../../components/ui/FormSelect'
import FormField from '../../../components/ui/FormField'
import toast from 'react-hot-toast'
import { ActionButton } from '../../../components/ui/ActionButton'

const CreateTicket: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stores, setStores] = useState<StoreWithMapping[]>([])
  const [ticketLists, setTicketLists] = useState<TicketListDto[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [formData, setFormData] = useState({
    storeId: '' as string | number,
    departmentId: '' as string | number,
    ticketCategoryId: '' as string | number,
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

  // Department options are derived from ticket lists so every listed department has selectable tickets
  const departments = useMemo(() => {
    const map = new Map<number, { departmentId: number; departmentName: string }>()
    ticketLists.forEach(list => {
      if (list.department) map.set(list.department.departmentId, list.department)
    })
    return Array.from(map.values())
  }, [ticketLists])

  const selectedDepartmentId = Number(formData.departmentId)

  // Category options depend on the selected department
  const categories = useMemo(() => {
    const map = new Map<number, { ticketCategoryId: number; categoryName: string }>()
    ticketLists
      .filter(list => list.departmentId === selectedDepartmentId)
      .forEach(list => {
        if (list.ticketCategory) map.set(list.ticketCategory.ticketCategoryId, list.ticketCategory)
      })
    return Array.from(map.values())
  }, [ticketLists, selectedDepartmentId])

  // Ticket options depend on the selected department + category
  const filteredTicketLists = useMemo(
    () => ticketLists.filter(list =>
      list.departmentId === selectedDepartmentId &&
      list.ticketCategoryId === Number(formData.ticketCategoryId)
    ),
    [ticketLists, selectedDepartmentId, formData.ticketCategoryId]
  )

  const handleStoreChange = (storeId: number) => {
    setFormData(prev => ({ ...prev, storeId }))
  }

  const handleDepartmentChange = (departmentId: number) => {
    setFormData(prev => ({
      ...prev,
      departmentId,
      ticketCategoryId: '',
      ticketListId: '',
    }))
  }

  const handleCategoryChange = (ticketCategoryId: number) => {
    setFormData(prev => ({
      ...prev,
      ticketCategoryId,
      ticketListId: '',
    }))
  }

  const handleTicketChange = (ticketListId: number) => {
    setFormData(prev => ({ ...prev, ticketListId }))
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
    if (!formData.departmentId) {
      toast.error('Please select a department')
      return
    }
    if (!formData.ticketCategoryId) {
      toast.error('Please select a category')
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
      <PageHeader
        title="Create New Ticket"
        subtitle="Submit a new support ticket"
        actions={
          <button
            onClick={() => navigate('/tickets')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tickets
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl shadow-sm space-y-5">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormSelect
              label="Store"
              name="storeId"
              value={formData.storeId}
              onChange={(e) => handleStoreChange(Number(e.target.value))}
              options={stores.map(({ store }) => ({
                value: store.storeId,
                label: `${store.storeName} (${store.storeCode})`,
              }))}
              placeholder="Select Store"
              required
            />
            <FormSelect
              label="Department"
              name="departmentId"
              value={formData.departmentId}
              onChange={(e) => handleDepartmentChange(Number(e.target.value))}
              options={departments.map(dept => ({
                value: dept.departmentId,
                label: dept.departmentName,
              }))}
              placeholder="Select Department"
              required
            />
            <FormSelect
              label="Category"
              name="ticketCategoryId"
              value={formData.ticketCategoryId}
              onChange={(e) => handleCategoryChange(Number(e.target.value))}
              options={categories.map(cat => ({
                value: cat.ticketCategoryId,
                label: cat.categoryName,
              }))}
              placeholder="Select Category"
              required
              disabled={!formData.departmentId}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormSelect
              label="Ticket"
              name="ticketListId"
              value={formData.ticketListId}
              onChange={(e) => handleTicketChange(Number(e.target.value))}
              options={filteredTicketLists.map(list => ({
                value: list.ticketListId,
                label: `${list.ticketTitle}${list.regionalText ? ` (${list.regionalText})` : ''}`,
              }))}
              placeholder="Select Ticket"
              required
              disabled={!formData.ticketCategoryId}
            />
            <FormField
              label="Description"
              name="description"
              type="textarea"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Detailed description of the issue"
              rows={4}
              className="sm:col-span-2 lg:col-span-2"
            />
          </div>
        </div>
        {/* Actions */}
        <div className="flex justify-between gap-3 p-6 border-t border-border">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="h-11 px-8 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
          >
            Cancel
          </button>
          <ActionButton
            variant='default'
            action='add'
            layout="grid"
            size="lg"
            disabled={isSubmitting}
            title={isSubmitting ? 'Creating' : 'Create Ticket'}
          />
        </div>
      </form>
    </div>
  )
}

export default CreateTicket
