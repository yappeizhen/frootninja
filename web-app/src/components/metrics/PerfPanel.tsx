import { useVisionStore } from '../../state/useVisionStore'
import './PerfPanel.css'

export const PerfPanel = () => {
  const fps = useVisionStore((state) => state.fps)
  const inferenceMs = useVisionStore((state) => state.inferenceMs)
  const error = useVisionStore((state) => state.error)
  const hands = useVisionStore((state) => state.hands)

  return (
    <div className="perf-panel">
      <div>
        <p>FPS</p>
        <strong>{fps.toFixed(1)}</strong>
      </div>
      <div>
        <p>Inference</p>
        <strong>{inferenceMs.toFixed(1)} ms</strong>
      </div>
      <div>
        <p>Hands</p>
        <strong>{hands.length}</strong>
      </div>
      {error && <p className="perf-panel__error">{error}</p>}
    </div>
  )
}

