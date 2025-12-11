/**
 * WaitingRoom Component
 * Lobby where players wait and ready up before starting
 */

import { useState, useCallback, useEffect } from 'react'
import { useMultiplayerRoom } from '@/multiplayer'

interface WaitingRoomProps {
  onBack: () => void
}

export const WaitingRoom = ({ onBack }: WaitingRoomProps) => {
  const {
    roomCode,
    roomState,
    isHost,
    opponent,
    localPlayer,
    areBothPlayersReady,
    leaveRoom,
    setReady,
    startGame,
  } = useMultiplayerRoom()

  const [isReady, setIsReady] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const [countdown, setCountdown] = useState<number | null>(null)

  // Handle countdown when game is about to start
  useEffect(() => {
    if (roomState === 'countdown') {
      setCountdown(3)
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval)
            return null
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [roomState])

  // If game is playing, we should transition to the game (handled by parent)
  useEffect(() => {
    if (roomState === 'playing') {
      // Game is starting - parent component should handle this
      console.log('Game starting!')
    }
  }, [roomState])

  const handleReadyToggle = useCallback(async () => {
    const newReady = !isReady
    setIsReady(newReady)
    await setReady(newReady)
  }, [isReady, setReady])

  const handleStartGame = useCallback(async () => {
    if (isHost && areBothPlayersReady) {
      await startGame()
    }
  }, [isHost, areBothPlayersReady, startGame])

  const handleLeave = useCallback(async () => {
    await leaveRoom()
    onBack()
  }, [leaveRoom, onBack])

  const handleCopyCode = useCallback(async () => {
    if (!roomCode) return
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      // Fallback for older browsers
      window.prompt('Share this code with a friend:', roomCode)
    }
  }, [roomCode])

  // Countdown overlay
  if (countdown !== null) {
    return (
      <div className="game-screen-overlay">
        <div className="game-screen">
          <div className="waiting-room__countdown">
            <span className="waiting-room__countdown-number">{countdown}</span>
          </div>
          <h1 className="game-screen__title">Get Ready!</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="game-screen-overlay">
      <div className="game-screen">
        <div className="game-screen__icon">🎮</div>
        <h1 className="game-screen__title">Waiting Room</h1>

        {/* Room Code Display */}
        <div className="waiting-room__code-display">
          <span className="waiting-room__code-label">Room Code</span>
          <div className="waiting-room__code-box">
            <span className="waiting-room__code">{roomCode}</span>
            <button 
              className="waiting-room__copy-btn"
              onClick={handleCopyCode}
              title={copyStatus === 'copied' ? 'Copied!' : 'Copy code'}
            >
              {copyStatus === 'copied' ? '✓' : '📋'}
            </button>
          </div>
          <span className="waiting-room__code-hint">Share this code with a friend!</span>
        </div>

        {/* Players List */}
        <div className="waiting-room__players">
          {/* Local Player */}
          <div className={`waiting-room__player ${isReady ? 'waiting-room__player--ready' : ''}`}>
            <span className="waiting-room__player-icon">👤</span>
            <span className="waiting-room__player-name">
              {localPlayer?.name || 'You'}
              {isHost && <span className="waiting-room__host-badge">Host</span>}
            </span>
            <span className="waiting-room__player-status">
              {isReady ? '✓ Ready' : 'Not Ready'}
            </span>
          </div>

          {/* Opponent */}
          {opponent ? (
            <div className={`waiting-room__player ${opponent.ready ? 'waiting-room__player--ready' : ''}`}>
              <span className="waiting-room__player-icon">👤</span>
              <span className="waiting-room__player-name">{opponent.name}</span>
              <span className="waiting-room__player-status">
                {opponent.ready ? '✓ Ready' : 'Not Ready'}
              </span>
            </div>
          ) : (
            <div className="waiting-room__player waiting-room__player--waiting">
              <span className="waiting-room__player-icon">⏳</span>
              <span className="waiting-room__player-name">Waiting for opponent...</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="waiting-room__actions">
          <button 
            className={`game-btn ${isReady ? 'game-btn--ready' : ''}`}
            onClick={handleReadyToggle}
          >
            {isReady ? 'Not Ready' : 'Ready!'}
          </button>

          {isHost && (
            <button 
              className="game-btn game-btn--primary"
              onClick={handleStartGame}
              disabled={!areBothPlayersReady}
            >
              {areBothPlayersReady ? 'Start Game' : 'Waiting for players...'}
            </button>
          )}
        </div>

        <button 
          className="game-btn game-btn--secondary waiting-room__leave-btn" 
          onClick={handleLeave}
        >
          Leave Room
        </button>
      </div>
    </div>
  )
}

