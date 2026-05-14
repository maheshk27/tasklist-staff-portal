import { useState, useEffect, useCallback } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import toast from 'react-hot-toast'
import { messaging, registerMessagingSW, forceDeleteFCMToken } from '../config/firebase'
import { notificationService } from '../services/apiManager'
import { decodeToken, getStoredTokens } from '../utils/auth'

/** Get the current logged-in userId from the stored JWT token */
function getCurrentUserId(): number | null {
  try {
    const { accessToken } = getStoredTokens()
    if (!accessToken) return null
    const decoded = decodeToken(accessToken)
    return decoded?.userId ?? null
  } catch {
    return null
  }
}

const FCM_TOKEN_KEY = 'staff_fcm_token'

interface UseNotificationsReturn {
  token: string | null
  permission: NotificationPermission | null
  messagingSupported: boolean
  requestPermission: () => Promise<NotificationPermission | null>
  getFCMToken: () => Promise<string | null>
  disableNotifications: () => void
}

export function useNotifications(): UseNotificationsReturn {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(FCM_TOKEN_KEY)
  })
  const [permission, setPermission] = useState<NotificationPermission | null>(
    'Notification' in window ? Notification.permission : null,
  )
  const messagingSupported =
    'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window

  // ─── Foreground message listener (app focused) ──────────────────────────────
  // Firebase onMessage only fires when the tab is active and focused.
  useEffect(() => {
    if (!messaging) {
      console.warn('[useNotifications] Firebase messaging is not initialized — cannot set up onMessage listener')
      return
    }

    console.log('[useNotifications] Setting up foreground onMessage listener')

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[useNotifications] ✅ Foreground message received:', payload)

      const title =
        payload.notification?.title ||
        payload.data?.title ||
        'New Notification'

      const body = payload.notification?.body || payload.data?.body || ''

      toast.success(`${title}${body ? `: ${body}` : ''}`, {
        duration: 5000,
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // ─── SW postMessage listener (app open but not focused) ─────────────────────
  // The SW broadcasts FCM_MESSAGE to all open windows on every push event.
  // We show a toast here only when the tab is NOT focused — if focused,
  // onMessage() above already handles it to avoid duplicate toasts.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'FCM_MESSAGE') return
      if (document.hasFocus()) return // onMessage() handles it when tab is focused

      console.log('[useNotifications] ✅ SW postMessage received (app not focused):', event.data)

      const { title = 'New Notification', body = '' } = event.data
      toast.success(`${title}${body ? `: ${body}` : ''}`, {
        duration: 5000,
      })
    }

    navigator.serviceWorker.addEventListener('message', handleSWMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage)
    }
  }, [])

  // ─── Get FCM token ───────────────────────────────────────────────────────────
  const getFCMTokenInternal = useCallback(async (): Promise<string | null> => {
    if (!messaging) {
      console.error('[useNotifications] Firebase messaging is not initialized')
      return null
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
    if (!vapidKey) {
      console.error('[useNotifications] VITE_FIREBASE_VAPID_KEY is not configured')
      return null
    }

    try {
      const swRegistration = await registerMessagingSW()
      if (!swRegistration) {
        console.error('[useNotifications] Could not obtain SW registration — cannot get FCM token')
        return null
      }

      console.log('[useNotifications] Getting FCM token with SW scope:', swRegistration.scope)

      const currentToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swRegistration,
      })

      if (currentToken) {
        console.log('[useNotifications] ✅ FCM token retrieved:', currentToken.substring(0, 20) + '...')
        setToken(currentToken)
        localStorage.setItem(FCM_TOKEN_KEY, currentToken)

        // Save token to backend so it can look it up when sending push notifications
        const userId = getCurrentUserId()
        if (userId) {
          await notificationService.registerDevice(userId, currentToken)
        }

        return currentToken
      }

      console.warn('[useNotifications] No FCM token returned — check VAPID key and SW registration')
      return null
    } catch (error) {
      console.error('[useNotifications] Error getting FCM token:', error)
      return null
    }
  }, [])

  // ─── Request notification permission ────────────────────────────────────────
  const requestPermission = useCallback(async (): Promise<NotificationPermission | null> => {
    if (!messagingSupported) {
      console.warn('[useNotifications] Messaging is not supported in this browser')
      return null
    }

    try {
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)

      if (permissionResult === 'granted') {
        // Force delete any old token before getting a fresh one
        await forceDeleteFCMToken()
        const fcmToken = await getFCMTokenInternal()
        if (fcmToken) {
          toast.success('Notifications enabled successfully')
        } else {
          toast.error('Notifications enabled but failed to get token — check console')
        }
      }

      return permissionResult
    } catch (error) {
      console.error('[useNotifications] Error requesting permission:', error)
      return null
    }
  }, [messagingSupported, getFCMTokenInternal])

  // ─── Public getFCMToken ──────────────────────────────────────────────────────
  const getFCMToken = useCallback(async (): Promise<string | null> => {
    if (!messagingSupported) {
      console.warn('[useNotifications] Messaging is not supported')
      return null
    }

    if (permission !== 'granted') {
      console.warn('[useNotifications] Notification permission is not granted')
      return null
    }

    // Force delete old token to ensure fresh subscription on correct SW
    await forceDeleteFCMToken()
    return getFCMTokenInternal()
  }, [messagingSupported, permission, getFCMTokenInternal])

  // ─── Disable notifications ───────────────────────────────────────────────────
  const disableNotifications = useCallback(() => {
    setToken(null)
    localStorage.removeItem(FCM_TOKEN_KEY)
    console.log('[useNotifications] Notifications disabled (token cleared locally)')
  }, [])

  return {
    token,
    permission,
    messagingSupported,
    requestPermission,
    getFCMToken,
    disableNotifications,
  }
}
