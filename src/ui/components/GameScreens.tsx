import { useState, useEffect, useCallback, useRef } from 'react'
import { useGameStore } from '@/state/gameStore'
import { usePlayerStore } from '@/state/playerStore'
import { useUserStore } from '@/state/userStore'
import { submitScore, getPlayerRank } from '@/services/leaderboardService'
import { isFirebaseEnabled } from '@/services/firebase'
import { UsernamePrompt } from './UsernamePrompt'
import { Leaderboard } from './Leaderboard'

interface StartScreenProps {
  onStart: () => void
}

export const StartScreen = ({ onStart }: StartScreenProps) => {
  const { highScore, gameMode, setGameMode } = useGameStore()
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  if (showLeaderboard) {
    return <Leaderboard onClose={() => setShowLeaderboard(false)} />
  }

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

        <button 
          className="game-screen__link"
          onClick={() => setShowLeaderboard(true)}
        >
          🏆 Global Rankings
        </button>

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
  onChangeMode: () => void
  isNewHighScore: boolean
}

type GameOverView = 'username' | 'results' | 'leaderboard'

// Compute initial view synchronously to avoid setState-in-effect
const getInitialView = (username: string, score: number): GameOverView => {
  if (!username && isFirebaseEnabled() && score > 0) {
    return 'username'
  }
  return 'results'
}

export const GameOverScreen = ({ onRestart, onChangeMode, isNewHighScore }: GameOverScreenProps) => {
  const { score, highScore, combo, gameMode, challengeTarget } = useGameStore()
  const { username, setUsername } = useUserStore()
  const [view, setView] = useState<GameOverView>(() => getInitialView(username, score))
  const [rank, setRank] = useState<number>(0)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')

  const challengeWon = challengeTarget !== null && score > challengeTarget

  const handleShareChallenge = useCallback(async () => {
    const challengeUrl = `${window.location.origin}${window.location.pathname}?challenge=${score}`
    const shareText = `🍉 I scored ${score.toLocaleString()} points in Frootninja! Can you beat my score?`
    
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Frootninja Challenge',
          text: shareText,
          url: challengeUrl,
        })
        return
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }
    
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${challengeUrl}`)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 2000)
    } catch {
      // Clipboard failed, try prompt
      window.prompt('Copy this link to challenge a friend:', challengeUrl)
    }
  }, [score])

  const handleScoreSubmit = useCallback(async (name: string) => {
    if (hasSubmitted || isSubmitting) return
    
    setIsSubmitting(true)
    setUsername(name)
    
    const success = await submitScore(name, score, gameMode)
    if (success) {
      const playerRank = await getPlayerRank(score, gameMode)
      setRank(playerRank)
      setHasSubmitted(true)
    }
    
    setIsSubmitting(false)
    setView('results')
  }, [score, gameMode, setUsername, hasSubmitted, isSubmitting])

  const handleSkipSubmit = useCallback(() => {
    setView('results')
  }, [])

  // Auto-submit on mount if username exists
  const hasAutoSubmitted = useRef(false)
  useEffect(() => {
    if (hasAutoSubmitted.current) return
    if (username && isFirebaseEnabled() && score > 0 && !hasSubmitted) {
      hasAutoSubmitted.current = true
      // Intentionally calling setState in effect for auto-submit flow
      handleScoreSubmit(username) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [username, score, hasSubmitted, handleScoreSubmit])

  // Username prompt view
  if (view === 'username') {
    return (
      <div className="game-screen-overlay">
        <div className="game-screen">
          <UsernamePrompt 
            onSubmit={handleScoreSubmit} 
            onSkip={handleSkipSubmit}
          />
        </div>
      </div>
    )
  }

  // Leaderboard view
  if (view === 'leaderboard') {
    return (
      <Leaderboard 
        onClose={() => setView('results')}
        highlightScore={hasSubmitted ? score : undefined}
        highlightRank={hasSubmitted ? rank : undefined}
      />
    )
  }

  // Results view
  return (
    <div className="game-screen-overlay">
      <div className="game-screen">
        <div className="game-screen__icon">⏱️</div>
        <h1 className="game-screen__title">Time's Up!</h1>

        {challengeTarget !== null && (
          <div className={`game-screen__challenge-result ${challengeWon ? 'game-screen__challenge-result--won' : 'game-screen__challenge-result--lost'}`}>
            <span>{challengeWon ? '🎉' : '😢'}</span>
            <span>{challengeWon ? 'Challenge Complete!' : 'Challenge Failed'}</span>
          </div>
        )}

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
          {rank > 0 && (
            <div className="game-screen__stat">
              <span className="game-screen__stat-value">#{rank}</span>
              <span className="game-screen__stat-label">Global Rank</span>
            </div>
          )}
        </div>

        <div className="game-screen__actions">
          <button className="game-btn" onClick={onRestart}>
            Play Again
          </button>
        </div>

        {/* Secondary actions - compact icon row */}
        <div className="game-screen__secondary-actions">
          {score > 0 && (
            <button 
              className="icon-btn"
              onClick={handleShareChallenge}
              title={shareStatus === 'copied' ? 'Copied!' : 'Challenge a friend'}
            >
              <span className="icon-btn__icon">{shareStatus === 'copied' ? '✓' : '🔗'}</span>
              <span className="icon-btn__label">{shareStatus === 'copied' ? 'Copied' : 'Share'}</span>
            </button>
          )}
          <button 
            className="icon-btn"
            onClick={() => setView('leaderboard')}
            title="View leaderboard"
          >
            <span className="icon-btn__icon">🏆</span>
            <span className="icon-btn__label">Ranks</span>
          </button>
          <button 
            className="icon-btn"
            onClick={onChangeMode}
            title="Back to menu"
          >
            <span className="icon-btn__icon">🏠</span>
            <span className="icon-btn__label">Menu</span>
          </button>
        </div>

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
  onChangeMode: () => void
}

export const VersusGameOverScreen = ({ onRestart, onChangeMode }: VersusGameOverScreenProps) => {
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

        <div className="game-screen__actions">
          <button className="game-btn" onClick={onRestart}>
            Play Again
          </button>
          <button className="game-btn game-btn--secondary" onClick={onChangeMode}>
            Change Mode
          </button>
        </div>
      </div>
    </div>
  )
}
