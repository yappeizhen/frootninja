/**
 * MultiplayerHUD Component
 * Displays scores, combos, and timer for both players
 */

interface MultiplayerHUDProps {
  myScore: number
  myCombo: number
  opponentScore: number
  opponentCombo: number
  timeRemaining: number
  myName: string
  opponentName: string
}

export const MultiplayerHUD = ({
  myScore,
  myCombo,
  opponentScore,
  opponentCombo,
  timeRemaining,
  myName,
  opponentName,
}: MultiplayerHUDProps) => {
  const isLowTime = timeRemaining <= 10
  const isUrgent = timeRemaining <= 5

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="multiplayer-hud">
      {/* My score (left) */}
      <div className="multiplayer-hud__player multiplayer-hud__player--me">
        <span className="multiplayer-hud__name">{myName}</span>
        <span className="multiplayer-hud__score">{myScore.toLocaleString()}</span>
        {myCombo > 1 && (
          <span className="multiplayer-hud__combo">x{myCombo}</span>
        )}
      </div>

      {/* Timer (center) */}
      <div className={`multiplayer-hud__timer ${isLowTime ? 'multiplayer-hud__timer--low' : ''} ${isUrgent ? 'multiplayer-hud__timer--urgent' : ''}`}>
        <span className="multiplayer-hud__timer-value">{formatTime(timeRemaining)}</span>
      </div>

      {/* Opponent score (right) */}
      <div className="multiplayer-hud__player multiplayer-hud__player--opponent">
        <span className="multiplayer-hud__name">{opponentName}</span>
        <span className="multiplayer-hud__score">{opponentScore.toLocaleString()}</span>
        {opponentCombo > 1 && (
          <span className="multiplayer-hud__combo">x{opponentCombo}</span>
        )}
      </div>
    </div>
  )
}

