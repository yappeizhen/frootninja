import { useGameStore } from '@/state/gameStore'
import { usePlayerStore } from '@/state/playerStore'

interface StartScreenProps {
  onStart: () => void
}

export const StartScreen = ({ onStart }: StartScreenProps) => {
  const { highScore, gameMode, setGameMode } = useGameStore()

  return (
    <div className="game-screen-overlay">
      <div className="game-screen">
        <div className="game-screen__icon">🍉</div>
        <h1 className="game-screen__title">Fruit Ninja</h1>
        <p className="game-screen__subtitle">
          Slice fruits with your hands!<br />
          60 seconds to score as high as you can.
        </p>

        {/* Mode Selection */}
        <div className="game-screen__modes">
          <button
            className={`game-mode-btn ${gameMode === 'solo' ? 'game-mode-btn--active' : ''}`}
            onClick={() => setGameMode('solo')}
          >
            <span className="game-mode-btn__icon">👤</span>
            <span className="game-mode-btn__label">Solo</span>
          </button>
          <button
            className={`game-mode-btn ${gameMode === 'versus' ? 'game-mode-btn--active' : ''}`}
            onClick={() => setGameMode('versus')}
          >
            <span className="game-mode-btn__icon">👥</span>
            <span className="game-mode-btn__label">Versus</span>
          </button>
        </div>

        <button className="game-btn" onClick={onStart}>
          Start Game
        </button>

        {highScore > 0 && gameMode === 'solo' && (
          <div className="game-screen__highscore">
            <span className="game-screen__highscore-label">High Score</span>
            <span className="game-screen__highscore-value">{highScore.toLocaleString()}</span>
          </div>
        )}

        {gameMode === 'versus' && (
          <p className="game-screen__hint">
            Left hand = P1 · Right hand = P2
          </p>
        )}
      </div>
    </div>
  )
}

interface GameOverScreenProps {
  onRestart: () => void
  isNewHighScore: boolean
}

export const GameOverScreen = ({ onRestart, isNewHighScore }: GameOverScreenProps) => {
  const { score, highScore, combo } = useGameStore()

  return (
    <div className="game-screen-overlay">
      <div className="game-screen">
        <div className="game-screen__icon">⏱️</div>
        <h1 className="game-screen__title">Time's Up!</h1>

        {isNewHighScore && (
          <div className="game-screen__new-record">
            <span>🏆</span>
            <span>New High Score!</span>
          </div>
        )}

        <div className="game-screen__stats">
          <div className="game-screen__stat">
            <span className={`game-screen__stat-value ${isNewHighScore ? 'game-screen__stat-value--highlight' : ''}`}>
              {score.toLocaleString()}
            </span>
            <span className="game-screen__stat-label">Final Score</span>
          </div>
          <div className="game-screen__stat">
            <span className="game-screen__stat-value">{combo}</span>
            <span className="game-screen__stat-label">Best Combo</span>
          </div>
        </div>

        <button className="game-btn" onClick={onRestart}>
          Play Again
        </button>

        {!isNewHighScore && highScore > 0 && (
          <div className="game-screen__highscore">
            <span className="game-screen__highscore-label">High Score</span>
            <span className="game-screen__highscore-value">{highScore.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface VersusGameOverScreenProps {
  onRestart: () => void
}

export const VersusGameOverScreen = ({ onRestart }: VersusGameOverScreenProps) => {
  const { player1, player2, getWinner } = usePlayerStore()
  const winner = getWinner()

  const winnerTitle = winner === 'tie' 
    ? "It's a Tie!" 
    : winner === 'player1' 
      ? 'Player 1 Wins!' 
      : 'Player 2 Wins!'

  const winnerClass = winner === 'player1' ? 'p1' : winner === 'player2' ? 'p2' : 'tie'

  return (
    <div className="game-screen-overlay">
      <div className="game-screen">
        <div className="game-screen__icon">👑</div>
        <h1 className={`game-screen__title game-screen__title--${winnerClass}`}>
          {winnerTitle}
        </h1>

        <div className="game-screen__versus-stats">
          <div className={`versus-stat versus-stat--p1 ${winner === 'player1' ? 'versus-stat--winner' : ''}`}>
            <span className="versus-stat__label">Player 1</span>
            <span className="versus-stat__score">{player1.score.toLocaleString()}</span>
            <span className="versus-stat__combo">Best: x{player1.maxCombo}</span>
          </div>
          
          <div className="versus-stat__vs">VS</div>
          
          <div className={`versus-stat versus-stat--p2 ${winner === 'player2' ? 'versus-stat--winner' : ''}`}>
            <span className="versus-stat__label">Player 2</span>
            <span className="versus-stat__score">{player2.score.toLocaleString()}</span>
            <span className="versus-stat__combo">Best: x{player2.maxCombo}</span>
          </div>
        </div>

        <button className="game-btn" onClick={onRestart}>
          Play Again
        </button>
      </div>
    </div>
  )
}
