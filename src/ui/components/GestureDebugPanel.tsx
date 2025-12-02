import { useMemo } from 'react'
import { useGestureDetection } from '@/services/useGestureDetection'

const formatPercent = (value: number) => `${Math.round(value * 100)}%`

export const GestureDebugPanel = () => {
  const { lastGesture } = useGestureDetection()

  const summary = useMemo(() => {
    if (!lastGesture) {
      return null
    }
    return {
      handLabel: lastGesture.hand === 'Left' ? 'Left hand' : 'Right hand',
      speed: lastGesture.speed.toFixed(2),
      direction: `${lastGesture.direction.x.toFixed(2)}, ${lastGesture.direction.y.toFixed(2)}`,
      strengthPercent: formatPercent(lastGesture.strength),
      timestamp: new Date(lastGesture.timestamp).toLocaleTimeString(),
    }
  }, [lastGesture])

  return (
    <section className="gesture-card">
      <header className="gesture-card__header">
        <div>
          <p className="eyebrow">Live gestures</p>
          <h2>Slice detection</h2>
        </div>
        <div className="gesture-pill">{lastGesture ? lastGesture.type : 'idle'}</div>
      </header>
      {summary ? (
        <div className="gesture-grid">
          <div>
            <span className="preview-label">Hand</span>
            <strong>{summary.handLabel}</strong>
          </div>
          <div>
            <span className="preview-label">Speed</span>
            <strong>{summary.speed}</strong>
          </div>
          <div>
            <span className="preview-label">Strength</span>
            <strong>{summary.strengthPercent}</strong>
          </div>
          <div>
            <span className="preview-label">Direction (x, y)</span>
            <strong>{summary.direction}</strong>
          </div>
          <div>
            <span className="preview-label">Detected</span>
            <strong>{summary.timestamp}</strong>
          </div>
        </div>
      ) : (
        <p className="gesture-empty">
          Move one hand quickly across the frame to trigger a slice gesture. The most recent
          detection will appear here with speed, strength, and direction telemetry.
        </p>
      )}
    </section>
  )
}

