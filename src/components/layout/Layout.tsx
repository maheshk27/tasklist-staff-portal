import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

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
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const menuItems: MenuItem[] = [
    { title: 'Dashboard', icon: '📊', path: '/dashboard' },
    {
      title: 'My Account',
      icon: '👤',
      children: [
        { title: 'Profile', icon: '👤', path: '/profile' },
        { title: 'Change Password', icon: '🔑', path: '/change-password' },
      ]
    },
    { title: 'My Tasks', icon: '📋', path: '/my-tasks' }
  ]

  // State for expanded menu items
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())

  const isActivePath = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(path)
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
            <Link to="/" className="flex items-center gap-3">
              <img src="/rk-logo.png" alt="RK BAZAAR" className="h-12 w-auto" />
            </Link>
          </div>
          
          {/* Center Section: Staff Portal */}
          <div className="flex-1 flex justify-center">
            <div className="hidden md:block">
              <div className="text-lg text-muted-foreground">Staff Portal</div>
            </div>
          </div>
          
          {/* Right Section: User Profile & Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                {user?.firstName?.[0] || 'U'}
              </div>
              <div className="flex flex-col">
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
        <aside className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed md:relative md:translate-x-0 z-30 w-80 h-[calc(100vh-73px)] bg-card border-r border-border transition-transform duration-300 ease-in-out md:block`}>
          {/* Navigation Menu */}
          <nav className="p-4">
            <div className="space-y-1">
              {menuItems.map((item, index) => (
                <div key={index}>
                  {item.children ? (
                    // Parent menu item with children
                    <div>
                      <button
                        onClick={() => toggleMenu(item.title)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center justify-between ${
                          isMenuActive(item) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg">
                            {item.icon}
                          </div>
                          <span className="font-medium text-sm">{item.title}</span>
                        </div>
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${
                            expandedMenus.has(item.title) ? 'rotate-180' : ''
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
                            <button
                              key={childIndex}
                              onClick={() => {
                                navigate(child.path!)
                                setIsSidebarOpen(false)
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                                isActivePath(child.path || '')
                                  ? 'bg-primary/10 text-primary'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <span className="text-lg">{child.icon}</span>
                              <span className="text-sm">{child.title}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Single menu item without children
                    <button
                      onClick={() => {
                        navigate(item.path!)
                        setIsSidebarOpen(false)
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center gap-3 ${
                        isActivePath(item.path || '')
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg">
                        {item.icon}
                      </div>
                      <span className="font-medium text-sm">{item.title}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">RK BAZAAR v1.0</p>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-73px)] p-6">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
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
    </div>
  )
}

export default Layout