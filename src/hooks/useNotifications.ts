import { useState, useEffect, useCallback } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import toast from 'react-hot-toast'
import { messaging } from '../config/firebase'

const FCM_TOKEN_KEY = 'staff_fcm_token'

interface UseNotificationsReturn {
  token: string | null
  permission: NotificationPermission | null
  messagingSupported: boolean
  requestPermission: () => Promise<NotificationPermission | null>
  getFCMToken: () => Promise<string | null>
  disableNotifications: () => void
}

let swRegistration: ServiceWorkerRegistration | null = null

async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration
  try {
    if (!('serviceWorker' in navigator)) return null
    swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    })
    console.log('[useNotifications] SW registered at scope /')
    return swRegistration
  } catch (error) {
    console.error('[useNotifications] SW registration failed:', error)
    return null
  }
}

export function useNotifications(): UseNotificationsReturn {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(FCM_TOKEN_KEY)
  })
  const [permission, setPermission] = useState<NotificationPermission | null>(
    'Notification' in window ? Notification.permission : null,
  )
  const messagingSupported = 'Notification' in window && 'serviceWorker' in navigator

  // Register SW once on mount — this ensures push events reach our SW
  useEffect(() => {
    if (!messagingSupported) return
    registerSW()
  }, [messagingSupported])

  // Listen for foreground messages
  useEffect(() => {
    if (!messaging) return

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[useNotifications] Foreground message received:', payload)

      const title =
        payload.notification?.title ||
        payload.data?.title ||
        'New Notification'

      const body = payload.notification?.body || payload.data?.body || ''

      if (title || body) {
        toast.success(`${title}${body ? `: ${body}` : ''}`, {
          duration: 5000,
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const getFCMTokenInternal = useCallback(async (): Promise<string | null> => {
    if (!messaging) {
      console.error('[useNotifications] Firebase messaging is not initialized')
      return null
    }

    try {
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
      if (!vapidKey) {
        console.error('[useNotifications] VITE_FIREBASE_VAPID_KEY is not configured')
        return null
      }

      // Register SW first, then pass it to getToken so Firebase uses our SW
      // with scope '/' instead of creating its own at '/firebase-cloud-messaging-push-scope'
      const registration = await registerSW()

      const currentToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration || undefined,
      })

      if (currentToken) {
        console.log('[useNotifications] FCM token retrieved successfully')
        setToken(currentToken)
        localStorage.setItem(FCM_TOKEN_KEY, currentToken)
        return currentToken
      }

      console.warn('[useNotifications] No FCM token returned')
      return null
    } catch (error) {
      console.error('[useNotifications] Error getting FCM token:', error)
      return null
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<NotificationPermission | null> => {
    if (!messagingSupported) {
      console.warn('[useNotifications] Messaging is not supported')
      return null
    }

    try {
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)

      if (permissionResult === 'granted') {
        const fcmToken = await getFCMTokenInternal()
        if (fcmToken) {
          toast.success('FCM token retrieved successfully')
        }
      }

      return permissionResult
    } catch (error) {
      console.error('[useNotifications] Error requesting permission:', error)
      return null
    }
  }, [messagingSupported, getFCMTokenInternal])

  const getFCMToken = useCallback(async (): Promise<string | null> => {
    if (!messagingSupported) {
      console.warn('[useNotifications] Messaging is not supported')
      return null
    }

    if (permission !== 'granted') {
      console.warn('[useNotifications] Notification permission is not granted')
      return null
    }

    return getFCMTokenInternal()
  }, [messagingSupported, permission, getFCMTokenInternal])

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