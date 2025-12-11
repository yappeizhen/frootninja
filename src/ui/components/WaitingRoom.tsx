/**
 * WaitingRoom Component
 * Lobby where players wait for opponent before starting
 * Players are automatically ready when they join
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
    leaveRoom,
    setReady,
    startGame,
  } = useMultiplayerRoom()

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')
  const [countdown, setCountdown] = useState<number | null>(null)

  // Auto-ready when joining the room
  useEffect(() => {
    setReady(true)
  }, [setReady])

  // Auto-start when both players are in the room (host only)
  useEffect(() => {
    if (isHost && opponent && localPlayer) {
      // Both players are here, start the game after a short delay
      const timer = setTimeout(() => {
        startGame()
      }, 1500) // 1.5 second delay to let players see each other
      return () => clearTimeout(timer)
    }
  }, [isHost, opponent, localPlayer, startGame])

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
          <div className="waiting-room__player waiting-room__player--ready">
            <span className="waiting-room__player-icon">👤</span>
            <span className="waiting-room__player-name">
              {localPlayer?.name || 'You'}
              {isHost && <span className="waiting-room__host-badge">Host</span>}
            </span>
            <span className="waiting-room__player-status">✓ Joined</span>
          </div>

          {/* Opponent */}
          {opponent ? (
            <div className="waiting-room__player waiting-room__player--ready">
              <span className="waiting-room__player-icon">👤</span>
              <span className="waiting-room__player-name">{opponent.name}</span>
              <span className="waiting-room__player-status">✓ Joined</span>
            </div>
          ) : (
            <div className="waiting-room__player waiting-room__player--waiting">
              <span className="waiting-room__player-icon">⏳</span>
              <span className="waiting-room__player-name">Waiting for opponent...</span>
            </div>
          )}
        </div>

        {/* Status message */}
        {opponent ? (
          <p className="waiting-room__status">Starting game...</p>
        ) : (
          <p className="waiting-room__status">Share the room code with a friend to play!</p>
        )}

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
