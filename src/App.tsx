import { useState } from 'react'
import './App.css'
import { GestureDebugPanel, Playfield } from '@/ui/components'

export const App = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(true)

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