import './App.css'
import { WebcamPreview } from '@/ui/components'

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
            the live feed on the right with hand keypoints rendered in real time.
            This validates that gesture input is ready before we wire gameplay.
          </p>
          <ul className="app-checklist">
            <li>Webcam stream capture</li>
            <li>Hand landmark detection</li>
            <li>Overlay diagnostics (FPS, hands)</li>
          </ul>
        </section>
        <WebcamPreview />
      </div>
    </main>
  )
}

export default App
