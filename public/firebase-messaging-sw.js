// Version: 3.0.0
// Strategy: Handle ALL push events via the raw 'push' event listener.
// Firebase compat SDK is initialized only for onBackgroundMessage as a fallback.
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: "AIzaSyAI8TWtseYRo6OFCC1HutwbHF6ubb2ibhY",
  authDomain: "rk-bazar-aebc8.firebaseapp.com",
  projectId: "rk-bazar-aebc8",
  storageBucket: "rk-bazar-aebc8.firebasestorage.app",
  messagingSenderId: "142568809640",
  appId: "1:142568809640:web:8e8cd678e170c022c88e9d",
  measurementId: "G-3V7YBWQJ5E"
};

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

console.log('📡 [SW v3.0.0] Firebase messaging SW initialized')

// ============================================================
// PRIMARY: Raw push event handler
// Fires for EVERY push delivered to this SW registration.
// This is the most reliable handler — works for both
// notification messages and data-only messages.
// ============================================================
self.addEventListener('push', (event) => {
  console.log('📡 [SW:push] Raw push event received')

  let notificationTitle = 'New Message'
  let notificationBody = 'You have a new notification'
  let notificationData = {}

  if (event.data) {
    try {
      const payload = event.data.json()
      console.log('📡 [SW:push] Parsed payload:', JSON.stringify(payload))

      // FCM sends data-only messages with content inside payload.data
      // Notification messages have payload.notification AND payload.data
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
      try {
        notificationBody = event.data.text() || notificationBody
      } catch (_) {}
    }
  }

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
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const isFocused = windowClients.some(
        (client) => client.visibilityState === 'visible' && client.focused
      )

      if (isFocused) {
        console.log('📡 [SW:push] App is focused — skipping OS notification (toast will show in app)')
        return Promise.resolve()
      }

      console.log('📡 [SW:push] App not focused — showing OS notification')
      return self.registration.showNotification(notificationTitle, options)
        .then(() => console.log('✅ [SW:push] Notification shown'))
        .catch((err) => console.error('❌ [SW:push] Failed to show notification:', err))
    })
  )
})

// ============================================================
// SECONDARY: Firebase SDK onBackgroundMessage
// Only fires when the page is NOT focused/open.
// Kept as a fallback — if the raw push event above already
// showed a notification, this may show a duplicate (rare).
// ============================================================
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 [SW:onBackgroundMessage] Received:', JSON.stringify(payload))
  // The raw push handler above already shows the notification,
  // so we skip here to avoid duplicates.
  // If you want onBackgroundMessage as the sole handler, remove
  // the self.addEventListener('push', ...) block above.
})

// ============================================================
// Notification click handler
// ============================================================
self.addEventListener('notificationclick', (event) => {
  console.log('👆 [SW] Notification clicked:', event.notification.tag)
  event.notification.close()

  const screenPath = event.notification.data?.screenPath || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus()
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(screenPath)
        }
      })
  )
})

// ============================================================
// Lifecycle
// ============================================================
self.addEventListener('install', (event) => {
  console.log('🔥 [SW] Installing v3.0.0, skipping wait...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('🔥 [SW] Activating v3.0.0, claiming clients...')
  event.waitUntil(
    clients.claim()
      .then(() => console.log('✅ [SW] Clients claimed'))
      .catch((err) => console.error('❌ [SW] Failed to claim clients:', err))
  )
})
