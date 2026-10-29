import { useState, useEffect, useCallback } from 'react'

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

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  // Initialize visibility based on whether app is already installed (standalone mode)
  const [isVisible, setIsVisible] = useState(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isStandaloneNavigator = (window.navigator as unknown as { standalone?: boolean }).standalone
    return !isStandalone && !isStandaloneNavigator
  })

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt')
      setIsVisible(false)
    } else {
      console.log('[PWA] User dismissed the install prompt')
    }

    setDeferredPrompt(null)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    setIsDismissed(true)
    setTimeout(() => setIsDismissed(false), 7 * 24 * 60 * 60 * 1000)
  }, [])

  if (!isVisible || isDismissed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto">
      <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden max-w-md mx-auto">
        {/* Top row: Logo + Message */}
        <div className="p-3 flex items-center gap-3">
          <img
            src="/logo-192x192.png"
            alt="RK Bazar Logo"
            className="w-11 h-11 rounded-lg shadow-sm shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Install RK Bazar - Staff Portal</p>
            <p className="text-xs text-muted-foreground truncate">Add to home screen for quick access</p>
          </div>
        </div>

        {/* Buttons - full width at bottom */}
        <div className="border-t border-border flex">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Later
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallPrompt
