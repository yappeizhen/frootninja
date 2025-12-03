import { useState } from 'react'
import './App.css'
import { GestureDebugPanel, Playfield } from '@/ui/components'

export const App = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  return (
    <main className="app-shell">
      <div className={`app-main ${!isPanelOpen ? 'app-main--panel-closed' : ''}`}>
        <Playfield />
      </div>
      <GestureDebugPanel isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)} />
    </main>
  )
}

export default App
