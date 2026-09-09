import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Ticket,
  CheckSquare,
  FileText,
  Bell,
  LogOut,
  Menu,
  Sun,
  Moon,
  ChevronDown,
  Settings,
  User,
  Eye,
  Lock
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import { useTheme } from '../../hooks/useTheme'
import { notificationService } from '../../services/apiManager'
import type { NotificationLog } from '../../types/notification'
import PWAInstallPrompt from '../PWAInstallPrompt'

interface LayoutProps {
  children: React.ReactNode
}

interface MenuItem {
  title: string
  icon: React.ElementType
  path?: string
  children?: MenuItem[]
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { permission, messagingSupported, requestPermission } = useNotifications()
  const { theme, toggleTheme } = useTheme()
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Notification bell / panel state
  const [notifications, setNotifications] = useState<NotificationLog[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false)
  const bellButtonRef = useRef<HTMLButtonElement>(null)
  const notificationPanelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.isRead).length

  useEffect(() => {
    if (!user?.userId) return
    fetchNotifications()
  }, [user?.userId])

  const fetchNotifications = async () => {
    if (!user?.userId) return
    setNotificationsLoading(true)
    setNotificationError(null)
    try {
      const data = await notificationService.getUserNotifications(user.userId, 1, 30)
      setNotifications(data)
    } catch (err) {
      setNotificationError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setNotificationsLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationService.markNotificationAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n =>
          n.notificationId === notificationId ? { ...n, isRead: true } : n,
        ),
      )
    } catch (err) {
      setNotificationError(err instanceof Error ? err.message : 'Failed to mark notification as read')
    }
  }

  const handleOpenNotification = (notification: NotificationLog) => {
    setIsNotificationPanelOpen(false)
    if (!notification.isRead) {
      handleMarkAsRead(notification.notificationId)
    }
    const screenPath = notification.screenPath
    if (screenPath && screenPath.startsWith('/')) {
      navigate(screenPath)
    }
  }

  useEffect(() => {
    if (!isNotificationPanelOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(event.target as Node) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(event.target as Node)
      ) {
        setIsNotificationPanelOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsNotificationPanelOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isNotificationPanelOpen])

  useEffect(() => {
    if (!messagingSupported) return
    if (permission !== 'default') return
    const timer = setTimeout(() => {
      requestPermission()
    }, 1500)
    return () => clearTimeout(timer)
  }, [permission, messagingSupported, requestPermission])

  const menuItems: MenuItem[] = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { title: 'My Tasks', icon: CheckSquare, path: '/my-tasks' },
    { title: 'Team Tasks', icon: CheckSquare, path: '/team-tasks' },
    { title: 'Daily Survey', icon: FileText, path: '/survey' },
    { title: 'Tickets', icon: Ticket, path: '/tickets' },
    {
      title: 'My Account',
      icon: User,
      children: [
        { title: 'Profile', icon: User, path: '/profile' },
        { title: 'Settings', icon: Settings, path: '/settings' },
        { title: 'Change Password', icon: Lock, path: '/change-password' },
        { title: 'Login Logs', icon: Eye, path: '/login-logs' },
      ]
    }
  ]

  const filteredMenuItems = menuItems.filter(item => {
    if (item.title === 'Team Tasks') {
      return user?.role?.roleName?.toUpperCase() === 'AREA MANAGER (AM)' ||
        user?.role?.roleName?.toUpperCase() === 'BRANCH MANAGER (BM)' ||
        user?.role?.roleName?.toUpperCase() === 'GENERAL MANAGER OPERATIONS (GM)'
    }
    return true
  })

  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())

  const isActivePath = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname === path
  }

  const isMenuActive = (menuItem: MenuItem) => {
    if (menuItem.children) {
      return menuItem.children.some(child => isActivePath(child.path || ''))
    }
    return isActivePath(menuItem.path || '')
  }

  const toggleMenu = (title: string) => {
    const newExpandedMenus = new Set(expandedMenus)
    if (newExpandedMenus.has(title)) {
      newExpandedMenus.delete(title)
    } else {
      newExpandedMenus.add(title)
    }
    setExpandedMenus(newExpandedMenus)
  }

  const showLabels = !collapsed || isSidebarOpen
  const avatarText = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '')).toUpperCase() || 'U'
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : 'User'
  const roleName = user?.role?.roleName || 'Staff'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-lg">
        <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCollapsed(c => !c)}
              className="hidden h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:inline-flex"
              aria-label="Toggle sidebar"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/dashboard" className="ml-1 flex items-center gap-3">
              <img src="/rk-logo.png" alt="RK BAZAAR" className="h-9 w-auto" />
            </Link>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <div className="relative">
              <button
                ref={bellButtonRef}
                onClick={() => {
                  setIsNotificationPanelOpen(prev => !prev)
                  if (!isNotificationPanelOpen) {
                    fetchNotifications()
                  }
                }}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {isNotificationPanelOpen && (
                <div
                  ref={notificationPanelRef}
                  className="absolute right-0 z-40 mt-2 w-80 md:w-96 bg-popover/95 border border-border rounded-2xl shadow-xl backdrop-blur overflow-hidden"
                >
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Notifications</h3>
                    <button onClick={() => setIsNotificationPanelOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  {notificationsLoading ? (
                    <div className="p-4 text-center"><p className="text-sm text-muted-foreground">Loading...</p></div>
                  ) : notificationError ? (
                    <div className="p-4 text-center"><p className="text-sm text-destructive">{notificationError}</p></div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-10"><Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No notifications</p></div>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.notificationId} className={`p-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${notification.isRead ? 'opacity-60' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <button type="button" onClick={() => handleOpenNotification(notification)} className="min-w-0 flex-1 text-left">
                            <p className="text-sm font-medium text-foreground truncate">{notification.title || 'Notification'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.body || ''}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}</p>
                          </button>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1 mt-2">
                          <button type="button" onClick={() => handleOpenNotification(notification)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0-8.268-2.943-9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            View
                          </button>
                          {!notification.isRead && (
                            <button type="button" onClick={() => handleMarkAsRead(notification.notificationId)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="relative ml-1">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-muted"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground shadow-sm">{avatarText}</span>
                <span className="hidden text-left md:block">
                  <span className="block text-sm font-semibold leading-tight">{fullName}</span>
                  <span className="block text-[11px] leading-tight text-muted-foreground">{roleName}</span>
                </span>
                <ChevronDown className={`hidden h-4 w-4 text-muted-foreground transition-transform md:block ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-60 rounded-2xl border border-border bg-popover/95 p-1.5 shadow-xl backdrop-blur">
                  <div className="mb-1 border-b border-border px-3 py-2.5">
                    <p className="text-sm font-semibold">{fullName}</p>
                    <p className="text-xs text-muted-foreground">{roleName}</p>
                  </div>
                  <button onClick={() => { setUserMenuOpen(false); setShowLogoutConfirm(true) }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'w-[72px]' : 'w-72'}`}>
          <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-2 py-4' : 'px-3 py-4'}`}>
            <div className="space-y-1">
              {filteredMenuItems.map(item => {
                const Icon = item.icon
                const active = isMenuActive(item)
                const expanded = item.children ? expandedMenus.has(item.title) : false
                if (!item.children) {
                  return (
                    <div key={item.title} className="relative group">
                      <Link to={item.path!} onClick={() => setIsSidebarOpen(false)} title={!showLabels ? item.title : undefined} className={`flex w-full items-center rounded-xl py-2 transition-colors ${!showLabels ? 'justify-center' : ''} ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                        <span className={`flex items-center ${showLabels ? 'gap-3' : ''}`}>
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? 'bg-primary/15 text-primary' : 'bg-muted/70 text-muted-foreground'}`}><Icon className="h-5 w-5" /></span>
                          {showLabels && <span className="text-sm font-medium">{item.title}</span>}
                        </span>
                      </Link>
                      {!showLabels && <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 lg:block">{item.title}</span>}
                    </div>
                  )
                }
                return (
                  <div key={item.title} className="relative group">
                    <button onClick={() => { if (!showLabels) { setCollapsed(false); setExpandedMenus(prev => new Set(prev).add(item.title)) } else { toggleMenu(item.title) } }} title={!showLabels ? item.title : undefined} className={`flex w-full items-center rounded-xl py-2 transition-colors ${!showLabels ? 'justify-center' : 'justify-between pr-2'} ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                      <span className={`flex items-center ${showLabels ? 'gap-3' : ''}`}>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? 'bg-primary/15 text-primary' : 'bg-muted/70 text-muted-foreground'}`}><Icon className="h-5 w-5" /></span>
                        {showLabels && <span className="text-sm font-medium">{item.title}</span>}
                      </span>
                      {showLabels && <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />}
                    </button>
                    {showLabels && expanded && item.children && (
                      <div className="ml-5 mt-1 space-y-1 border-l border-border pl-3">
                        {item.children.map(child => {
                          const ChildIcon = child.icon
                          const childActive = isActivePath(child.path || '')
                          return (
                            <Link key={child.title} to={child.path!} onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 rounded-lg py-2 pl-2 pr-3 text-sm transition-colors ${childActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                              <ChildIcon className="h-4 w-4 shrink-0" />
                              <span className="flex-1">{child.title}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                    {!showLabels && <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 lg:block">{item.title}</span>}
                  </div>
                )
              })}
            </div>
          </nav>
          {showLabels ? (
            <div className="shrink-0 border-t border-border p-3">
              <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">{avatarText}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">{fullName}</p>
                  <p className="truncate text-xs text-muted-foreground leading-tight">{roleName}</p>
                </div>
                <button onClick={() => setShowLogoutConfirm(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-destructive transition-colors hover:bg-destructive/10" title="Logout"><LogOut className="h-4 w-4" /></button>
              </div>
            </div>
          ) : (
            <div className="shrink-0 border-t border-border p-3">
              <div className="flex flex-col items-center gap-1.5">
                <button onClick={() => setShowLogoutConfirm(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground shadow-sm" title="Logout">{avatarText}</button>
              </div>
            </div>
          )}
        </aside>
        {isSidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
        <main className="min-h-[calc(100vh-64px)] min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-8xl">{children}</div>
        </main>
      </div>
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-popover p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><LogOut className="h-6 w-6" /></div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-foreground">Confirm Logout</h3>
                <p className="mt-1 text-sm text-muted-foreground">Are you sure you want to log out of your account?</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">Cancel</button>
              <button onClick={() => { setShowLogoutConfirm(false); logout() }} className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90">Log out</button>
            </div>
          </div>
        </div>
      )}
      <PWAInstallPrompt />
    </div>
  )
}

export default Layout
