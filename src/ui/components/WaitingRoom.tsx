/**
 * WaitingRoom Component
 * Lobby where players wait for opponent before starting
 * Players are automatically ready when they join
 */

import { useState, useCallback, useEffect } from 'react'
import { useMultiplayerRoom } from '@/multiplayer'
import { generateInviteLink } from '@/multiplayer/useInviteLink'
import { useInputModeStore } from '@/state/inputModeStore'

interface WaitingRoomProps {
  onBack: () => void
  isVideoConnected?: boolean
}

export const WaitingRoom = ({ onBack, isVideoConnected = false }: WaitingRoomProps) => {
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
  
  const { inputMode } = useInputModeStore()
  const isFallbackMode = inputMode === 'fallback'

  const [copyStatus, setCopyStatus] = useState<'idle' | 'code-copied' | 'link-copied'>('idle')
  const [countdown, setCountdown] = useState<number | null>(null)

  // Auto-ready when joining the room
  useEffect(() => {
    setReady(true)
  }, [setReady])

  // Check if both players are present and video is connected (or in fallback mode)
  const canStart = isHost && opponent && localPlayer && (isVideoConnected || isFallbackMode)

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

  const handleStartGame = useCallback(async () => {
    if (canStart) {
      const success = await startGame()
      if (!success) {
        console.error('Failed to start game')
      }
    }
  }, [canStart, startGame])

  const handleLeave = useCallback(async () => {
    await leaveRoom()
    onBack()
  }, [leaveRoom, onBack])

  const handleCopyCode = useCallback(async () => {
    if (!roomCode) return
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopyStatus('code-copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      // Fallback for older browsers
      window.prompt('Share this code with a friend:', roomCode)
    }
  }, [roomCode])

  const handleCopyLink = useCallback(async () => {
    if (!roomCode) return
    try {
      const link = generateInviteLink(roomCode)
      await navigator.clipboard.writeText(link)
      setCopyStatus('link-copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      // Fallback for older browsers
      const link = generateInviteLink(roomCode)
      window.prompt('Share this invite link with a friend:', link)
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
              title={copyStatus === 'code-copied' ? 'Copied!' : 'Copy code'}
            >
              {copyStatus === 'code-copied' ? '✓' : '📋'}
            </button>
            <button 
              className="waiting-room__copy-btn"
              onClick={handleCopyLink}
              title={copyStatus === 'link-copied' ? 'Link Copied!' : 'Copy invite link'}
            >
              {copyStatus === 'link-copied' ? '✓' : '🔗'}
            </button>
          </div>
          <span className="waiting-room__code-hint">Share the code or invite link with a friend!</span>
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
              <span className="waiting-room__player-name">
                {opponent.name}
                {!isHost && <span className="waiting-room__host-badge">Host</span>}
              </span>
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
        {!opponent && (
          <p className="waiting-room__status">Share the room code with a friend to play!</p>
        )}

        {/* Actions */}
        <div className="waiting-room__actions">
          {isHost && (
            <button 
              className="game-btn game-btn--primary"
              onClick={handleStartGame}
              disabled={!canStart}
            >
              {!opponent 
                ? 'Waiting for opponent...' 
                : !isVideoConnected && !isFallbackMode
                  ? 'Connecting video...'
                  : 'Start Game'}
            </button>
          )}
          
          {!isHost && opponent && (
            <p className="waiting-room__status">
              {isVideoConnected || isFallbackMode ? 'Waiting for host to start...' : 'Connecting video...'}
            </p>
          )}
        </div>
        
        {/* Fallback mode indicator */}
        {isFallbackMode && (
          <p className="waiting-room__fallback-notice">
            🖱️ Playing with mouse/touch input
          </p>
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
