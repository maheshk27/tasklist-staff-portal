import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { CheckSquare, Ticket, FileText, User, Settings, type LucideIcon } from 'lucide-react'

/** Quick action links configuration for the dashboard.
 *  Add or modify entries here to update the Quick Links section. */
interface QuickLink {
  to: string
  icon: LucideIcon
  label: string
  show?: boolean
}

const Dashboard: React.FC = () => {
  const { user } = useAuth()

  // Determine if Team Tasks should be shown (same condition as sidebar)
  const showTeamTasks = user?.role?.roleName?.toUpperCase() === 'AREA MANAGER (AM)' ||
    user?.role?.roleName?.toUpperCase() === 'BRANCH MANAGER (BM)' ||
    user?.role?.roleName?.toUpperCase() === 'GENERAL MANAGER OPERATIONS (GM)'

  // Quick links configuration
  const quickLinks: QuickLink[] = [
    { to: '/my-tasks', icon: CheckSquare, label: 'My Tasks', show: true },
    { to: '/team-tasks', icon: CheckSquare, label: 'Team Tasks', show: showTeamTasks },
    { to: '/tickets', icon: Ticket, label: 'Tickets', show: true },
    { to: '/survey', icon: FileText, label: 'Daily Survey', show: true },
    { to: '/profile', icon: User, label: 'Profile', show: true },
    { to: '/settings', icon: Settings, label: 'Settings', show: true },
  ]

  // Filter links based on show condition
  const visibleLinks = quickLinks.filter(link => link.show !== false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user?.firstName}!</h1>
        <p className="text-muted-foreground mt-2">Here's what's happening today</p>
      </div>

      {/* Quick Links */}
      <div className="bg-card p-6 rounded-xl border border-border">
        <h3 className="text-md font-semibold mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {visibleLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                className="p-4 rounded-xl border border-border hover:shadow-lg transition-shadow text-center hover:bg-muted/50"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">{link.label}</p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Dashboard