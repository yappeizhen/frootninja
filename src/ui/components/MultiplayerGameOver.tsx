/**
 * MultiplayerGameOver Component
 * Shows final results after a multiplayer match with celebratory animations
 */

import { useEffect, useState } from 'react'

interface MultiplayerGameOverProps {
  myScore: number
  myMaxCombo: number
  opponentScore: number
  opponentMaxCombo: number
  opponentName: string
  isWinner: boolean
  isTie: boolean
  onRematch: () => void
  onLeave: () => void
}

// Animated score counter hook
const useAnimatedCounter = (target: number, duration: number = 1500) => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    if (target === 0) {
      setCount(0)
      return
    }
    
    const startTime = Date.now()
    const startValue = 0
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(startValue + (target - startValue) * easeOut)
      
      setCount(current)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    // Small delay before starting count animation
    const timeout = setTimeout(() => {
      requestAnimationFrame(animate)
    }, 400)
    
    return () => clearTimeout(timeout)
  }, [target, duration])
  
  return count
}

// Confetti particle component
const Confetti = () => {
  // Generate confetti pieces with random properties
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    duration: `${2 + Math.random() * 2}s`,
    color: ['#FF8FAB', '#C4A8FF', '#6DDCB0', '#FFBE85', '#7DC4F0', '#FFD700'][Math.floor(Math.random() * 6)],
    size: `${4 + Math.random() * 8}px`,
    rotation: `${Math.random() * 360}deg`,
  }))
  
  return (
    <div className="confetti-container" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            '--confetti-left': p.left,
            '--confetti-delay': p.delay,
            '--confetti-duration': p.duration,
            '--confetti-color': p.color,
            '--confetti-size': p.size,
            '--confetti-rotation': p.rotation,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

export const MultiplayerGameOver = ({
  myScore,
  myMaxCombo,
  opponentScore,
  opponentMaxCombo,
  opponentName,
  isWinner,
  isTie,
  onRematch,
  onLeave,
}: MultiplayerGameOverProps) => {
  const animatedMyScore = useAnimatedCounter(myScore)
  const animatedOpponentScore = useAnimatedCounter(opponentScore)
  
  const getResultState = () => {
    if (isTie) return 'tie'
    return isWinner ? 'win' : 'lose'
  }
  
  const resultState = getResultState()
  
  const getIcon = () => {
    if (isTie) return '🤝'
    return isWinner ? '🥳' : '😢'
  }
  
  const getTitle = () => {
    if (isTie) return "IT'S A TIE!"
    return isWinner ? 'YOU WIN' : 'YOU LOSE'
  }
  
  const getSubtitle = () => {
    if (isTie) return 'Great match!'
    return isWinner ? 'Fruit master!' : 'Better luck next time!'
  }

  return (
    <div className={`game-screen-overlay multiplayer-gameover-overlay multiplayer-gameover-overlay--${resultState}`}>
      {/* Confetti only for winners */}
      {isWinner && !isTie && <Confetti />}
      
      <div className={`game-screen multiplayer-gameover multiplayer-gameover--${resultState}`}>
        {/* Icon */}
        <div className={`multiplayer-gameover__icon-wrapper multiplayer-gameover__icon-wrapper--${resultState}`}>
          <div className="multiplayer-gameover__icon emoji-display">
            {getIcon()}
          </div>
        </div>
        
        {/* Title with animation */}
        <div className="multiplayer-gameover__title-wrapper">
          <h1 className={`multiplayer-gameover__title multiplayer-gameover__title--${resultState}`}>
            {getTitle()}
          </h1>
          <span className={`multiplayer-gameover__subtitle multiplayer-gameover__subtitle--${resultState}`}>
            {getSubtitle()}
          </span>
        </div>

        {/* Score comparison */}
        <div className="multiplayer-gameover__stats">
          {/* Your stats */}
          <div className={`multiplayer-gameover__player ${isWinner && !isTie ? 'multiplayer-gameover__player--winner' : ''}`}>
            <span className="multiplayer-gameover__player-label">YOU</span>
            <span className="multiplayer-gameover__player-score">{animatedMyScore.toLocaleString()}</span>
            <span className="multiplayer-gameover__player-combo">Best combo: x{myMaxCombo}</span>
          </div>

          <div className="multiplayer-gameover__vs">VS</div>

          {/* Opponent stats */}
          <div className={`multiplayer-gameover__player ${!isWinner && !isTie ? 'multiplayer-gameover__player--winner' : ''}`}>
            <span className="multiplayer-gameover__player-label">{opponentName.toUpperCase()}</span>
            <span className="multiplayer-gameover__player-score">{animatedOpponentScore.toLocaleString()}</span>
            <span className="multiplayer-gameover__player-combo">Best combo: x{opponentMaxCombo}</span>
          </div>
        </div>

        {/* Action buttons with stagger animation */}
        <div className="multiplayer-gameover__actions">
          <button 
            className={`game-btn game-btn--primary multiplayer-gameover__btn multiplayer-gameover__btn--rematch ${isWinner ? 'multiplayer-gameover__btn--pulse' : ''}`}
            onClick={onRematch}
          >
            Rematch
          </button>
          <button 
            className="game-btn game-btn--secondary multiplayer-gameover__btn multiplayer-gameover__btn--leave" 
            onClick={onLeave}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  )
}
