import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import UserStoreList from '../components/UserStoreList'

const Profile: React.FC = () => {
  const { user } = useAuth()

  const fieldClass = "p-2 border border-border rounded-lg bg-muted text-foreground"
  const labelClass = "block text-sm font-medium mb-2 text-foreground"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Profile</h1>
        <p className="text-muted-foreground mt-2">View your account details</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-4xl text-primary-foreground font-bold">
              {user?.firstName?.[0] || 'U'}
            </div>
          </div>

          {/* Profile Details */}
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>First Name</label>
                <p className={fieldClass}>{user?.firstName || '-'}</p>
              </div>
              <div>
                <label className={labelClass}>Last Name</label>
                <p className={fieldClass}>{user?.lastName || '-'}</p>
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <p className={fieldClass}>{user?.emailId || '-'}</p>
              </div>
              <div>
                <label className={labelClass}>Mobile Number</label>
                <p className={fieldClass}>{user?.mobile || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Username</label>
                <p className={fieldClass}>{user?.userName}</p>
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <p className={fieldClass}>{user?.role?.roleName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {user && <UserStoreList userId={user.userId} />}
    </div>
  )
}

export default Profile