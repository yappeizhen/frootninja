import { useMemo } from 'react'
import { useGestureDetection } from '@/services/useGestureDetection'

const formatPercent = (value: number) => `${Math.round(value * 100)}%`

interface GestureDebugPanelProps {
  isOpen: boolean
  onToggle: () => void
}

export const GestureDebugPanel = ({ isOpen, onToggle }: GestureDebugPanelProps) => {
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
    <aside className={`side-panel ${isOpen ? 'side-panel--open' : 'side-panel--closed'}`}>
      <button 
        className="side-panel__toggle"
        onClick={onToggle}
        aria-label={isOpen ? 'Close panel' : 'Open panel'}
      >
        <span className="side-panel__toggle-icon">
          {isOpen ? '›' : '‹'}
        </span>
      </button>
      
      <div className="side-panel__content">
        <header className="side-panel__header">
          <p className="eyebrow">Live gestures</p>
          <h2>Slice detection</h2>
          <div className="gesture-pill">{lastGesture ? lastGesture.type : 'idle'}</div>
        </header>
        
        {summary ? (
          <div className="side-panel__grid">
            <div className="side-panel__stat">
              <span className="preview-label">Hand</span>
              <strong>{summary.handLabel}</strong>
            </div>
            <div className="side-panel__stat">
              <span className="preview-label">Speed</span>
              <strong>{summary.speed}</strong>
            </div>
            <div className="side-panel__stat">
              <span className="preview-label">Strength</span>
              <strong>{summary.strengthPercent}</strong>
            </div>
            <div className="side-panel__stat">
              <span className="preview-label">Direction</span>
              <strong>{summary.direction}</strong>
            </div>
            <div className="side-panel__stat">
              <span className="preview-label">Detected</span>
              <strong>{summary.timestamp}</strong>
            </div>
          </div>
        ) : (
          <p className="side-panel__empty">
            Swipe quickly to trigger a slice gesture.
          </p>
        )}
      </div>
    </aside>
  )
}
