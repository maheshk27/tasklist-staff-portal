import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { getMessagingSWRegistration } from './config/firebase.ts'

// Wait for the PWA service worker (registered by vite-plugin-pwa) to become active
// as early as possible, so it is ready before getToken() or onMessage() are called.
getMessagingSWRegistration().then((reg) => {
  if (reg) {
    console.log('[main] PWA service worker ready at scope:', reg.scope)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
