import { useState, useEffect } from 'react'
import './App.css'
import { GestureDebugPanel, Playfield } from '@/ui/components'
import { useMultiplayerStore } from '@/state/multiplayerStore'
import { MultiplayerPlayfield } from '@/ui/components/MultiplayerPlayfield'

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
  const { roomId, roomState, reset: resetMultiplayer } = useMultiplayerStore()
  
  // Check if multiplayer game is active
  const isMultiplayerActive = roomId && (roomState === 'countdown' || roomState === 'playing' || roomState === 'finished')
  
  // Close panel when switching to mobile view
  useEffect(() => {
    if (isMobile) {
      setIsPanelOpen(false)
    }
  }, [isMobile])

  const handleExitMultiplayer = () => {
    resetMultiplayer()
  }

  // Render multiplayer playfield when active (full screen, no debug panel)
  if (isMultiplayerActive) {
    return (
      <div className="app-shell app-shell--multiplayer">
        {/* Header */}
        <header className="app-header">
          <h1 className="app-header__title">
            <span className="app-header__icon">🍉</span>
            Frootninja
          </h1>
        </header>
        
        {/* Multiplayer game */}
        <main className="app-main app-main--panel-closed">
          <MultiplayerPlayfield onExit={handleExitMultiplayer} />
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-header__title">
          <span className="app-header__icon">🍉</span>
          Frootninja
        </h1>
        <button 
          className="app-header__menu-btn"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          aria-label={isPanelOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`hamburger ${isPanelOpen ? 'hamburger--open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </header>
      
      {/* Main content */}
      <main className={`app-main ${!isPanelOpen ? 'app-main--panel-closed' : ''}`}>
        <Playfield />
      </main>
      
      {/* Footer */}
      <footer className="app-footer">
        <span className="app-footer__text">🍎 Slice fruits with your hands ✋</span>
        <span className="app-footer__divider">•</span>
        <span className="app-footer__text">✨ Powered by MediaPipe</span>
      </footer>
      
      <GestureDebugPanel isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)} />
    </div>
  )
}

export default App