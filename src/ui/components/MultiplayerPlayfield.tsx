/**
 * MultiplayerPlayfield Component
 * Split-screen layout for multiplayer mode
 * Shows your game on one side and opponent's synced game on the other
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useHandData } from '@/cv'
import { useGameStore } from '@/state/gameStore'
import { useMultiplayerRoom, SeededRNG, updateRoomState } from '@/multiplayer'
import { FruitGame } from '@/game'
import { useGestureDetection } from '@/services/useGestureDetection'
import { GestureTrailCanvas } from './GestureTrailCanvas'
import { MultiplayerHUD } from './MultiplayerHUD'
import { MultiplayerGameOver } from './MultiplayerGameOver'

interface MultiplayerPlayfieldProps {
  onExit: () => void
}

export const MultiplayerPlayfield = ({ onExit }: MultiplayerPlayfieldProps) => {
  const { videoRef } = useHandData()
  const { lastGesture } = useGestureDetection()
  const { resetCombo, reset } = useGameStore()
  
  const {
    roomId,
    roomState,
    seed,
    opponent,
    localPlayer,
    winner,
    isHost,
    syncScore,
    reportSlice,
    endGame,
    leaveRoom,
  } = useMultiplayerRoom()

  // Game refs
  const myCanvasRef = useRef<HTMLCanvasElement>(null)
  const opponentCanvasRef = useRef<HTMLCanvasElement>(null)
  const myGameRef = useRef<FruitGame | null>(null)
  const opponentGameRef = useRef<FruitGame | null>(null)
  const timerRef = useRef<number | null>(null)
  const syncIntervalRef = useRef<number | null>(null)

  // Local game state
  const [myScore, setMyScore] = useState(0)
  const [myCombo, setMyCombo] = useState(0)
  const [myMaxCombo, setMyMaxCombo] = useState(0)
  const [gameTime, setGameTime] = useState(30)
  const [isPlaying, setIsPlaying] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [bombHit, setBombHit] = useState(false)

  const handleVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef(node)
    },
    [videoRef],
  )

  // Initialize games when entering playing state
  useEffect(() => {
    if (roomState === 'countdown') {
      // Start countdown
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

      // Host transitions to playing after countdown (3 seconds)
      if (isHost && roomId) {
        const transitionTimer = setTimeout(() => {
          updateRoomState(roomId, 'playing')
        }, 3000)
        return () => {
          clearInterval(interval)
          clearTimeout(transitionTimer)
        }
      }

      return () => clearInterval(interval)
    }
  }, [roomState, isHost, roomId])

  // Start game when countdown ends
  useEffect(() => {
    if (roomState === 'playing' && !isPlaying && seed) {
      setIsPlaying(true)
      setGameTime(30)
      setMyScore(0)
      setMyCombo(0)
      setMyMaxCombo(0)

      // Small delay to ensure canvas is properly rendered in DOM
      requestAnimationFrame(() => {
        // Initialize my game with seeded RNG
        if (myCanvasRef.current && !myGameRef.current) {
          const game = new FruitGame(myCanvasRef.current)
          const rng = new SeededRNG(seed)
          game.setSeededRNG(rng)
          game.setOnFruitSpawn(() => {
            // Could sync spawn data if needed for opponent view
          })
          game.start()
          myGameRef.current = game
          // Ensure proper sizing
          game.syncViewport()
        }

        // Initialize opponent's view with same seed
        if (opponentCanvasRef.current && !opponentGameRef.current) {
          const game = new FruitGame(opponentCanvasRef.current)
          const rng = new SeededRNG(seed) // Same seed = same spawns
          game.setSeededRNG(rng)
          game.start()
          opponentGameRef.current = game
          // Ensure proper sizing
          game.syncViewport()
        }
      })

      // Start game timer
      timerRef.current = window.setInterval(() => {
        setGameTime((prev) => {
          if (prev <= 1) {
            // Time's up
            handleGameEnd()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Score sync is now handled by the useEffect below that watches score changes
      // This avoids stale closure issues
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [roomState, isPlaying, seed])

  // Handle gestures for slicing
  useEffect(() => {
    if (!isPlaying || !lastGesture || !myGameRef.current) return

    const result = myGameRef.current.handleGesture(lastGesture)
    if (result) {
      if (result.isBomb) {
        // Hit a bomb
        resetCombo()
        setMyCombo(0)
        setMyScore((prev) => Math.max(0, prev - 10))
        setBombHit(true)
        setTimeout(() => setBombHit(false), 200)
      } else {
        // Sliced a fruit
        const scoreDelta = 10
        const newScore = myScore + scoreDelta
        const newCombo = myCombo + 1
        const newMaxCombo = Math.max(myMaxCombo, newCombo)
        
        setMyScore(newScore)
        setMyCombo(newCombo)
        setMyMaxCombo(newMaxCombo)

        // Report slice for opponent visualization
        if (roomId) {
          reportSlice(result.fruitId, { x: lastGesture.origin.x, y: lastGesture.origin.y })
        }
      }
    }
  }, [lastGesture, isPlaying, myScore, myCombo, myMaxCombo])

  // Sync score immediately when it changes
  useEffect(() => {
    if (isPlaying && roomId) {
      syncScore(myScore, myCombo, myMaxCombo)
    }
  }, [myScore, myCombo, myMaxCombo, isPlaying, roomId, syncScore])

  // Track last processed opponent slice to avoid duplicates
  const lastOpponentSliceRef = useRef<string | null>(null)

  // Watch for opponent slice events and show effects on their game view
  useEffect(() => {
    if (!isPlaying || !opponent?.lastSlice || !opponentGameRef.current) return
    
    const slice = opponent.lastSlice
    // Skip if we've already processed this slice
    if (lastOpponentSliceRef.current === slice.id) return
    lastOpponentSliceRef.current = slice.id

    // Trigger slice effect on opponent's game
    // The opponent's game has the same fruit spawns, so we can simulate the slice
    opponentGameRef.current.triggerSliceEffectAtPosition?.(slice.position.x, slice.position.y)
  }, [isPlaying, opponent?.lastSlice])

  const handleGameEnd = useCallback(async () => {
    setIsPlaying(false)
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
      syncIntervalRef.current = null
    }

    // Stop games
    myGameRef.current?.stop()
    opponentGameRef.current?.stop()

    // Final score sync
    if (roomId) {
      await syncScore(myScore, myCombo, myMaxCombo)
      await endGame()
    }
  }, [roomId, myScore, myCombo, myMaxCombo, syncScore, endGame])

  const handleRematch = useCallback(() => {
    // Reset local state
    setMyScore(0)
    setMyCombo(0)
    setMyMaxCombo(0)
    setGameTime(30)
    setIsPlaying(false)
    setCountdown(null)

    // Dispose old games
    myGameRef.current?.dispose()
    opponentGameRef.current?.dispose()
    myGameRef.current = null
    opponentGameRef.current = null

    // TODO: Implement rematch flow (reset room state to waiting)
  }, [])

  const handleLeave = useCallback(async () => {
    // Cleanup
    myGameRef.current?.dispose()
    opponentGameRef.current?.dispose()
    myGameRef.current = null
    opponentGameRef.current = null

    if (timerRef.current) clearInterval(timerRef.current)
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)

    await leaveRoom()
    reset()
    onExit()
  }, [leaveRoom, reset, onExit])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      myGameRef.current?.dispose()
      opponentGameRef.current?.dispose()
      if (timerRef.current) clearInterval(timerRef.current)
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [])

  // Game over screen
  if (roomState === 'finished') {
    return (
      <MultiplayerGameOver
        myScore={myScore}
        myMaxCombo={myMaxCombo}
        opponentScore={opponent?.score || 0}
        opponentMaxCombo={opponent?.maxCombo || 0}
        opponentName={opponent?.name || 'Opponent'}
        isWinner={winner.isWinner}
        isTie={winner.isTie}
        onRematch={handleRematch}
        onLeave={handleLeave}
      />
    )
  }

  // Countdown overlay
  if (countdown !== null) {
    return (
      <div className="multiplayer-playfield">
        <div className="multiplayer-countdown-overlay">
          <div className="multiplayer-countdown">
            <span className="multiplayer-countdown__number">{countdown}</span>
          </div>
          <h1 className="multiplayer-countdown__text">Get Ready!</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="multiplayer-playfield">
      {/* HUD */}
      <MultiplayerHUD
        myScore={myScore}
        myCombo={myCombo}
        opponentScore={opponent?.score || 0}
        opponentCombo={opponent?.combo || 0}
        timeRemaining={gameTime}
        myName={localPlayer?.name || 'You'}
        opponentName={opponent?.name || 'Opponent'}
      />

      {/* Exit button */}
      <button 
        className="game-menu-btn"
        onClick={handleLeave}
        aria-label="Exit game"
      >
        ✕
      </button>

      {/* Split-screen game areas */}
      <div className="multiplayer-playfield__games">
        {/* My game (left side) */}
        <div className="multiplayer-playfield__my-game">
          <video
            ref={handleVideoRef}
            className="multiplayer-playfield__video"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={myCanvasRef} className="multiplayer-playfield__canvas" />
          <GestureTrailCanvas gesture={lastGesture ?? null} />
          {bombHit && <div className="bomb-flash-overlay" />}
          <div className="multiplayer-playfield__label">YOU</div>
        </div>

        {/* Divider */}
        <div className="multiplayer-playfield__divider" />

        {/* Opponent's game (right side) */}
        <div className="multiplayer-playfield__opponent-game">
          <canvas ref={opponentCanvasRef} className="multiplayer-playfield__canvas" />
          <div className="multiplayer-playfield__label">{opponent?.name || 'OPPONENT'}</div>
          {/* Opponent's last slice indicator */}
          {opponent?.score !== undefined && (
            <div className="multiplayer-playfield__opponent-score">
              {opponent.score.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

