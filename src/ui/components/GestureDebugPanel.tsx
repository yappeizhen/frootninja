import { useMemo, useState, useEffect } from 'react'
import { useHandData } from '@/cv'
import { useGestureDetection } from '@/services/useGestureDetection'
import { useGameStore } from '@/state/gameStore'

interface GestureDebugPanelProps {
  isOpen: boolean
  onToggle: () => void
}

const ProgressBar = ({ 
  value, 
  max, 
  color, 
  label,
  showValue = true 
}: { 
  value: number
  max: number
  color: string
  label: string
  showValue?: boolean
}) => {
  const percent = Math.min((value / max) * 100, 100)
  
  return (
    <div className="progress-stat">
      <div className="progress-stat__header">
        <span className="progress-stat__label">{label}</span>
        {showValue && (
          <span className="progress-stat__value">{value.toFixed(1)}</span>
        )}
      </div>
      <div className="progress-bar">
        <div 
          className="progress-bar__fill" 
          style={{ 
            width: `${percent}%`,
            background: color,
            boxShadow: `0 0 12px ${color}40`
          }} 
        />
        <div className="progress-bar__glow" style={{ background: color }} />
      </div>
    </div>
  )
}

const DirectionIndicator = ({ x, y }: { x: number; y: number }) => {
  const angle = Math.atan2(y, x) * (180 / Math.PI)
  const magnitude = Math.min(Math.hypot(x, y) * 50, 40)
  
  return (
    <div className="direction-indicator">
      <div className="direction-indicator__ring" />
      <div className="direction-indicator__ring direction-indicator__ring--inner" />
      <div 
        className="direction-indicator__arrow"
        style={{ 
          transform: `rotate(${angle}deg) translateX(${magnitude}%)`,
        }}
      />
      <div className="direction-indicator__center" />
    </div>
  )
}

export const GestureDebugPanel = ({ isOpen, onToggle }: GestureDebugPanelProps) => {
  const { frame, maxHands } = useHandData()
  const { lastGesture } = useGestureDetection()
  const { score, combo } = useGameStore()
  const [totalSlices, setTotalSlices] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [peakSpeed, setPeakSpeed] = useState(0)
  
  const handsDetected = frame?.hands.length ?? 0

  useEffect(() => {
    if (lastGesture?.type === 'slice') {
      setTotalSlices(prev => prev + 1)
      if (lastGesture.speed > peakSpeed) {
        setPeakSpeed(lastGesture.speed)
      }
    }
  }, [lastGesture, peakSpeed])

  useEffect(() => {
    if (combo > maxCombo) {
      setMaxCombo(combo)
    }
  }, [combo, maxCombo])

  const summary = useMemo(() => {
    if (!lastGesture) return null
    return {
      hand: lastGesture.hand,
      speed: lastGesture.speed,
      strength: lastGesture.strength,
      direction: lastGesture.direction,
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
          <h2>Slice Analytics</h2>
          <div className="header-pills">
            <div className={`gesture-pill ${lastGesture?.type === 'slice' ? 'gesture-pill--active' : ''}`}>
              {lastGesture ? lastGesture.type : 'idle'}
            </div>
            <div className={`tracking-pill ${handsDetected > 0 ? 'tracking-pill--active' : ''}`}>
              <span className="tracking-pill__dot" />
              <span>{handsDetected}/{maxHands} hands</span>
            </div>
          </div>
        </header>

        {/* Session Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-card__value">{score}</span>
            <span className="stat-card__label">Score</span>
          </div>
          <div className="stat-card stat-card--accent">
            <span className="stat-card__value">{combo}</span>
            <span className="stat-card__label">Combo</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__value">{totalSlices}</span>
            <span className="stat-card__label">Slices</span>
          </div>
          <div className="stat-card">
            <span className="stat-card__value">{maxCombo}</span>
            <span className="stat-card__label">Best</span>
          </div>
        </div>
        
        {summary ? (
          <>
            {/* Hand Indicator */}
            <div className="hand-indicator">
              <div className={`hand-icon ${summary.hand === 'Left' ? 'hand-icon--active' : ''}`}>
                <span>L</span>
              </div>
              <div className="hand-indicator__divider" />
              <div className={`hand-icon ${summary.hand === 'Right' ? 'hand-icon--active' : ''}`}>
                <span>R</span>
              </div>
            </div>

            {/* Progress Meters */}
            <div className="meters-section">
              <ProgressBar 
                value={summary.speed} 
                max={2.5} 
                color="var(--pastel-mint)"
                label="Speed"
              />
              <ProgressBar 
                value={summary.strength * 100} 
                max={100} 
                color="var(--pastel-rose)"
                label="Power"
              />
              <ProgressBar 
                value={peakSpeed} 
                max={3} 
                color="var(--pastel-peach)"
                label="Peak Speed"
              />
            </div>

            {/* Direction Compass */}
            <div className="direction-section">
              <span className="section-label">Slice Direction</span>
              <DirectionIndicator x={summary.direction.x} y={summary.direction.y} />
            </div>

          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">👋</div>
            <p className="empty-state__text">
              Swipe your hand quickly to trigger a slice gesture
            </p>
            <div className="empty-state__hint">
              Move fast for best detection
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
