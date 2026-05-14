// Version: 1.4.0 - Added push handler with proper event.waitUntil for reliable delivery
// Uses Firebase compat SDK v12.13.0 matching app.
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js')

// NOTE: These must match staff-portal/.env.development-local EXACTLY
const firebaseConfig = {
  apiKey: 'AIzaSyDKu5onCIp6eQWAmpOOog420RIVY5D_HaM',
  authDomain: 'matrimony-smirks.firebaseapp.com',
  projectId: 'matrimony-smirks',
  storageBucket: 'matrimony-smirks.firebasestorage.app',
  messagingSenderId: '82123554513',
  appId: '1:82123554513:web:25a6b8a28868ed44ff8ff0',
  measurementId: 'G-8F2PHS6DSM',
}

firebase.initializeApp(firebaseConfig)

const messaging = firebase.messaging()

console.log('📡 Firebase messaging service worker initialized:', firebaseConfig.projectId)

// ============================================================
// Firebase SDK onBackgroundMessage
// ============================================================
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 [onBackgroundMessage] Message received:', payload)
  showNotificationFromPayload(payload)
})

// ============================================================
// Raw push event handler — catches ALL push messages including
// those that Firebase onBackgroundMessage might not fire for.
// Uses event.waitUntil to keep SW alive during notification display.
// ============================================================
self.addEventListener('push', (event) => {
  console.log('📡 [push] Raw push event received')

  let payload = null

  if (event.data) {
    try {
      payload = event.data.json()
      console.log('📡 [push] Parsed push payload:', payload)
    } catch (e) {
      console.log('📡 [push] Non-JSON push data:', event.data.text())
    }
  }

  if (payload) {
    event.waitUntil(showNotificationFromPayload(payload))
  }
})

// ============================================================
// Helper: Extract notification info from FCM payload and display it
// ============================================================
function showNotificationFromPayload(payload) {
  console.log('� showNotificationFromPayload called with:', payload)

  const notificationTitle = payload.notification?.title ||
                            payload.data?.title ||
                            payload.title ||
                            'New Message'

  const notificationBody = payload.notification?.body ||
                           payload.data?.body ||
                           payload.body ||
                           'You have a new notification'

  const notificationOptions = {
    body: notificationBody,
    icon: '/rk-logo.png',
    badge: '/rk-logo.png',
    tag: payload.data?.tag || payload.tag || `fcm-${Date.now()}`,
    data: payload.data || payload,
    vibrate: [200, 100, 200],
    requireInteraction: false,
  }

  console.log('📢 Showing notification:', { title: notificationTitle, ...notificationOptions })

  try {
    self.registration.showNotification(notificationTitle, notificationOptions)
    console.log('✅ Notification shown successfully')
    return Promise.resolve(true)
  } catch (error) {
    console.error('❌ Failed to show notification:', error)
    return Promise.resolve(false)
  }
}

// ============================================================
// Notification click handler
// ============================================================
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked:', event.notification.tag)
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus()
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/')
        }
      })
  )
})

// ============================================================
// Lifecycle: activate immediately
// ============================================================
self.addEventListener('install', () => {
  console.log('🔥 Service Worker installing, skipping wait...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('🔥 Service Worker activating, claiming clients...')
  event.waitUntil(
    clients.claim()
      .then(() => console.log('✅ Clients claimed'))
      .catch((err) => console.error('❌ Failed to claim clients:', err))
  )
})