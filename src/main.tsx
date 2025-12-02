import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/App'
import { HandTrackerProvider } from '@/cv'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HandTrackerProvider>
      <App />
    </HandTrackerProvider>
  </StrictMode>,
)
