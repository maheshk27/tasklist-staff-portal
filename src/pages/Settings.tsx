import React from 'react'
import toast from 'react-hot-toast'
import { useNotifications } from '../hooks/useNotifications'

const Settings: React.FC = () => {
  const { token, permission, messagingSupported, requestPermission, getFCMToken, disableNotifications } = useNotifications()

  const handleEnableNotifications = async () => {
    try {
      const result = await requestPermission()
      if (result === 'granted') {
        toast.success('Notifications enabled successfully!')
        // Token should be set automatically
      } else {
        toast.error('Notification permission denied')
      }
    } catch (error) {
      toast.error('Failed to enable notifications')
      console.error(error)
    }
  }

  const handleRefreshToken = async () => {
    try {
      await getFCMToken()
      toast.success('Token refreshed')
    } catch (error) {
      toast.error('Failed to refresh token')
      console.error(error)
    }
  }

  const handleDisableNotifications = async () => {
    try {
      await disableNotifications()
    } catch (error) {
      console.error(error)
    }
  }

  const getPermissionStatusText = () => {
    if (permission === 'granted' && !token) {
      return 'Enabled but token not available'
    }
    switch (permission) {
      case 'granted':
        return 'Enabled'
      case 'denied':
        return 'Blocked (change in browser settings)'
      case 'default':
        return 'Not requested'
      default:
        return 'Unknown'
    }
  }

  const getPermissionStatusColor = () => {
    switch (permission) {
      case 'granted':
        return 'text-green-600'
      case 'denied':
        return 'text-red-600'
      case 'default':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your application preferences</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Notifications</h2>

        {!messagingSupported ? (
          <p className="text-red-600">Notifications are not supported in this browser.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Notification Status
                </label>
                <p className={`p-2 border border-border rounded-lg bg-muted ${getPermissionStatusColor()}`}>
                  {getPermissionStatusText()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  FCM Token
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={token || 'No token available'}
                    className="w-full p-2 border border-border rounded-lg bg-muted text-foreground resize-none"
                    rows={3}
                  />
                  {token && (
                    <button
                      onClick={() => navigator.clipboard.writeText(token)}
                      className="absolute top-2 right-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              {permission !== 'granted' && (
                <button
                  onClick={handleEnableNotifications}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
                >
                  Enable Notifications
                </button>
              )}

              {permission === 'granted' && (
                <>
                  <button
                    onClick={handleRefreshToken}
                    className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/80"
                  >
                    Refresh Token
                  </button>
                  <button
                    onClick={handleDisableNotifications}
                    className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:bg-destructive/90"
                  >
                    Disable Notifications
                  </button>
                </>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                Notifications allow you to receive real-time updates about tasks and messages.
                Permission must be granted in your browser for notifications to work.
              </p>
              {permission === 'denied' && (
                <p className="text-red-600 mt-2">
                  Notifications are blocked. Please enable them in your browser settings and refresh the page.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings