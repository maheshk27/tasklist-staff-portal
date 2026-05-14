import { useState, useEffect, useCallback } from 'react'
import { getToken, onMessage, isSupported as firebaseIsSupported, deleteToken } from 'firebase/messaging'
import { messaging } from '../config/firebase'
import toast from 'react-hot-toast'

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  data?: Record<string, string>
}

export const useNotifications = () => {
  const [token, setToken] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [messagingSupported, setMessagingSupported] = useState(false)

  const checkSupport = useCallback(async () => {
    try {
      const supported = await firebaseIsSupported()
      setMessagingSupported(supported)
      if (supported) {
        setPermission(Notification.permission)
      }
    } catch (error) {
      console.error('Firebase messaging not supported:', error)
    }
  }, [])

  useEffect(() => {
    checkSupport()
  }, [checkSupport])

  const requestPermission = async () => {
    try {
      if (!messagingSupported) {
        throw new Error('Notifications not supported in this browser')
      }

      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)

      if (permissionResult === 'granted') {
        await getFCMToken()
      }

      return permissionResult
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      throw error
    }
  }

  const disableNotifications = async () => {
    try {
      if (!messagingSupported) {
        throw new Error('Firebase messaging not supported')
      }

      console.log('Disabling notifications...')
      const deleted = await deleteToken(messaging)
      if (deleted) {
        setToken(null)
        console.log('FCM token deleted successfully')
        toast.success('Notifications disabled. Token cleared.')
      } else {
        console.log('Failed to delete FCM token')
        toast.error('Failed to disable notifications')
      }
      return deleted
    } catch (error) {
      console.error('Error disabling notifications:', error)
      throw error
    }
  }

  const getFCMToken = useCallback(async () => {
    try {
      if (!messagingSupported) {
        throw new Error('Firebase messaging not supported')
      }

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
      if (!vapidKey || vapidKey === 'your_vapid_key_here') {
        throw new Error('VAPID key not configured. Please set VITE_FIREBASE_VAPID_KEY in your .env file.')
      }

      // console.log('Requesting FCM token...')
      const currentToken = await getToken(messaging, {
        vapidKey,
      })

      if (currentToken) {
        // console.log('FCM token obtained:', currentToken)
        setToken(currentToken)
        // Here you would typically send the token to your backend
        toast.success('FCM token obtained successfully')
      } else {
        console.log('No registration token available.')
        toast.error('Failed to obtain FCM token')
      }

      return currentToken
    } catch (error) {
      console.error('Error getting FCM token:', error)
      throw error
    }
  }, [messagingSupported])

  const handleForegroundMessage = useCallback(() => {
    console.log('🔧 Setting up foreground message listener...')
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('🔔 Foreground message received!')
      console.log('Full payload:', payload)
      console.log('Notification:', payload.notification)
      console.log('Data:', payload.data)

      const notification: NotificationPayload = {
        title: payload.notification?.title || 'New Message',
        body: payload.notification?.body || 'You have a new notification',
        icon: payload.notification?.icon,
        data: payload.data as Record<string, string> | undefined,
      }

      // Show toast notification for foreground messages
      // toast(notification.title, {
      //   description: notification.body,
      //   duration: 5000,
      // })

      toast.success(`${notification.title} - ${notification.body}`)
      // You can also dispatch to a state management system here
    })

    console.log('✅ Foreground message listener set up')
    return unsubscribe
  }, [])

  useEffect(() => {

    if (messagingSupported && permission === 'granted') {
      console.log('Setting up notification system...')

      // Always setup foreground listener
      const unsubscribe = handleForegroundMessage()

      // Get token if missing
      if (!token) {
        console.log('No existing token, requesting FCM token...')

        getFCMToken().catch(error => {
          console.error('Failed to get FCM token:', error)
        })
      }

      return () => {
        unsubscribe?.()
      }
    }
  }, [
    messagingSupported,
    permission,
    handleForegroundMessage,
    token,
    getFCMToken,
  ])

  return {
    token,
    permission,
    messagingSupported,
    requestPermission,
    getFCMToken,
    disableNotifications,
  }
}