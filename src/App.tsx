import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { GestureDebugPanel, Playfield } from '@/ui/components'
import { useMultiplayerStore } from '@/state/multiplayerStore'
import { useGameStore } from '@/state/gameStore'
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
  const resetGame = useGameStore((state) => state.reset)
  
  // Check if multiplayer game is active (includes waiting to establish WebRTC early)
  const isMultiplayerActive = roomId && (roomState === 'waiting' || roomState === 'countdown' || roomState === 'playing' || roomState === 'finished')
  
  // Close panel when switching to mobile view
  useEffect(() => {
    if (isMobile) {
      setIsPanelOpen(false)
    }
  }, [isMobile])

  const handleExitMultiplayer = () => {
    resetMultiplayer()
  }

  // Navigate to home screen (reset all game state)
  const handleGoHome = useCallback(() => {
    resetGame()
    resetMultiplayer()
  }, [resetGame, resetMultiplayer])

  // Render multiplayer playfield when active (full screen, no debug panel)
  if (isMultiplayerActive) {
    return (
      <div className="app-shell app-shell--multiplayer">
        {/* Header */}
        <header className="app-header">
          <button 
            className="app-header__title app-header__title--clickable"
            onClick={handleGoHome}
            type="button"
            aria-label="Go to home screen"
          >
            <span className="app-header__icon">🍉</span>
            Frootninja
          </button>
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
        <button 
          className="app-header__title app-header__title--clickable"
          onClick={handleGoHome}
          type="button"
          aria-label="Go to home screen"
        >
          <span className="app-header__icon">🍉</span>
          Frootninja
        </button>
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
      <span className="app-footer__text">✨ Powered by MediaPipe</span>
      <span className="app-footer__divider">•</span>
        <a 
          href="https://github.com/yappeizhen/frootninja" 
          target="_blank" 
          rel="noopener noreferrer"
          className="app-footer__link"
        >
          <svg className="app-footer__github-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub
        </a>
      </footer>
      
      <GestureDebugPanel isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)} />
    </div>
  )
}

export default App