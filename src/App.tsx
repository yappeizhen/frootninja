import './App.css'
import { GestureDebugPanel, Playfield } from '@/ui/components'

export const App = () => {
  return (
    <main className="app-shell">
      <div className="app-grid">
        <Playfield />
        <GestureDebugPanel />
      </div>
    </main>
  )
}

export default App
