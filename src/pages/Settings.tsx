import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useNotifications } from '../hooks/useNotifications'
import { PageHeader } from '../components/PageHeader'
import { Download, Check, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

const Settings: React.FC = () => {
  const { token, permission, messagingSupported, requestPermission, getFCMToken, disableNotifications } = useNotifications()

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isPwaInstalled, setIsPwaInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isStandaloneNavigator = (window.navigator as unknown as { standalone?: boolean }).standalone
      setIsPwaInstalled(isStandalone || isStandaloneNavigator === true)
    }
    checkInstalled()

    // Listen for beforeinstallprompt event
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsPwaInstalled(true)
      setDeferredPrompt(null)
      toast.success('App installed successfully!')
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallPwa = useCallback(async () => {
    // If we have the deferred prompt, use it
    if (deferredPrompt) {
      setIsInstalling(true)
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          toast.success('Installing app...')
        }
        setDeferredPrompt(null)
      } catch {
        toast.error('Failed to install app')
      } finally {
        setIsInstalling(false)
      }
      return
    }

    // If no deferred prompt, show manual install instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)

    if (isIOS) {
      toast.success(
        () => (
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-foreground">Install on iOS</p>
            <p className="text-sm text-muted-foreground">
              Tap <span className="font-medium text-foreground">Share</span> <span className="text-lg">⎋</span> then <span className="font-medium text-foreground">"Add to Home Screen"</span> <span className="text-lg">➕</span>
            </p>
          </div>
        ),
        { duration: 6000 }
      )
    } else if (isAndroid) {
      toast.success(
        () => (
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-foreground">Install on Android</p>
            <p className="text-sm text-muted-foreground">
              Tap menu <span className="font-medium text-foreground">⋮</span> then <span className="font-medium text-foreground">"Add to Home Screen"</span> or <span className="font-medium text-foreground">"Install app"</span>
            </p>
          </div>
        ),
        { duration: 6000 }
      )
    } else {
      toast.success(
        () => (
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-foreground">Install on Desktop</p>
            <p className="text-sm text-muted-foreground">
              Use Chrome/Edge menu → <span className="font-medium text-foreground">"Install app"</span> or <span className="font-medium text-foreground">"Add to Home Screen"</span>
            </p>
          </div>
        ),
        { duration: 6000 }
      )
    }
  }, [deferredPrompt])

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
      <PageHeader
        title="Settings"
        subtitle="Manage your notification settings & preferences"
      />
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

      {/* PWA Install Section */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">App Installation</h2>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPwaInstalled ? 'bg-green-100' : 'bg-orange-100'}`}>
                <Smartphone className={`h-5 w-5 ${isPwaInstalled ? 'text-green-600' : 'text-orange-600'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Install App</p>
                <p className="text-xs text-muted-foreground">
                  {isPwaInstalled ? 'App is installed on your device' : 'Add to home screen for quick access'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isPwaInstalled ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <Check className="h-4 w-4" />
                  Installed
                </div>
              ) : (
                <button
                  onClick={handleInstallPwa}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 flex-shrink-0" />
                  <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
                </button>
              )}
            </div>
          </div>

          {!isPwaInstalled && (
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              To install the app, use Chrome, Edge, or Safari on your device. Look for the "Add to Home Screen" option in your browser menu.
            </p>
          )}

          <div className="text-sm text-muted-foreground">
            <p>
              Installing the app gives you a native app experience with quick access from your home screen,
              offline capabilities, and push notifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings