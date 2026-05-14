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
 * Unregister Firebase's internally-created service worker
 * (registered at scope /firebase-cloud-messaging-push-scope).
 *
 * When Firebase SDK calls getToken() without a custom serviceWorkerRegistration,
 * it creates its own SW at this scope and binds the push subscription to it.
 * Our custom SW at scope / never receives the push events in that case.
 *
 * We unregister Firebase's internal SW so the push subscription gets
 * re-created on OUR SW when getToken() is called with serviceWorkerRegistration.
 */
async function cleanupFirebaseInternalSW(): Promise<void> {
  try {
    const allRegistrations = await navigator.serviceWorker.getRegistrations()
    for (const reg of allRegistrations) {
      if (reg.scope.includes('firebase-cloud-messaging-push-scope')) {
        console.log('[firebase] Unregistering Firebase internal SW at scope:', reg.scope)
        await reg.unregister()
        console.log('[firebase] ✅ Firebase internal SW unregistered')
      }
    }
  } catch (err) {
    console.warn('[firebase] Could not clean up Firebase internal SW:', err)
  }
}

/**
 * Register (or retrieve the existing) Firebase messaging service worker at scope /.
 * Also cleans up Firebase's internal SW to ensure push subscriptions are bound to ours.
 */
export async function registerMessagingSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null

  try {
    // Check if already registered at scope /
    const existing = await navigator.serviceWorker.getRegistration('/')
    if (existing?.active) {
      // Also clean up Firebase's internal SW in case it was created
      await cleanupFirebaseInternalSW()
      console.log('[firebase] Reusing existing SW registration:', existing.scope)
      return existing
    }

    // Clean up Firebase's internal SW before registering ours
    await cleanupFirebaseInternalSW()

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    })
    console.log('[firebase] SW registered at scope:', registration.scope)

    // Wait until the SW is active
    if (registration.installing || registration.waiting) {
      await new Promise<void>((resolve) => {
        const sw = registration.installing ?? registration.waiting!
        sw.addEventListener('statechange', function handler() {
          if (sw.state === 'activated') {
            sw.removeEventListener('statechange', handler)
            resolve()
          }
        })
      })
    }

    return registration
  } catch (err) {
    console.error('[firebase] SW registration failed:', err)
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
