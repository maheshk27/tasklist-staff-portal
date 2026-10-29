import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  User as UserIcon,
  Mail,
  Clock,
  AlertTriangle,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { onboardingService } from '../services/apiManager'
import { authService } from '../services/auth'
import type { User } from '../types/auth'
import UserStoreList from '../components/UserStoreList'
import PageHeader from '../components/PageHeader'
import { formatDateTime } from '../utils/date'

// Reusable read-only key-value pair component
interface InfoRowProps {
  label: string
  value: React.ReactNode
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-border last:border-b-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value || '-'}</span>
  </div>
)

// Card section wrapper with icon header
interface InfoCardProps {
  icon: LucideIcon
  iconBg?: string
  title: string
  subtitle?: string
  children: React.ReactNode
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, iconBg = 'bg-primary/10', title, subtitle, children }) => (
  <div className="bg-card p-6 rounded-xl border border-border">
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
)

const Profile: React.FC = () => {
  const { user: authUser } = useAuth()

  // Profile state - fetch fresh data from API
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Fetch user profile on mount
  useEffect(() => {
    let cancelled = false

    const fetchProfile = async () => {
      setProfileLoading(true)
      setProfileError(null)

      try {
        const user = await onboardingService.getCurrentUser()
        if (!cancelled) {
          if (user) {
            setUserProfile(user)
          } else {
            // Fallback to token-based profile
            const tokenUser = await authService.getCurrentUser()
            setUserProfile(tokenUser)
          }
        }
      } catch {
        if (!cancelled) {
          setProfileError('Failed to load profile')
          // Fallback to token-based profile
          const tokenUser = await authService.getCurrentUser()
          setUserProfile(tokenUser)
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false)
        }
      }
    }

    fetchProfile()
    return () => { cancelled = true }
  }, [])

  // Use profile from API, fallback to auth context user
  const user = userProfile || authUser
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '-'

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="View your account details"
      />

      {profileError && !user ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-destructive/30 bg-card px-6 py-20 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-9 w-9 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Error Loading Profile</h2>
          <p className="mt-2 max-w-2xl text-md text-muted-foreground">
            {profileError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : !user ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card px-6 py-20 text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <UserIcon className="h-9 w-9 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Profile Not Found</h2>
          <p className="mt-2 max-w-2xl text-md text-muted-foreground">
            Unable to load your profile information.
          </p>
        </div>
      ) : (
        <>
          {/* Profile Header */}
          <div className="bg-card p-8 rounded-xl border border-border">
            <div className="flex items-center gap-6">
              <div className="hidden md:flex w-24 h-24 bg-primary/10 rounded-xl items-center justify-center">
                <UserIcon className="h-12 w-12 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground truncate">
                  {fullName}
                </h2>
                <p className="text-muted-foreground mt-1 truncate">
                  {user.emailId || '-'}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    {user.role?.roleName || '-'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                    }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Information Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Information */}
            <InfoCard
              icon={Mail}
              title="Contact Information"
              subtitle="Your contact details"
              iconBg="bg-blue-100"
            >
              <div className="space-y-0">
                <InfoRow label="First Name" value={user.firstName || '-'} />
                <InfoRow label="Last Name" value={user.lastName || '-'} />
                <InfoRow label="Email" value={user.emailId || 'Not provided'} />
                <InfoRow label="Mobile" value={user.mobile || 'Not provided'} />
                <InfoRow label="Role" value={user.role?.roleName || '-'} />
              </div>
            </InfoCard>

            {/* Account Details */}
            <InfoCard
              icon={Clock}
              title="Account Details"
              subtitle="Account status and timestamps"
              iconBg="bg-purple-100"
            >
              <div className="space-y-0">
                <InfoRow label="Username" value={user.userName || '-'} />
                <InfoRow
                  label="Status"
                  value={user.isActive ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 font-medium">Inactive</span>
                  )}
                />
                {user.createdAt && (
                  <InfoRow
                    label="Created At"
                    value={formatDateTime(user.createdAt)}
                  />
                )}
                {user.updatedAt && (
                  <InfoRow
                    label="Last Updated"
                    value={formatDateTime(user.updatedAt)}
                  />
                )}
              </div>
            </InfoCard>
          </div>

          {/* User Store List */}
          {user && <UserStoreList userId={user.userId} />}
        </>
      )}
    </div>
  )
}

export default Profile