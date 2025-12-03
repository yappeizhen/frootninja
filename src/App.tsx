import { useState, useEffect } from 'react'
import './App.css'
import { GestureDebugPanel, Playfield } from '@/ui/components'

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  )
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])
  
  return isMobile
}

export const App = () => {
  const isMobile = useIsMobile()
  const [isPanelOpen, setIsPanelOpen] = useState(() => 
    typeof window !== 'undefined' ? !window.matchMedia('(max-width: 768px)').matches : true
  )
  
  // Close panel when switching to mobile view
  useEffect(() => {
    if (isMobile) {
      setIsPanelOpen(false)
    }
  }, [isMobile])

  return (
    <main className="app-shell">
      {/* Mobile toggle bar - only visible on mobile */}
      <header className="mobile-header">
        <h1 className="mobile-header__title">Frootninja</h1>
        <button 
          className="mobile-header__toggle"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          aria-label={isPanelOpen ? 'Hide stats' : 'Show stats'}
        >
          <span className="mobile-header__toggle-icon">{isPanelOpen ? '▲' : '▼'}</span>
          <span>Stats</span>
        </button>
      </header>
      
      <div className={`app-main ${!isPanelOpen ? 'app-main--panel-closed' : ''}`}>
        <Playfield />
      </div>
      <GestureDebugPanel isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)} />
    </main>
  )
}

export default App