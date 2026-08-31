import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import { notificationService } from '../../services/apiManager'
import type { NotificationLog } from '../../types/notification'
import PWAInstallPrompt from '../PWAInstallPrompt'

interface LayoutProps {
  children: React.ReactNode
}

interface MenuItem {
  title: string
  icon: string
  path?: string
  children?: MenuItem[]
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { permission, messagingSupported, requestPermission } = useNotifications()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /**
   * Open a notification:
   * - marks it as read
   * - navigates to the screenPath (when the path is a valid/known route)
   * - closes the panel
   */
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

  // Close notification panel on outside click / Escape
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

  // Prompt for notification permission after login.
  // Shows the browser dialog every time this layout mounts if permission is still 'default'
  // (i.e. user dismissed it before or hasn't been asked yet).
  // Stops prompting only if user explicitly granted or denied.
  useEffect(() => {
    if (!messagingSupported) return
    if (permission !== 'default') return // 'granted' or 'denied'  stop asking

    const timer = setTimeout(() => {
      requestPermission()
    }, 1500)

    return () => clearTimeout(timer)
  }, [permission, messagingSupported, requestPermission])

  const menuItems: MenuItem[] = [
    { title: 'Dashboard', icon: '📊', path: '/dashboard' },
    { title: 'Tickets', icon: '🎫', path: '/tickets' },
    { title: 'My Tasks', icon: '✅', path: '/my-tasks' },
    { title: 'Team Tasks', icon: '👥', path: '/team-tasks' },
    { title: 'Daily Survey', icon: '📝', path: '/survey' },
    {
      title: 'My Account',
      icon: '👤',
      children: [
        { title: 'Profile', icon: '🙍', path: '/profile' },
        { title: 'Settings', icon: '⚙️', path: '/settings' },
        { title: 'Change Password', icon: '🔒', path: '/change-password' },
        { title: 'Login Logs', icon: '🕐', path: '/login-logs' },
      ]
    }
  ]

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => {
    if (item.title === 'Team Tasks') {
      return user?.role?.roleName?.toUpperCase() === 'AREA MANAGER (AM)' ||
        user?.role?.roleName?.toUpperCase() === 'BRANCH MANAGER (BM)' ||
        user?.role?.roleName?.toUpperCase() === 'GENERAL MANAGER OPERATIONS (GM)'
    }
    return true
  })

  // State for expanded menu items
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())

  const isActivePath = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    //return location.pathname.startsWith(path)
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto px-4 py-4 flex justify-between items-center">
          {/* Left Section: Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-muted"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <img src="/rk-logo.png" alt="RK Bazar" className="h-12 w-auto" />
          </div>

          {/* Right Section: User Profile & Logout */}
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                ref={bellButtonRef}
                onClick={() => {
                  setIsNotificationPanelOpen(prev => !prev)
                  if (!isNotificationPanelOpen) {
                    fetchNotifications()
                  }
                }}
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                title="Notifications"
                aria-label="Notifications"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationPanelOpen && (
                <div
                  ref={notificationPanelRef}
                  className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                >
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Notifications</h3>
                    <button
                      onClick={() => setIsNotificationPanelOpen(false)}
                      className="p-1 rounded-md hover:bg-muted text-muted-foreground"
                      aria-label="Close notifications"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    ) : notificationError ? (
                      <div className="p-4 text-sm text-destructive">{notificationError}</div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="text-3xl mb-2">🔔</div>
                        <p className="text-sm text-muted-foreground">No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.notificationId}
                          className={`p-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${notification.isRead ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenNotification(notification)}
                              className="min-w-0 flex-1 text-left"
                              title={notification.screenPath ? `Open: ${notification.screenPath}` : 'Open notification'}
                            >
                              <p className="text-sm font-medium text-foreground truncate">
                                {notification.title || 'Notification'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {notification.body || ''}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 mt-1">
                                {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ''}
                              </p>
                            </button>
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenNotification(notification)}
                                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                  title="View and open"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View
                                </button>
                                {!notification.isRead && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAsRead(notification.notificationId)}
                                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    title="Mark as read"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Mark as read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                {user?.firstName?.[0] || 'U'}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-sm font-medium">{user?.firstName} {user?.lastName}</span>
                <span className="text-xs text-muted-foreground">{user?.role?.roleName}</span>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="ml-2 p-2 text-destructive rounded-md hover:bg-destructive/10 transition-colors"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 md:relative md:inset-y-auto md:translate-x-0 z-50 w-70 h-screen md:h-[calc(100vh-73px)] bg-card border-r border-border transition-transform duration-300 ease-in-out md:block`}>
          {/* Navigation Menu */}
          <nav className="p-4 flex flex-col h-full">
            {/* Logo at top - mobile only */}
            <div className="mb-6 pb-4 border-b border-border flex justify-center md:hidden">
              <img src="/rk-logo.png" alt="RK Bazar" className="h-12 w-auto" />
            </div>

            {/* Menu items */}
            <div className="space-y-1 flex-1 overflow-y-auto">
              {filteredMenuItems.map((item, index) => (
                <div key={index}>
                  {item.children ? (
                    // Parent menu item with children
                    <div>
                      <button
                        onClick={() => toggleMenu(item.title)}
                        className={`w-full text-left p-1 rounded-lg transition-all duration-200 flex items-center justify-between ${isMenuActive(item) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg">
                            {item.icon}
                          </div>
                          <span className="font-medium text-sm">{item.title}</span>
                        </div>
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${expandedMenus.has(item.title) ? 'rotate-180' : ''
                            }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Child menu items */}
                      {expandedMenus.has(item.title) && (
                        <div className="ml-11 mt-1 space-y-1 border-l-2 border-border pl-4">
                          {item.children.map((child, childIndex) => (
                            <Link
                              key={childIndex}
                              to={child.path!}
                              onClick={() => setIsSidebarOpen(false)}
                              className={`block px-3 py-2 rounded-lg transition-all duration-200 text-sm ${isActivePath(child.path || '')
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                              <span className="flex items-center gap-3">
                                <span className="text-lg">{child.icon}</span>
                                <span>{child.title}</span>
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Single menu item without children
                    <Link
                      to={item.path!}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`block p-1 rounded-lg transition-all duration-200 ${isActivePath(item.path || '')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-lg">
                          {item.icon}
                        </span>
                        <span className="font-medium text-sm">{item.title}</span>
                      </span>
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* User Profile Section at bottom */}
            <div className="pt-4 mt-4 border-t border-border md:hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {user?.firstName?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.role?.roleName}
                  </p>
                </div>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="p-1.5 text-destructive rounded-md hover:bg-destructive/10 transition-colors shrink-0"
                  title="Logout"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-opacity-50 z-40 md:hidden"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 min-h-[calc(100vh-73px)] p-6 overflow-hidden">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Confirm Logout</h3>
                <p className="text-sm text-muted-foreground">Are you sure you want to logout from your account?</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false)
                  logout()
                }}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  )
}

export default Layout
