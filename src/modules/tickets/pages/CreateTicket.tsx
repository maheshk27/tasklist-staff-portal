import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { onboardingService, ticketService } from '../../../services/apiManager'
import { onboardingApi } from '../../../services/api'
import type { TicketCategoryDto, DepartmentDto } from '../../../types/ticket'
import type { StoreWithMapping } from '../../../types/user-store'
import toast from 'react-hot-toast'

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const SEVERITY_OPTIONS = ['MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER']

const CreateTicket: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stores, setStores] = useState<StoreWithMapping[]>([])
  const [categories, setCategories] = useState<TicketCategoryDto[]>([])
  const [departments, setDepartments] = useState<DepartmentDto[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [formData, setFormData] = useState({
    storeId: '' as string | number,
    departmentId: '' as string | number,
    ticketCategoryId: '' as string | number,
    title: '',
    description: '',
    priority: '',
    severity: '',
  })

  // Fetch stores, categories and departments
  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      if (!user) return
      setIsLoading(true)
      try {
        const [storesRes, categoriesRes, deptRes] = await Promise.all([
          onboardingService.getUserStores(user.userId),
          ticketService.getTicketCategories(),
          onboardingApi.get('/departments'),
        ])
        if (cancelled) return

        const activeStores = storesRes.stores.filter(s => s.mapping.isActive)
        setStores(activeStores)
        if (categoriesRes.data) {
          setCategories(categoriesRes.data.filter(c => c.isActive))
        }

        // Set departments from API
        const deptData: DepartmentDto[] = deptRes.data?.data || []
        setDepartments(deptData)
        
        // Find Maintenance department and pre-select it
        const maintenanceDept = deptData.find((d: DepartmentDto) => d.departmentName === 'Maintenance')
        const deptId = maintenanceDept?.departmentId || (deptData.length > 0 ? deptData[0].departmentId : '')

        if (activeStores.length > 0) {
          const firstStore = activeStores[0].store
          setFormData(prev => ({
            ...prev,
            storeId: firstStore.storeId,
            departmentId: deptId,
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            departmentId: deptId,
          }))
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

  const handleStoreChange = (storeId: number) => {
    setFormData(prev => ({
      ...prev,
      storeId,
    }))
  }

  /* const handleDepartmentChange = (deptId: number) => {
    setFormData(prev => ({
      ...prev,
      departmentId: deptId,
    }))
  } */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!formData.storeId || !formData.ticketCategoryId || !formData.title.trim() || !formData.priority || !formData.severity) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await ticketService.createTicket({
        storeId: Number(formData.storeId),
        departmentId: Number(formData.departmentId),
        ticketCategoryId: Number(formData.ticketCategoryId),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority || undefined,
        severity: formData.severity || undefined,
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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Ticket</h1>
        <p className="text-muted-foreground mt-2">Submit a new support ticket</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-5">
        {/* Department Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Department <span className="text-destructive">*</span>
          </label>
          <select
            required
            value={formData.departmentId}
            // onChange={(e) => handleDepartmentChange(Number(e.target.value))}
            disabled
            className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept.departmentId} value={dept.departmentId}>
                {dept.departmentName}
              </option>
            ))}
          </select>
        </div>

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

        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Category <span className="text-destructive">*</span>
          </label>
          <select
            required
            value={formData.ticketCategoryId}
            onChange={(e) => updateField('ticketCategoryId', e.target.value)}
            className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">Select Category</option>
            {categories.map(cat => (
              <option key={cat.ticketCategoryId} value={cat.ticketCategoryId}>
                {cat.categoryName}
              </option>
            ))}
          </select>
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
            placeholder="Brief description of the issue"
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
            placeholder="Detailed description of the issue"
            className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
          />
        </div>

        {/* Priority & Severity row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Priority <span className="text-destructive">*</span></label>
            <select
              value={formData.priority}
              required
              onChange={(e) => updateField('priority', e.target.value)}
              className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Select Priority</option>
              {PRIORITY_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Severity <span className="text-destructive">*</span></label>
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

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
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
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateTicket