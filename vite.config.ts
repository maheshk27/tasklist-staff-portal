import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'rk-logo.png', 'icons.svg'],
      manifest: {
        name: 'RK Bazar Staff Portal',
        short_name: 'RK Bazar',
        description: 'Staff task management portal for RK Bazar',
        theme_color: '#F07A5A',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globIgnores: ['**/firebase-messaging-sw.js'],
        // Build the SW as a classic IIFE (not an ES module) so that
        // importScripts() works — importScripts is forbidden in ES module SWs.
        rollupFormat: 'iife',
      }
    })
  ],
})
