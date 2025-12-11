/**
 * MultiplayerPlayfield Component
 * Split-screen layout for multiplayer mode
 * Shows your game on one side and opponent's synced game on the other
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useHandData } from '@/cv'
import { useGameStore } from '@/state/gameStore'
import { useMultiplayerRoom, SeededRNG, updateRoomState, useWebRTC } from '@/multiplayer'
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
    rematch,
  } = useMultiplayerRoom()

  // Game refs
  const myCanvasRef = useRef<HTMLCanvasElement>(null)
  const opponentCanvasRef = useRef<HTMLCanvasElement>(null)
  const myGameRef = useRef<FruitGame | null>(null)
  const opponentGameRef = useRef<FruitGame | null>(null)
  const timerRef = useRef<number | null>(null)
  const syncIntervalRef = useRef<number | null>(null)
  const gameInitializedRef = useRef(false)

  // Local game state
  const [myScore, setMyScore] = useState(0)
  const [myCombo, setMyCombo] = useState(0)
  const [myMaxCombo, setMyMaxCombo] = useState(0)
  const [gameTime, setGameTime] = useState(30)
  const [isPlaying, setIsPlaying] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [bombHit, setBombHit] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const opponentVideoRef = useRef<HTMLVideoElement>(null)

  // WebRTC for opponent video
  const { remoteStream } = useWebRTC({
    roomId,
    isHost,
    localStream,
    enabled: roomState === 'playing' || roomState === 'countdown',
  })

  // Attach remote stream to opponent video element
  useEffect(() => {
    if (opponentVideoRef.current && remoteStream) {
      console.log('[MultiplayerPlayfield] Attaching remote stream')
      opponentVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  const handleVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      console.log('[MultiplayerPlayfield] Video ref called:', !!node)
      if (node) {
        console.log('[MultiplayerPlayfield] Video element dimensions:', node.clientWidth, 'x', node.clientHeight)
        
        // Add event listeners to debug video state
        node.addEventListener('loadedmetadata', () => {
          console.log('[MultiplayerPlayfield] Video loadedmetadata - actual size:', node.videoWidth, 'x', node.videoHeight)
        })
        node.addEventListener('play', () => {
          console.log('[MultiplayerPlayfield] Video started playing')
        })
        node.addEventListener('error', (e) => {
          console.error('[MultiplayerPlayfield] Video error:', e)
        })
        
        // Check if video already has a stream and capture it for WebRTC
        setTimeout(() => {
          console.log('[MultiplayerPlayfield] Video srcObject:', !!node.srcObject)
          console.log('[MultiplayerPlayfield] Video paused:', node.paused)
          console.log('[MultiplayerPlayfield] Video readyState:', node.readyState)
          
          // Capture local stream for WebRTC
          if (node.srcObject instanceof MediaStream) {
            setLocalStream(node.srcObject)
          }
        }, 1000)
      }
      videoRef(node)
    },
    [videoRef],
  )

  // Initialize games when entering playing state
  useEffect(() => {
    let countdownInterval: number | null = null
    let transitionTimer: number | null = null

    if (roomState === 'countdown') {
      // Reset and start countdown from 3
      setCountdown(3)

      countdownInterval = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return prev
          if (prev <= 1) {
            if (countdownInterval) {
              clearInterval(countdownInterval)
              countdownInterval = null
            }
            return null
          }
          return prev - 1
        })
      }, 1000)

      // Host transitions to playing after countdown (3 seconds)
      if (isHost && roomId) {
        transitionTimer = window.setTimeout(() => {
          updateRoomState(roomId, 'playing')
        }, 3000)
      }
    } else {
      // Ensure countdown overlay is cleared when not in countdown state
      setCountdown(null)
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval)
      if (transitionTimer) clearTimeout(transitionTimer)
    }
  }, [roomState, isHost, roomId])

  // Start game when countdown ends
  useEffect(() => {
    console.log('[MultiplayerPlayfield] roomState:', roomState, 'isPlaying:', isPlaying, 'seed:', seed, 'gameEnded:', gameEnded)
    
    // Don't reinitialize if game has already ended or already initialized
    if (roomState === 'playing' && !isPlaying && seed && !gameEnded && !gameInitializedRef.current) {
      console.log('[MultiplayerPlayfield] Starting game initialization...')
      gameInitializedRef.current = true
      setIsPlaying(true)
      setGameTime(30)
      setMyScore(0)
      setMyCombo(0)
      setMyMaxCombo(0)

      // Delay to ensure canvas is properly rendered and sized in DOM
      setTimeout(() => {
        console.log('[MultiplayerPlayfield] Timeout callback - myCanvas:', !!myCanvasRef.current, 'opponentCanvas:', !!opponentCanvasRef.current)
        
        // Initialize my game with seeded RNG
        if (myCanvasRef.current && !myGameRef.current) {
          const parent = myCanvasRef.current.parentElement
          console.log('[MultiplayerPlayfield] My canvas parent size:', parent?.clientWidth, 'x', parent?.clientHeight)
          
          const game = new FruitGame(myCanvasRef.current)
          const rng = new SeededRNG(seed)
          game.setSeededRNG(rng)
          game.setOnFruitSpawn(() => {
            // Could sync spawn data if needed for opponent view
          })
          game.start()
          myGameRef.current = game
          // Ensure proper sizing after a short delay
          setTimeout(() => game.syncViewport(), 100)
          console.log('[MultiplayerPlayfield] My game started!')
        }

        // Initialize opponent's view with same seed
        if (opponentCanvasRef.current && !opponentGameRef.current) {
          const parent = opponentCanvasRef.current.parentElement
          console.log('[MultiplayerPlayfield] Opponent canvas parent size:', parent?.clientWidth, 'x', parent?.clientHeight)
          
          const game = new FruitGame(opponentCanvasRef.current)
          const rng = new SeededRNG(seed) // Same seed = same spawns
          game.setSeededRNG(rng)
          game.start()
          opponentGameRef.current = game
          // Ensure proper sizing after a short delay
          setTimeout(() => game.syncViewport(), 100)
          console.log('[MultiplayerPlayfield] Opponent game started!')
        }
      }, 100)

      // Score sync is now handled by the useEffect below that watches score changes
      // This avoids stale closure issues
    }
  }, [roomState, isPlaying, seed, gameEnded])

  // Separate effect for game timer to avoid cleanup issues
  useEffect(() => {
    if (isPlaying && roomState === 'playing') {
      console.log('[MultiplayerPlayfield] Starting game timer')
      timerRef.current = window.setInterval(() => {
        setGameTime((prev) => {
          if (prev <= 1) {
            // Time's up - stop timer
            if (timerRef.current) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isPlaying, roomState])

  // Handle gestures for slicing
  useEffect(() => {
    if (!isPlaying || !lastGesture || !myGameRef.current) {
      // Debug: log why we're skipping
      if (lastGesture && isPlaying) {
        console.log('[MultiplayerPlayfield] Gesture detected but no game ref:', !!myGameRef.current)
      }
      return
    }

    console.log('[MultiplayerPlayfield] Processing gesture:', lastGesture.type, 'at', lastGesture.origin.x.toFixed(2), lastGesture.origin.y.toFixed(2))
    const result = myGameRef.current.handleGesture(lastGesture)
    console.log('[MultiplayerPlayfield] Gesture result:', result)
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
    console.log('[MultiplayerPlayfield] handleGameEnd called')
    setGameEnded(true)
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

  // Handle game over when time reaches 0
  useEffect(() => {
    if (gameTime === 0 && isPlaying && !gameEnded) {
      console.log('[MultiplayerPlayfield] Time is up! Ending game...')
      handleGameEnd()
    }
  }, [gameTime, isPlaying, gameEnded, handleGameEnd])

  const handleRematch = useCallback(async () => {
    console.log('[MultiplayerPlayfield] handleRematch called')
    
    // Reset local state
    setMyScore(0)
    setMyCombo(0)
    setMyMaxCombo(0)
    setGameTime(30)
    setIsPlaying(false)
    setCountdown(null)
    setGameEnded(false)
    gameInitializedRef.current = false

    // Dispose old games
    myGameRef.current?.dispose()
    opponentGameRef.current?.dispose()
    myGameRef.current = null
    opponentGameRef.current = null

    // Clear timers
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Reset room state in Firebase (triggers countdown for both players)
    const success = await rematch()
    if (!success) {
      console.error('[MultiplayerPlayfield] Rematch failed')
    }
  }, [rematch])

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

  return (
    <div className="multiplayer-playfield">
      {/* Countdown overlay - rendered on top */}
      {countdown !== null && (
        <div className="multiplayer-countdown-overlay">
          <div className="multiplayer-countdown">
            <span className="multiplayer-countdown__number">{countdown}</span>
          </div>
          <h1 className="multiplayer-countdown__text">Get Ready!</h1>
        </div>
      )}

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
          {/* Opponent's webcam feed via WebRTC */}
          <video
            ref={opponentVideoRef}
            className="multiplayer-playfield__video multiplayer-playfield__video--opponent"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={opponentCanvasRef} className="multiplayer-playfield__canvas" />
          <div className="multiplayer-playfield__label">{opponent?.name || 'OPPONENT'}</div>
          {/* Opponent's last slice indicator */}
          {opponent?.score !== undefined && (
            <div className="multiplayer-playfield__opponent-score">
              {opponent.score.toLocaleString()}
            </div>
          )}
          {/* Connection status indicator */}
          {!remoteStream && (
            <div className="multiplayer-playfield__connecting">
              Connecting video...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

