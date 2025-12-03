import { useEffect, useState } from 'react'
import { usePlayerStore } from '@/state/playerStore'
import { useGameStore } from '@/state/gameStore'

interface PlayerScoreCardProps {
  player: 'p1' | 'p2'
  score: number
  combo: number
  lastHit: number
}

const PlayerScoreCard = ({ player, score, combo, lastHit }: PlayerScoreCardProps) => {
  const [isHit, setIsHit] = useState(false)

  useEffect(() => {
    if (lastHit > 0) {
      setIsHit(true)
      const timeout = setTimeout(() => setIsHit(false), 300)
      return () => clearTimeout(timeout)
    }
  }, [lastHit])

  return (
    <div className={`player-score player-score--${player} ${isHit ? 'player-score--hit' : ''}`}>
      <span className="player-score__name">
        {player === 'p1' ? 'Player 1' : 'Player 2'}
      </span>
      <span className="player-score__value">{score.toLocaleString()}</span>
      {combo > 1 && (
        <span className="player-score__combo">x{combo}</span>
      )}
    </div>
  )
}

interface WinnerOverlayProps {
  winner: 'player1' | 'player2' | 'tie'
  p1Score: number
  p2Score: number
}

const WinnerOverlay = ({ winner, p1Score, p2Score }: WinnerOverlayProps) => {
  const winnerClass = winner === 'player1' ? 'p1' : winner === 'player2' ? 'p2' : 'tie'
  const title = winner === 'tie' 
    ? "It's a Tie!" 
    : winner === 'player1' 
      ? 'Player 1 Wins!' 
      : 'Player 2 Wins!'
  const winningScore = winner === 'tie' ? p1Score : winner === 'player1' ? p1Score : p2Score

  return (
    <div className="winner-overlay">
      <div className={`winner-card winner-card--${winnerClass}`}>
        <div className="winner-card__crown">👑</div>
        <h2 className="winner-card__title">{title}</h2>
        <div className="winner-card__score">{winningScore.toLocaleString()}</div>
      </div>
    </div>
  )
}

export const PlayerScores = () => {
  const { player1, player2, getWinner } = usePlayerStore()
  const { phase, timeRemaining, roundDuration } = useGameStore()
  const [p1Hits, setP1Hits] = useState(0)
  const [p2Hits, setP2Hits] = useState(0)

  // Track hits for animation
  useEffect(() => {
    if (player1.sliceCount > 0) {
      setP1Hits(Date.now())
    }
  }, [player1.sliceCount])

  useEffect(() => {
    if (player2.sliceCount > 0) {
      setP2Hits(Date.now())
    }
  }, [player2.sliceCount])

  const timerProgress = (timeRemaining / roundDuration) * 100
  const isLowTime = timeRemaining <= 10

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      <div className="player-scores">
        <PlayerScoreCard
          player="p1"
          score={player1.score}
          combo={player1.combo}
          lastHit={p1Hits}
        />
        
        {/* Center Timer */}
        <div className={`hud-timer hud-timer--versus ${isLowTime ? 'hud-timer--urgent' : ''}`}>
          <svg className="hud-timer__ring" viewBox="0 0 100 100">
            <circle
              className="hud-timer__track"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="6"
            />
            <circle
              className="hud-timer__progress"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="6"
              strokeDasharray={`${timerProgress * 2.83} 283`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <span className="hud-timer__value">{formatTime(timeRemaining)}</span>
        </div>
        
        <PlayerScoreCard
          player="p2"
          score={player2.score}
          combo={player2.combo}
          lastHit={p2Hits}
        />
      </div>

      {phase === 'game-over' && (
        <WinnerOverlay
          winner={getWinner()}
          p1Score={player1.score}
          p2Score={player2.score}
        />
      )}
    </>
  )
}

