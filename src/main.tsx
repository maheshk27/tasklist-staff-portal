import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { registerMessagingSW } from './config/firebase.ts'

// Register the Firebase messaging service worker as early as possible
// so it is active before getToken() or onMessage() are called anywhere in the app.
registerMessagingSW().then((reg) => {
  if (reg) {
    console.log('[main] Firebase messaging SW ready:', reg.scope)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
