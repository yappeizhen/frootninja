import { useState, useEffect, useCallback, useRef } from 'react'
import { useGameStore } from '@/state/gameStore'
import { useUserStore } from '@/state/userStore'
import { submitScore, getPlayerRank } from '@/services/leaderboardService'
import { isFirebaseEnabled } from '@/services/firebase'
import { UsernamePrompt } from './UsernamePrompt'
import { Leaderboard } from './Leaderboard'
import { MultiplayerMenu } from './MultiplayerMenu'

interface StartScreenProps {
  onStart: () => void
}

export const StartScreen = ({ onStart }: StartScreenProps) => {
  const { highScore, gameMode, setGameMode } = useGameStore()
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showMultiplayerMenu, setShowMultiplayerMenu] = useState(false)

  if (showLeaderboard) {
    return <Leaderboard onClose={() => setShowLeaderboard(false)} initialMode={gameMode} />
  }

  if (showMultiplayerMenu) {
    return <MultiplayerMenu onBack={() => {
      setShowMultiplayerMenu(false)
      setGameMode('solo') // Reset to solo when going back
    }} />
  }

  return (
    <div className="game-screen-overlay">
      <div className="game-screen">
        <div className="game-screen__icon">🍉</div>
        <h1 className="game-screen__title">Froot Ninja</h1>
        <p className="game-screen__subtitle">
          Slice fruits with your hands!<br />
          30 seconds to score as high as you can.
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
            className={`game-mode-btn ${gameMode === 'multiplayer' ? 'game-mode-btn--active' : ''}`}
            onClick={() => setGameMode('multiplayer')}
          >
            <span className="game-mode-btn__icon">👥</span>
            <span className="game-mode-btn__label">Multi</span>
          </button>
        </div>

        <button 
          className="game-btn" 
          onClick={() => {
            if (gameMode === 'multiplayer') {
              setShowMultiplayerMenu(true)
            } else {
              onStart()
            }
          }}
        >
          Start Game
        </button>

        {highScore > 0 && gameMode === 'solo' && (
          <div className="game-screen__highscore">
            <span className="game-screen__highscore-label">High Score</span>
            <span className="game-screen__highscore-value">{highScore.toLocaleString()}</span>
          </div>
        )}

        <button 
          className="game-screen__rankings-btn"
          onClick={() => setShowLeaderboard(true)}
        >
          <span>🏆</span>
          <span>Rankings</span>
        </button>
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
  const { score, highScore, combo, gameMode, challengeTarget, lives } = useGameStore()
  const diedFromBombs = lives <= 0
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
        initialMode={gameMode}
        highlightMode={gameMode}
      />
    )
  }

  // Results view
  return (
    <div className="game-screen-overlay">
      <div className="game-screen">
        <div className="game-screen__icon">{diedFromBombs ? '💥' : '⏱️'}</div>
        <h1 className="game-screen__title">{diedFromBombs ? 'Game Over!' : "Time's Up!"}</h1>

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

// Note: VersusGameOverScreen removed - replaced by multiplayer mode
// TODO: Create MultiplayerGameOver.tsx when implementing Phase 4
