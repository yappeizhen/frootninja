import { useGameStore } from '@/state/gameStore'

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface GameHUDProps {
  bombHit?: boolean
}

export const GameHUD = ({ bombHit = false }: GameHUDProps) => {
  const { score, combo, lives, timeRemaining, roundDuration, highScore } = useGameStore()
  
  const timerProgress = (timeRemaining / roundDuration) * 100
  const isLowTime = timeRemaining <= 10
  
  return (
    <div className="game-hud">
      {/* Timer */}
      <div className={`hud-timer ${isLowTime ? 'hud-timer--urgent' : ''}`}>
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

      {/* Score */}
      <div className="hud-score">
        <span className="hud-score__label">Score</span>
        <span className="hud-score__value">{score.toLocaleString()}</span>
        {combo > 1 && (
          <span className="hud-score__combo">x{combo}</span>
        )}
      </div>

      {/* Lives */}
      <div className={`hud-lives ${bombHit ? 'hud-lives--hit' : ''}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`hud-lives__heart ${i < lives ? 'hud-lives__heart--active' : ''} ${bombHit && i === lives ? 'hud-lives__heart--lost' : ''}`}
          >
            ♥
          </span>
        ))}
      </div>

      {/* High Score Badge */}
      {highScore > 0 && (
        <div className="hud-highscore">
          <span className="hud-highscore__label">Best</span>
          <span className="hud-highscore__value">{highScore.toLocaleString()}</span>
        </div>
      )}
    </div>
  )
}
