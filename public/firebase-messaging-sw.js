importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js')

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

messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Background message received:', payload)
  console.log('Notification data:', payload.notification)
  console.log('Message data:', payload.data)

  const notificationTitle = payload.notification?.title || 'New Message'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/rk-logo.png', // Update with your icon
    badge: '/rk-logo.png',
    tag: payload.data?.tag || 'default',
    data: payload.data,
  }

  console.log('Showing notification:', notificationTitle, notificationOptions)
  self.registration.showNotification(notificationTitle, notificationOptions)
})