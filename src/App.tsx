import './App.css'
import { GestureDebugPanel, WebcamPreview } from '@/ui/components'

export const App = () => {
  return (
    <main className="app-shell">
      <div className="app-grid">
        <section className="app-panel">
          <header>
            <p className="eyebrow">Milestone 1</p>
            <h1>Hand Tracking Harness</h1>
          </header>
          <p>
            Grant camera permission to boot the MediaPipe pipeline. You should see
            both hands mirrored in the live feed with keypoints rendered in real
            time. This validates that gesture input is ready before we wire
            gameplay.
          </p>
          <ul className="app-checklist">
            <li>Webcam stream capture</li>
            <li>Dual-hand landmark detection</li>
            <li>Overlay diagnostics (FPS, hands)</li>
          </ul>
        </section>
        <div className="app-column">
          <WebcamPreview />
          <GestureDebugPanel />
        </div>
      </div>
    </main>
  )
}

export default App
