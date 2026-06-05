import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { onboardingService, ticketService } from '../../../services/apiManager'
import type { TicketResponseDto, TicketCategoryDto, TicketFilterParams } from '../../../types/ticket'
import type { StoreWithMapping } from '../../../types/user-store'
import { formatDate } from '../../../utils/date'
import { Search, List, LayoutGrid, ChevronDown } from 'lucide-react'

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

const TicketList: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Stores
  const [stores, setStores] = useState<StoreWithMapping[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [isLoadingStores, setIsLoadingStores] = useState(true)

  // Categories
  const [categories, setCategories] = useState<TicketCategoryDto[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  // Tickets
  const [tickets, setTickets] = useState<TicketResponseDto[]>([])
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)
  const [ticketsError, setTicketsError] = useState<string | null>(null)

  // Date range filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Tab state
  const [activeTab, setActiveTab] = useState<'raised' | 'assigned'>('raised')

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'acknowledged' | 'in-progress' | 'on-hold' | 'resolved' | 'closed' | 'reopened' | 'rejected'>('all')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // View mode state (grid or list)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Fetch assigned stores on mount
  useEffect(() => {
    let cancelled = false
    const fetchStores = async () => {
      if (!user) return
      setIsLoadingStores(true)
      try {
        const response = await onboardingService.getUserStores(user.userId)
        if (!cancelled) {
          const activeStores = response.stores.filter(s => s.mapping.isActive)
          setStores(activeStores)
          /* if (activeStores.length > 0) {
            setSelectedStoreId(activeStores[0].store.storeId)
          } */
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoadingStores(false)
      }
    }
    fetchStores()
    return () => { cancelled = true }
  }, [user])

  // Fetch ticket categories
  useEffect(() => {
    let cancelled = false
    const fetchCategories = async () => {
      try {
        const response = await ticketService.getTicketCategories()
        if (!cancelled && response.data) {
          setCategories(response.data)
        }
      } catch {
        // ignore
      }
    }
    fetchCategories()
    return () => { cancelled = true }
  }, [])

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    if (!user) return
    setIsLoadingTickets(true)
    setTicketsError(null)

    try {
      const filters: TicketFilterParams = {
        ...(activeTab === 'raised' ? { createdBy: user.userId } : { assignedTo: user.userId }),
      }
      if (selectedStoreId) filters.storeId = selectedStoreId
      if (selectedCategoryId) filters.ticketCategoryId = selectedCategoryId
      if (dateFrom) filters.createdFrom = dateFrom
      if (dateTo) filters.createdTo = dateTo

      const response = await ticketService.getTickets(filters)
      setTickets(response.data || [])
    } catch (err) {
      setTicketsError(err instanceof Error ? err.message : 'Failed to fetch tickets')
    } finally {
      setIsLoadingTickets(false)
    }
  }, [user, activeTab, selectedStoreId, selectedCategoryId, dateFrom, dateTo])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const getStatusColor = (status: string) => TICKET_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  const getStatusLabel = (status: string) => TICKET_STATUS_LABELS[status] || status

  // Check if SLA is breached
  const isSlaBreached = (slaDueAt?: string, status?: string) => {
    if (!slaDueAt || status === 'CLOSED' || status === 'RESOLVED' || status === 'REJECTED') return false
    return new Date(slaDueAt) < new Date()
  }

  // Render store selector
  const renderStoreSelector = () => {
    if (isLoadingStores) return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
    if (stores.length === 0) return <p className="text-muted-foreground text-sm">No active stores assigned.</p>

    return (
      <select
        value={selectedStoreId ?? ''}
        onChange={(e) => setSelectedStoreId(Number(e.target.value))}
        className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        <option value="">All Stores</option>
        {stores.map(({ store }) => (
          <option key={store.storeId} value={store.storeId}>
            {store.storeName} ({store.storeCode})
          </option>
        ))}
      </select>
    )
  }

  // Filter tickets by status and search
  const filteredTickets = tickets.filter(ticket => {
    // Status filter
    if (statusFilter !== 'all') {
      const statusMap: Record<string, string[]> = {
        'open': ['OPEN'],
        'acknowledged': ['ACKNOWLEDGED'],
        'in-progress': ['IN_PROGRESS'],
        'on-hold': ['ON_HOLD'],
        'resolved': ['RESOLVED'],
        'closed': ['CLOSED'],
        'reopened': ['REOPENED'],
        'rejected': ['REJECTED']
      }
      if (!statusMap[statusFilter].includes(ticket.status)) {
        return false
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const searchFields = [
        ticket.ticketNumber,
        ticket.title,
        ticket.description,
        ticket.store?.storeName,
        ticket.ticketCategory?.categoryName,
        ticket.assignedToUser?.userName
      ].filter(Boolean)

      return searchFields.some(field => field?.toLowerCase().includes(query))
    }

    return true
  })

  // Render tabs
  const renderTabs = () => (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold">Tickets</h1>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Tab buttons */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab('raised')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'raised'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Raised By Me
          </button>
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'assigned'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Assigned To Me
          </button>
        </div>
      </div>
    </div>
  )

  // Render filters
  const renderFilters = () => (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-3">Advanced Filters</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Store</label>
          {renderStoreSelector()}
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Category</label>
          <select
            value={selectedCategoryId ?? ''}
            onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
            className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Categories</option>
            {categories.filter(c => c.isActive).map(cat => (
              <option key={cat.ticketCategoryId} value={cat.ticketCategoryId}>
                {cat.categoryName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full p-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>
    </div>
  )

  // Render ticket card - List view
  const renderTicketCardList = (ticket: TicketResponseDto) => {
    const breached = isSlaBreached(ticket.slaDueAt, ticket.status)

    return (
      <button
        key={ticket.ticketId}
        onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
        className="w-full text-left border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow hover:border-primary/30 group"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-muted-foreground">Ticket ID:</span>
              <span className="text-sm font-semibold text-primary">{ticket.ticketNumber}</span>
              {breached && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 ml-2">SLA Breached</span>
              )}
            </div>
            <h3 className="font-semibold text-foreground text-base">{ticket.title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
              {getStatusLabel(ticket.status)}
            </span>
            <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {ticket.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{ticket.description}</p>
        )}

        {ticket.store && (
          <div className="flex items-center gap-1.5 mb-2 text-sm">
            <span className="text-muted-foreground text-xs">Store:</span>
            <span className="font-medium text-foreground">{ticket.store.storeName}</span>
          </div>
        )}


        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
          {ticket.ticketCategory && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Category:</span>
              <span className="font-medium text-foreground">{ticket.ticketCategory.categoryName}</span>
            </div>
          )}
          {ticket.priority && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground text-xs">Priority:</span>
              <span className={`font-medium text-foreground`}>{ticket.priority}</span>
            </div>
          )}
          {ticket.severity && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground text-xs">Severity:</span>
              <span className={`font-medium text-foreground`}>{ticket.severity}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground text-xs">Raised On:</span>
            <span className="font-medium text-foreground">{formatDate(ticket.createdAt)}</span>
          </div>
          {ticket.assignedToUser && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground text-xs">Assigned To:</span>
              <span className="font-medium text-foreground">{ticket.assignedToUser.userName}</span>
            </div>
          )}
        </div>
      </button>
    )
  }

  // Render ticket card - Grid view
  const renderTicketCardGrid = (ticket: TicketResponseDto) => {
    const breached = isSlaBreached(ticket.slaDueAt, ticket.status)

    return (
      <button
        key={ticket.ticketId}
        onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
        className="w-full text-left border border-border rounded-lg p-4 bg-card hover:shadow-lg transition-all hover:border-primary/30 group h-full flex flex-col"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm text-muted-foreground">ID:</span>
              <span className="text-sm font-semibold text-primary">{ticket.ticketNumber}</span>
            </div>
            <h3 className="font-semibold text-foreground text-md line-clamp-2">{ticket.title}</h3>
          </div>
          <span className={`px-2 py-0.5 text-[12px] font-medium rounded-full shrink-0 ${getStatusColor(ticket.status)}`}>
            {getStatusLabel(ticket.status)}
          </span>
        </div>

        {ticket.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">{ticket.description}</p>
        )}

        {breached && (
          <div className="mb-2">
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-800">SLA Breached</span>
          </div>
        )}

        <div className="space-y-1.5 text-xs">
          {ticket.store && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Store:</span>
              <span className="font-medium text-foreground text-right truncate">{ticket.store.storeName}</span>
            </div>
          )}
          {ticket.ticketCategory && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium text-foreground text-right truncate">{ticket.ticketCategory.categoryName}</span>
            </div>
          )}
          {ticket.priority && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Priority:</span>
              <span className={`font-medium text-foreground text-right truncate`}>{ticket.priority}</span>
            </div>
          )}
          {ticket.severity && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Severity:</span>
              <span className={`font-medium text-foreground text-right truncate`}>{ticket.severity}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Raised On:</span>
            <span className="font-medium text-foreground text-right">{formatDate(ticket.createdAt)}</span>
          </div>
          {ticket.assignedToUser && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Assigned:</span>
              <span className="font-medium text-foreground text-right truncate">{ticket.assignedToUser.userName}</span>
            </div>
          )}
        </div>
      </button>
    )
  }

  // Render ticket card (chooses based on view mode)
  const renderTicketCard = (ticket: TicketResponseDto) => {
    return viewMode === 'grid' ? renderTicketCardGrid(ticket) : renderTicketCardList(ticket)
  }

  // Render ticket list
  const renderTicketList = () => {
    if (isLoadingTickets) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (ticketsError) {
      return (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{ticketsError}</p>
        </div>
      )
    }

    return (
      <>
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
            {/* Status filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter:</span>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="appearance-none pl-3 pr-8 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in-progress">In Progress</option>
                  <option value="on-hold">On Hold</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="reopened">Reopened</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-48"
              />
            </div>

            {/* View mode toggle */}
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md transition-colors ${viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md transition-colors ${viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            {activeTab === 'raised' && (
              <button
                onClick={() => navigate('/tickets/create')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                + New Ticket
              </button>
            )}
          </div>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTickets.map(renderTicketCard)}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map(renderTicketCard)}
            </div>
          )}
        </div>
        {filteredTickets.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🎫</div>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'No tickets match your filters.'
                : activeTab === 'raised'
                  ? 'You haven\'t raised any tickets yet.'
                  : 'No tickets have been assigned to you.'}
            </p>
            {activeTab === 'raised' && (
              <button
                onClick={() => navigate('/tickets/create')}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create New Ticket
              </button>
            )}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      {renderTabs()}
      {renderFilters()}
      {renderTicketList()}
    </div>
  )
}

export default TicketList