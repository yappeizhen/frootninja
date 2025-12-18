/**
 * MultiplayerMenu Component
 * Entry point for multiplayer mode - Create or Join room
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useUserStore } from '@/state/userStore'
import { useMultiplayerStore } from '@/state/multiplayerStore'
import { useMultiplayerRoom } from '@/multiplayer'
import { WaitingRoom } from './WaitingRoom'
import { UsernamePrompt } from './UsernamePrompt'
import { MultiplayerPlayfield } from './MultiplayerPlayfield'

interface MultiplayerMenuProps {
  onBack: () => void
}

type MenuView = 'menu' | 'username' | 'join' | 'waiting'

export const MultiplayerMenu = ({ onBack }: MultiplayerMenuProps) => {
  const { username, setUsername } = useUserStore()
  const { pendingRoomCode, clearPendingRoomCode } = useMultiplayerStore()
  const { roomCode, roomState, createRoom, joinRoom, leaveRoom } = useMultiplayerRoom()
  
  const [view, setView] = useState<MenuView>('menu')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null)
  const hasHandledInvite = useRef(false)
  
  // Handle pending invite code on mount
  useEffect(() => {
    if (pendingRoomCode && !hasHandledInvite.current) {
      hasHandledInvite.current = true
      setJoinCode(pendingRoomCode)
      
      if (username) {
        // Auto-join if we have a username
        handleAutoJoin(pendingRoomCode, username)
      } else {
        // Navigate to username prompt first
        setPendingAction('join')
        setView('username')
      }
    }
  }, [pendingRoomCode, username])
  
  const handleAutoJoin = useCallback(async (code: string, name: string) => {
    setIsLoading(true)
    setError(null)
    
    const success = await joinRoom(code.toUpperCase(), name)
    if (success) {
      clearPendingRoomCode()
      setView('waiting')
    } else {
      // Invalid room code - show join screen with error
      clearPendingRoomCode()
      setView('join')
      setError('Room not found or full. The invite link may have expired.')
    }
    setIsLoading(false)
  }, [joinRoom, clearPendingRoomCode])

  const handleCreateRoom = useCallback(async () => {
    const name = username || 'Player'
    setIsLoading(true)
    setError(null)
    
    const code = await createRoom(name)
    if (code) {
      setView('waiting')
    } else {
      setError('Failed to create room. Please try again.')
    }
    setIsLoading(false)
  }, [username, createRoom])

  const handleJoinRoom = useCallback(async () => {
    if (joinCode.length !== 4) {
      setError('Please enter a 4-character room code')
      return
    }

    const name = username || 'Player'
    setIsLoading(true)
    setError(null)
    
    const success = await joinRoom(joinCode.toUpperCase(), name)
    if (success) {
      setView('waiting')
    } else {
      setError('Room not found or full. Check the code and try again.')
    }
    setIsLoading(false)
  }, [username, joinCode, joinRoom])

  const handleUsernameSubmit = useCallback(async (name: string) => {
    setUsername(name)
    
    // Proceed with pending action
    if (pendingAction === 'create') {
      setIsLoading(true)
      const code = await createRoom(name)
      if (code) {
        setView('waiting')
      } else {
        setError('Failed to create room. Please try again.')
      }
      setIsLoading(false)
    } else if (pendingAction === 'join') {
      // If we have a pre-filled join code from invite link, auto-join
      if (joinCode.length === 4) {
        handleAutoJoin(joinCode, name)
      } else {
        setView('join')
      }
    }
    setPendingAction(null)
  }, [pendingAction, createRoom, setUsername, joinCode, handleAutoJoin])

  const handleCreateClick = useCallback(() => {
    if (!username) {
      setPendingAction('create')
      setView('username')
    } else {
      handleCreateRoom()
    }
  }, [username, handleCreateRoom])

  const handleJoinClick = useCallback(() => {
    if (!username) {
      setPendingAction('join')
      setView('username')
    } else {
      setView('join')
    }
  }, [username])

  const handleLeavePlayfield = useCallback(async () => {
    await leaveRoom()
    setView('menu')
  }, [leaveRoom])

  // Now we can have conditional returns AFTER all hooks

  // If game is in countdown or playing state, show the multiplayer playfield
  if (roomState === 'countdown' || roomState === 'playing' || roomState === 'finished') {
    return <MultiplayerPlayfield onExit={handleLeavePlayfield} />
  }

  // If we're in a room (waiting state), show the waiting room
  if (roomCode || view === 'waiting') {
    return <WaitingRoom onBack={onBack} />
  }

  // Username prompt view
  if (view === 'username') {
    return (
      <div className="game-screen-overlay">
        <div className="game-screen">
          <UsernamePrompt 
            onSubmit={handleUsernameSubmit}
            onSkip={() => {
              setView('menu')
              setPendingAction(null)
            }}
            context="multiplayer"
          />
        </div>
      </div>
    )
  }

  // Join room view
  if (view === 'join') {
    return (
      <div className="game-screen-overlay">
        <div className="game-screen">
          <div className="game-screen__icon">🚪</div>
          <h1 className="game-screen__title">Join Room</h1>
          <p className="game-screen__subtitle">
            Enter the 4-character room code
          </p>

          <div className="multiplayer-menu__join-input">
            <input
              type="text"
              className="multiplayer-menu__code-input"
              placeholder="ABCD"
              value={joinCode}
              onChange={(e) => {
                const value = e.target.value.toUpperCase().slice(0, 4)
                setJoinCode(value)
                setError(null)
              }}
              maxLength={4}
              autoFocus
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="multiplayer-menu__error">{error}</p>
          )}

          <div className="game-screen__actions">
            <button 
              className="game-btn" 
              onClick={handleJoinRoom}
              disabled={isLoading || joinCode.length !== 4}
            >
              {isLoading ? 'Joining...' : 'Join Room'}
            </button>
            <button 
              className="game-btn game-btn--secondary" 
              onClick={() => {
                setView('menu')
                setJoinCode('')
                setError(null)
              }}
              disabled={isLoading}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main menu view
  return (
    <div className="game-screen-overlay">
      <div className="game-screen">
        <div className="game-screen__icon">👥</div>
        <h1 className="game-screen__title">Multiplayer</h1>
        <p className="game-screen__subtitle">
          Play against a friend in real-time!
        </p>

        {error && (
          <p className="multiplayer-menu__error">{error}</p>
        )}

        <div className="multiplayer-menu__options">
          <button 
            className="multiplayer-menu__option"
            onClick={handleCreateClick}
            disabled={isLoading}
          >
            <span className="multiplayer-menu__option-icon">🏠</span>
            <span className="multiplayer-menu__option-text">
              <span className="multiplayer-menu__option-title">Create Room</span>
              <span className="multiplayer-menu__option-desc">Start a new game and invite a friend</span>
            </span>
          </button>

          <button 
            className="multiplayer-menu__option"
            onClick={handleJoinClick}
            disabled={isLoading}
          >
            <span className="multiplayer-menu__option-icon">🚪</span>
            <span className="multiplayer-menu__option-text">
              <span className="multiplayer-menu__option-title">Join Room</span>
              <span className="multiplayer-menu__option-desc">Enter a room code to join</span>
            </span>
          </button>
        </div>

        <button 
          className="game-btn game-btn--secondary" 
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </button>
      </div>
    </div>
  )
}
