import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { onboardingService, ticketService } from '../../../services/apiManager'
import type { TicketResponseDto, TicketCategoryDto, TicketFilterParams } from '../../../types/ticket'
import type { StoreWithMapping } from '../../../types/user-store'
import { formatDateTime } from '../../../utils/date'
import { Search, ChevronDown } from 'lucide-react'

// ── Status constants ────────────────────────────────────────────────────────

const ALL_TICKET_STATUSES = [
  'OPEN',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'ON_HOLD',
  'RESOLVED',
  'CLOSED',
  'REOPENED'
] as const

type TicketStatus = (typeof ALL_TICKET_STATUSES)[number]

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

const TICKET_BOARD_BG: Record<string, string> = {
  OPEN: 'border-blue-200 bg-blue-50/50',
  ACKNOWLEDGED: 'border-yellow-200 bg-yellow-50/50',
  IN_PROGRESS: 'border-indigo-200 bg-indigo-50/50',
  ON_HOLD: 'border-orange-200 bg-orange-50/50',
  RESOLVED: 'border-green-200 bg-green-50/50',
  CLOSED: 'border-gray-200 bg-gray-50/50',
  REOPENED: 'border-purple-200 bg-purple-50/50',
}

const TICKET_BOARD_HEADER: Record<string, string> = {
  OPEN: 'border-blue-200 bg-blue-100',
  ACKNOWLEDGED: 'border-yellow-200 bg-yellow-100',
  IN_PROGRESS: 'border-indigo-200 bg-indigo-100',
  ON_HOLD: 'border-orange-200 bg-orange-100',
  RESOLVED: 'border-green-200 bg-green-100',
  CLOSED: 'border-gray-200 bg-gray-100',
  REOPENED: 'border-purple-200 bg-purple-100',
}

type LayoutType = 'card' | 'board'

// ── Helper ──────────────────────────────────────────────────────────────────

const getUserDisplayName = (user?: { userId: number; userName: string; firstName: string; lastName: string }) => {
  if (!user) return null
  return `${user.firstName} ${user.lastName}`.trim() || user.userName
}

// ── Component ───────────────────────────────────────────────────────────────

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

  // Layout toggle
  const [layout, setLayout] = useState<LayoutType>('card')

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    const fetchStores = async () => {
      if (!user) return
      setIsLoadingStores(true)
      try {
        const response = await onboardingService.getUserStores(user.userId)
        if (!cancelled) {
          setStores(response.stores.filter(s => s.mapping.isActive))
        }
      } catch { /* ignore */ } finally {
        if (!cancelled) setIsLoadingStores(false)
      }
    }
    fetchStores()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    let cancelled = false
    const fetchCategories = async () => {
      try {
        const response = await ticketService.getTicketCategories()
        if (!cancelled && response.data) setCategories(response.data)
      } catch { /* ignore */ }
    }
    fetchCategories()
    return () => { cancelled = true }
  }, [])

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

  useEffect(() => { fetchTickets() }, [fetchTickets])

  // ── Derived data ──────────────────────────────────────────────────────────

  const getStatusColor = (status: string) => TICKET_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
  const getStatusLabel = (status: string) => TICKET_STATUS_LABELS[status] || status

  const isSlaBreached = (slaDueAt?: string, status?: string) => {
    if (!slaDueAt || status === 'CLOSED' || status === 'RESOLVED' || status === 'REJECTED') return false
    return new Date(slaDueAt) < new Date()
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      if (statusFilter !== 'all') {
        const statusMap: Record<string, string[]> = {
          'open': ['OPEN'], 'acknowledged': ['ACKNOWLEDGED'], 'in-progress': ['IN_PROGRESS'],
          'on-hold': ['ON_HOLD'], 'resolved': ['RESOLVED'], 'closed': ['CLOSED'],
          'reopened': ['REOPENED'], 'rejected': ['REJECTED'],
        }
        if (!statusMap[statusFilter]?.includes(ticket.status)) return false
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const fields = [ticket.ticketNumber, ticket.title, ticket.description, ticket.store?.storeName, ticket.ticketCategory?.categoryName, ticket.assignedToUser?.userName].filter(Boolean)
        return fields.some(f => f?.toLowerCase().includes(q))
      }
      return true
    })
  }, [tickets, statusFilter, searchQuery])

  const ticketsByStatus = useMemo(() => {
    return ALL_TICKET_STATUSES.reduce<Record<TicketStatus, TicketResponseDto[]>>((acc, s) => {
      acc[s] = filteredTickets.filter(t => t.status === s)
      return acc
    }, {} as Record<TicketStatus, TicketResponseDto[]>)
  }, [filteredTickets])

  const statusCounts = useMemo(() => {
    return ALL_TICKET_STATUSES.reduce<Record<string, number>>((acc, s) => {
      acc[s] = ticketsByStatus[s]?.length || 0
      return acc
    }, {} as Record<string, number>)
  }, [ticketsByStatus])

  // ── Render helpers ────────────────────────────────────────────────────────

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
          <option key={store.storeId} value={store.storeId}>{store.storeName} ({store.storeCode})</option>
        ))}
      </select>
    )
  }

  // ── Ticket card (used in both card & board views) ─────────────────────────

  const renderTicketCard = (ticket: TicketResponseDto, compact = false) => {
    const breached = isSlaBreached(ticket.slaDueAt, ticket.status)
    if (compact) {
      return (
        <button
          key={ticket.ticketId}
          onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
          className="w-full text-left p-3 bg-card rounded-lg border border-border hover:shadow-md transition-shadow hover:border-primary/30"
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-primary truncate">{ticket.ticketNumber}</span>
            {breached && <span className="px-1 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-800 shrink-0">SLA</span>}
          </div>
          <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">{ticket.title}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {ticket.store && <span className="truncate">{ticket.store.storeName}</span>}
            {ticket.priority && <span className="shrink-0 ml-2">{ticket.priority}</span>}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
            <span>{formatDateTime(ticket.createdAt)}</span>
            {ticket.assignedToUser && <span className="truncate ml-2">{getUserDisplayName(ticket.assignedToUser)}</span>}
          </div>
        </button>
      )
    }
    // Full card
    return (
      <button
        key={ticket.ticketId}
        onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
        className="w-full text-left border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow hover:border-primary/30 group"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-primary">{ticket.ticketNumber}</span>
              {breached && <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 ml-2 hidden md:inline">SLA Breached</span>}
            </div>
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
        <h3 className="font-semibold text-foreground text-base mb-3">{ticket.title}</h3>
        {/* {ticket.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{ticket.description}</p>} */}
        {ticket.store && (
          <div className="flex items-center gap-1.5 mb-2 text-sm">
            <span className="text-muted-foreground text-xs">Store:</span>
            <span className="font-medium text-foreground">{ticket.store.storeName}</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {ticket.ticketCategory && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">Category:</span>
              <span className="font-medium text-foreground">{ticket.ticketCategory.categoryName}</span>
            </div>
          )}
          {ticket.priority && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground text-xs">Priority:</span>
              <span className="font-medium text-foreground">{ticket.priority}</span>
            </div>
          )}
          {ticket.severity && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground text-xs">Severity:</span>
              <span className="font-medium text-foreground">{ticket.severity}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground text-xs">Raised On:</span>
            <span className="font-medium text-foreground">{formatDateTime(ticket.createdAt)}</span>
          </div>
          {ticket.assignedToUser && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground text-xs">Assigned To:</span>
              <span className="font-medium text-foreground">{getUserDisplayName(ticket.assignedToUser)}</span>
            </div>
          )}
          {breached && (
            <div className="flex items-center gap-1.5 text-sm md:hidden">
              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">SLA Breached</span>
            </div>
          )}
        </div>
      </button>
    )
  }

  // ── Tab bar ───────────────────────────────────────────────────────────────

  const renderTabs = () => (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <h1 className="text-3xl font-bold">Tickets</h1>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab('raised')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'raised' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Raised By Me
          </button>
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'assigned' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Assigned To Me
          </button>
        </div>
      </div>
    </div>
  )

  // ── Filters ───────────────────────────────────────────────────────────────

  const renderFilters = () => (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold mb-3">Advanced Filters</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <option key={cat.ticketCategoryId} value={cat.ticketCategoryId}>{cat.categoryName}</option>
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
        {/* Layout toggle */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">View</label>
          <div className="flex border border-border rounded-lg overflow-hidden h-[38px]">
            <button
              onClick={() => setLayout('board')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors flex-1 ${layout === 'board' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Board
            </button>
            <button
              onClick={() => setLayout('card')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors flex-1 ${layout === 'card' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Card
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Status summary ────────────────────────────────────────────────────────

  const renderStatusSummary = () => {
    if (filteredTickets.length === 0) return null
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {ALL_TICKET_STATUSES.map((status) => (
          <div key={status} className={`rounded-lg border p-3 text-center ${TICKET_BOARD_BG[status]}`}>
            <div className="text-2xl font-bold text-foreground">{statusCounts[status] || 0}</div>
            <div className="text-xs font-medium text-muted-foreground mt-0.5">{TICKET_STATUS_LABELS[status]}</div>
          </div>
        ))}
      </div>
    )
  }

  // ── Toolbar (search, status filter, new ticket button) ────────────────────

  const renderToolbar = () => (
    <div className="flex items-center gap-4 flex-wrap">
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
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
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
      {activeTab === 'raised' && (
        <button
          onClick={() => navigate('/tickets/create')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          + New Ticket
        </button>
      )}
    </div>
  )

  // ── Empty state ───────────────────────────────────────────────────────────

  const renderEmpty = () => (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">🎫</div>
      <p className="text-muted-foreground">
        {searchQuery || statusFilter !== 'all'
          ? 'No tickets match your filters.'
          : activeTab === 'raised' ? "You haven't raised any tickets yet." : 'No tickets have been assigned to you.'}
      </p>
      {activeTab === 'raised' && (
        <button onClick={() => navigate('/tickets/create')} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          Create New Ticket
        </button>
      )}
    </div>
  )

  // ── Loading / error ───────────────────────────────────────────────────────

  if (isLoadingTickets && tickets.length === 0) {
    return (
      <div className="space-y-6">
        {renderTabs()}
        {renderFilters()}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (ticketsError) {
    return (
      <div className="space-y-6">
        {renderTabs()}
        {renderFilters()}
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{ticketsError}</p>
        </div>
      </div>
    )
  }

  // ── Card layout ───────────────────────────────────────────────────────────

  const renderCardLayout = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filteredTickets.map(t => renderTicketCard(t, false))}
    </div>
  )

  // ── Board layout ──────────────────────────────────────────────────────────

  const renderBoardLayout = () => (
    <div className="overflow-x-auto pb-3" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="flex gap-4" style={{ width: 'max-content', minWidth: '100%' }}>
        {ALL_TICKET_STATUSES.map((status) => {
          const columnTickets = ticketsByStatus[status] || []
          return (
            <div key={status} className={`w-80 shrink-0 rounded-lg border-2 ${TICKET_BOARD_BG[status]} flex flex-col`}>
              <div className={`px-4 py-3 rounded-t-md border-b ${TICKET_BOARD_HEADER[status]} flex items-center justify-between`}>
                <span className="text-sm font-semibold">{TICKET_STATUS_LABELS[status]}</span>
                <span className="text-xs font-bold bg-white/60 rounded-full px-2 py-0.5 ml-2 shrink-0">{columnTickets.length}</span>
              </div>
              <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-400px)]">
                {columnTickets.length === 0 ? (
                  <div className="text-center py-8 text-md text-muted-foreground">No tickets</div>
                ) : (
                  columnTickets.map(t => renderTicketCard(t, true))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {renderTabs()}
      {renderFilters()}

      {/* Status summary */}
      {filteredTickets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Summary</h2>
            <span className="text-sm text-muted-foreground">{filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} total</span>
          </div>
          {renderStatusSummary()}
        </div>
      )}

      {/* Ticket list / board */}
      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {layout === 'card' ? 'Ticket List' : 'Ticket Board'}
            {filteredTickets.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({filteredTickets.length})</span>}
          </h2>
          <div className="flex items-center gap-4">
            {renderToolbar()}
          </div>
        </div>
        <div className={layout === 'board' ? 'p-4 min-w-0 overflow-hidden' : 'p-4'}>
          {filteredTickets.length === 0 ? renderEmpty() : (layout === 'card' ? renderCardLayout() : renderBoardLayout())}
        </div>
      </div>
    </div>
  )
}

export default TicketList