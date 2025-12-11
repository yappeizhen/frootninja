/**
 * MultiplayerGameOver Component
 * Shows final results after a multiplayer match
 */

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
  const getTitle = () => {
    if (isTie) return "It's a Tie!"
    return isWinner ? '🏆 You Win!' : '😢 You Lose'
  }

  const getTitleClass = () => {
    if (isTie) return 'multiplayer-gameover__title--tie'
    return isWinner ? 'multiplayer-gameover__title--win' : 'multiplayer-gameover__title--lose'
  }

  return (
    <div className="game-screen-overlay">
      <div className="game-screen multiplayer-gameover">
        <div className="game-screen__icon">{isTie ? '🤝' : isWinner ? '🏆' : '💪'}</div>
        <h1 className={`game-screen__title ${getTitleClass()}`}>
          {getTitle()}
        </h1>

        <div className="multiplayer-gameover__stats">
          {/* Your stats */}
          <div className={`multiplayer-gameover__player ${isWinner && !isTie ? 'multiplayer-gameover__player--winner' : ''}`}>
            <span className="multiplayer-gameover__player-label">YOU</span>
            <span className="multiplayer-gameover__player-score">{myScore.toLocaleString()}</span>
            <span className="multiplayer-gameover__player-combo">Best combo: x{myMaxCombo}</span>
          </div>

          <div className="multiplayer-gameover__vs">VS</div>

          {/* Opponent stats */}
          <div className={`multiplayer-gameover__player ${!isWinner && !isTie ? 'multiplayer-gameover__player--winner' : ''}`}>
            <span className="multiplayer-gameover__player-label">{opponentName.toUpperCase()}</span>
            <span className="multiplayer-gameover__player-score">{opponentScore.toLocaleString()}</span>
            <span className="multiplayer-gameover__player-combo">Best combo: x{opponentMaxCombo}</span>
          </div>
        </div>

        <div className="game-screen__actions">
          <button className="game-btn game-btn--primary" onClick={onRematch}>
            Rematch
          </button>
          <button className="game-btn game-btn--secondary" onClick={onLeave}>
            Leave
          </button>
        </div>
      </div>
    </div>
  )
}

