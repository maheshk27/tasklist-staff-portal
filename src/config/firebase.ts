import { initializeApp } from 'firebase/app'
import { getMessaging, deleteToken, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Messaging only in environments that support it
let messaging: Messaging | null = null

if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window
) {
  try {
    messaging = getMessaging(app)
  } catch (err) {
    console.warn('[firebase] getMessaging() failed — messaging disabled:', err)
  }
}

/**
 * Returns the active PWA service worker registration (registered by vite-plugin-pwa).
 *
 * With `strategies: 'injectManifest'`, vite-plugin-pwa compiles src/sw.ts into the
 * main SW (sw.js) at scope /. That single SW handles both Workbox precaching AND
 * Firebase push events — so we simply wait for it to become ready instead of
 * registering a second, competing SW.
 *
 * Previously this function registered /firebase-messaging-sw.js as a separate SW,
 * which caused two SWs to compete at scope / and broke push subscriptions in production.
 */
export async function getMessagingSWRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null

  try {
    // navigator.serviceWorker.ready resolves with the active SW registration
    // that vite-plugin-pwa already registered at scope /.
    const registration = await navigator.serviceWorker.ready
    console.log('[firebase] ✅ Using active PWA SW registration at scope:', registration.scope)
    return registration
  } catch (err) {
    console.error('[firebase] Could not get active SW registration:', err)
    return null
  }
}

/**
 * Force-delete the current FCM token and clear the push subscription.
 * Call this before getToken() to ensure a fresh subscription is created
 * on the correct SW registration.
 */
export async function forceDeleteFCMToken(): Promise<void> {
  if (!messaging) return
  try {
    await deleteToken(messaging)
    console.log('[firebase] ✅ FCM token deleted — fresh token will be generated on next getToken()')
  } catch (err) {
    console.warn('[firebase] Could not delete FCM token:', err)
  }
}

export { messaging }
