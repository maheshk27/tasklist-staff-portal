/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

// ============================================================
// Workbox: Precache all assets injected by vite-plugin-pwa
// ============================================================
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.skipWaiting()
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ============================================================
// Firebase Messaging (compat SDK via importScripts)
// Must use importScripts — ES module imports don't work in SW context
// for the Firebase compat bundle.
// ============================================================
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js')

// @ts-expect-error — firebase is injected by the compat importScripts above
firebase.initializeApp({
  apiKey: 'AIzaSyAI8TWtseYRo6OFCC1HutwbHF6ubb2ibhY',
  authDomain: 'rk-bazar-aebc8.firebaseapp.com',
  projectId: 'rk-bazar-aebc8',
  storageBucket: 'rk-bazar-aebc8.firebasestorage.app',
  messagingSenderId: '142568809640',
  appId: '1:142568809640:web:8e8cd678e170c022c88e9d',
  measurementId: 'G-3V7YBWQJ5E',
})

// @ts-expect-error — firebase is injected by the compat importScripts above
const messagingSW = firebase.messaging()

console.log('📡 [SW] Firebase messaging initialized in main PWA service worker')

// ============================================================
// PRIMARY: Raw push event handler
// Fires for EVERY push delivered to this SW registration.
// Most reliable — works for both notification and data-only messages.
// ============================================================
self.addEventListener('push', (event) => {
  console.log('📡 [SW:push] Raw push event received')

  let notificationTitle = 'New Message'
  let notificationBody = 'You have a new notification'
  let notificationData: Record<string, string> = {}

  if ((event as PushEvent).data) {
    try {
      const payload = (event as PushEvent).data!.json()
      console.log('📡 [SW:push] Parsed payload:', JSON.stringify(payload))

      notificationTitle =
        payload.data?.title ||
        payload.notification?.title ||
        payload.title ||
        notificationTitle

      notificationBody =
        payload.data?.body ||
        payload.notification?.body ||
        payload.body ||
        notificationBody

      notificationData = payload.data || {}
    } catch (e) {
      console.warn('📡 [SW:push] Could not parse push data as JSON:', e)
      notificationBody = (event as PushEvent).data?.text() || notificationBody
    }
  }

  // NotificationOptions extended with vibrate (valid in SW context but not in TS lib)
  const options = {
    body: notificationBody,
    icon: '/rk-logo.png',
    badge: '/rk-logo.png',
    tag: notificationData.tag || `fcm-${Date.now()}`,
    data: notificationData,
    vibrate: [200, 100, 200],
    requireInteraction: true,
  }

  console.log('📢 [SW:push] Showing notification:', notificationTitle, options.body)

  // Check if any app window is currently focused.
  // If focused → the React app's onMessage() handler will show a toast,
  // so we skip the OS notification to avoid duplicates.
  // If not focused → show the OS notification so the user is alerted.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const isFocused = windowClients.some(
        (client) => client.visibilityState === 'visible' && (client as WindowClient).focused
      )

      if (isFocused) {
        // Tab is focused: Firebase SDK's onMessage() in the React app will handle
        // showing the toast — skip both the OS notification AND postMessage to avoid
        // duplicate toasts.
        console.log('📡 [SW:push] App is focused — skipping OS notification and postMessage (onMessage() handles it)')
        return Promise.resolve()
      }

      // App is not focused: broadcast to all open windows so they can show an in-app
      // toast, and also show the OS notification.
      windowClients.forEach((client) => {
        client.postMessage({
          type: 'FCM_MESSAGE',
          title: notificationTitle,
          body: notificationBody,
          data: notificationData,
        })
      })

      console.log('📡 [SW:push] App not focused — showing OS notification')
      return self.registration
        .showNotification(notificationTitle, options)
        .then(() => console.log('✅ [SW:push] Notification shown'))
        .catch((err) => console.error('❌ [SW:push] Failed to show notification:', err))
    })
  )
})

// ============================================================
// SECONDARY: Firebase SDK onBackgroundMessage
// Only fires when the page is NOT focused/open.
// Kept as a fallback — the raw push handler above already
// shows the notification, so we skip here to avoid duplicates.
// ============================================================
messagingSW.onBackgroundMessage((payload: unknown) => {
  console.log('🔔 [SW:onBackgroundMessage] Received (handled by push event above):', JSON.stringify(payload))
  // No-op: the raw push handler above already handles everything.
})

// ============================================================
// Notification click handler
// ============================================================
self.addEventListener('notificationclick', (event) => {
  const notifEvent = event as NotificationEvent
  console.log('👆 [SW] Notification clicked:', notifEvent.notification.tag)
  notifEvent.notification.close()

  const screenPath = (notifEvent.notification.data as Record<string, string>)?.screenPath || '/'

  notifEvent.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return (client as WindowClient).focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(screenPath)
        }
      })
  )
})
