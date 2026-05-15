/**
 * This file is intentionally left empty.
 *
 * Firebase messaging is now handled by the main PWA service worker (sw.js),
 * which is compiled from src/sw.ts by vite-plugin-pwa (injectManifest strategy).
 *
 * Having a separate firebase-messaging-sw.js registered at scope / was causing
 * two competing service workers at the same scope, breaking FCM push subscriptions
 * in production.
 *
 * All push event handling, onBackgroundMessage, and notificationclick logic
 * now lives in src/sw.ts alongside the Workbox precache manifest.
 */
