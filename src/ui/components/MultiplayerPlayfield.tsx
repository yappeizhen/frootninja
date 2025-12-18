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
import { WaitingRoom } from './WaitingRoom'
import type { GestureEvent } from '@/types'

/**
 * Transform gesture coordinates from video frame space to canvas space.
 * This is needed because object-fit: cover crops the video, but MediaPipe
 * reports coordinates relative to the full video frame.
 * 
 * Note: CSS handles the mirroring (scaleX(-1)) for both video and canvas,
 * so we only need to handle the aspect ratio cropping here.
 */
function transformGestureToCanvasSpace(
  gesture: GestureEvent,
  videoElement: HTMLVideoElement | null,
  canvasElement: HTMLCanvasElement | null
): GestureEvent {
  if (!videoElement || !canvasElement) return gesture
  
  const videoWidth = videoElement.videoWidth
  const videoHeight = videoElement.videoHeight
  if (!videoWidth || !videoHeight) return gesture
  
  const containerWidth = canvasElement.clientWidth
  const containerHeight = canvasElement.clientHeight
  if (!containerWidth || !containerHeight) return gesture
  
  const videoAspect = videoWidth / videoHeight
  const containerAspect = containerWidth / containerHeight
  
  let offsetX = 0
  let offsetY = 0
  let scaleX = 1
  let scaleY = 1
  
  if (videoAspect > containerAspect) {
    // Video is wider - horizontal cropping
    const scaledVideoWidth = containerHeight * videoAspect
    const cropAmount = (scaledVideoWidth - containerWidth) / scaledVideoWidth
    offsetX = cropAmount / 2
    scaleX = 1 - cropAmount
  } else {
    // Video is taller - vertical cropping
    const scaledVideoHeight = containerWidth / videoAspect
    const cropAmount = (scaledVideoHeight - containerHeight) / scaledVideoHeight
    offsetY = cropAmount / 2
    scaleY = 1 - cropAmount
  }
  
  // Transform coordinates from video space to canvas space
  const transformedX = (gesture.origin.x - offsetX) / scaleX
  const transformedY = (gesture.origin.y - offsetY) / scaleY
  
  return {
    ...gesture,
    origin: {
      x: Math.max(0, Math.min(1, transformedX)),
      y: Math.max(0, Math.min(1, transformedY)),
      z: gesture.origin.z,
    },
  }
}

interface MultiplayerPlayfieldProps {
  onExit: () => void
}

export const MultiplayerPlayfield = ({ onExit }: MultiplayerPlayfieldProps) => {
  const { videoRef, status: handTrackerStatus } = useHandData()
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
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [opponentVideoElement, setOpponentVideoElement] = useState<HTMLVideoElement | null>(null)
  const [transformedGesture, setTransformedGesture] = useState<GestureEvent | null>(null)

  // WebRTC for opponent video - enable early and keep alive through finished state for rematch
  const { remoteStream, connectionState, reconnect: reconnectWebRTC } = useWebRTC({
    roomId,
    isHost,
    localStream,
    enabled: !!localStream && (roomState === 'waiting' || roomState === 'countdown' || roomState === 'playing' || roomState === 'finished'),
  })

  // Attach remote stream to opponent video element
  // Uses state instead of ref so effect re-runs when video element mounts
  useEffect(() => {
    if (!opponentVideoElement || !remoteStream) return
    
    opponentVideoElement.srcObject = remoteStream
    
    // Explicitly play the video
    opponentVideoElement.play().catch(err => {
      console.error('[MultiplayerPlayfield] Failed to play opponent video:', err)
    })
  }, [remoteStream, opponentVideoElement])

  // Poll for local stream attachment - triggered when video element is assigned
  useEffect(() => {
    if (localStream) return // Already have stream
    if (!videoElement) return // No video element yet
    
    let attempts = 0
    const maxAttempts = 50 // 15 seconds max wait (50 * 300ms)
    
    const checkStream = () => {
      if (videoElement.srcObject instanceof MediaStream) {
        setLocalStream(videoElement.srcObject)
        return true
      }
      return false
    }

    // Check immediately
    if (checkStream()) return

    // Poll for stream
    const timer = window.setInterval(() => {
      if (checkStream()) {
        clearInterval(timer)
      } else if (++attempts >= maxAttempts) {
        console.warn('[MultiplayerPlayfield] Failed to capture local stream after', maxAttempts, 'attempts')
        clearInterval(timer)
      }
    }, 300)

    return () => clearInterval(timer)
  }, [localStream, videoElement])

  const handleVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node) {
        setVideoElement(node) // Trigger the polling effect
        
        node.addEventListener('play', () => {
          // Also try to capture stream when video starts playing
          if (node.srcObject instanceof MediaStream) {
            setLocalStream(node.srcObject)
          }
        })
      } else {
        setVideoElement(null)
      }
      videoRef(node)
    },
    [videoRef],
  )

  // Track previous room state to detect transitions
  const prevRoomStateRef = useRef<typeof roomState | null>(null)

  // Reset local state when room enters countdown (for rematch from both players)
  useEffect(() => {
    const prevState = prevRoomStateRef.current
    prevRoomStateRef.current = roomState

    // Detect transition from finished → countdown (rematch scenario)
    // Also reset on initial countdown if we had a previous game
    if (roomState === 'countdown' && (prevState === 'finished' || gameEnded)) {
      // Reconnect WebRTC for both players on rematch
      // This ensures fresh video connection after game over
      if (connectionState !== 'connected' && connectionState !== 'connecting') {
        reconnectWebRTC()
      }
      
      // Reset local state for this player
      setMyScore(0)
      setMyCombo(0)
      setMyMaxCombo(0)
      setGameTime(30)
      setIsPlaying(false)
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
    }
  }, [roomState, gameEnded])

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
    // Don't reinitialize if game has already ended or already initialized
    if (roomState === 'playing' && !isPlaying && seed && !gameEnded && !gameInitializedRef.current) {
      gameInitializedRef.current = true
      setIsPlaying(true)
      setGameTime(30)
      setMyScore(0)
      setMyCombo(0)
      setMyMaxCombo(0)

      // Delay to ensure canvas is properly rendered and sized in DOM
      setTimeout(() => {
        // Initialize my game with seeded RNG
        if (myCanvasRef.current && !myGameRef.current) {
          const game = new FruitGame(myCanvasRef.current)
          const rng = new SeededRNG(seed)
          game.setSeededRNG(rng)
          
          // On mobile (full-screen layout), use same hitbox as solo mode
          // On desktop (split-screen), use slightly larger hitbox due to aspect ratio differences
          const isMobile = window.innerWidth < 1024
          game.setSliceHitboxRadius(isMobile ? 0.15 : 0.22)
          
          game.setOnFruitSpawn(() => {
            // Could sync spawn data if needed for opponent view
          })
          game.start()
          myGameRef.current = game
          // Ensure proper sizing after a short delay
          setTimeout(() => game.syncViewport(), 100)
        }

        // Initialize opponent's view with same seed
        if (opponentCanvasRef.current && !opponentGameRef.current) {
          const game = new FruitGame(opponentCanvasRef.current)
          const rng = new SeededRNG(seed) // Same seed = same spawns
          game.setSeededRNG(rng)
          game.start()
          opponentGameRef.current = game
          // Ensure proper sizing after a short delay
          setTimeout(() => game.syncViewport(), 100)
        }
      }, 100)

      // Score sync is now handled by the useEffect below that watches score changes
      // This avoids stale closure issues
    }
  }, [roomState, isPlaying, seed, gameEnded])

  // ResizeObserver to keep game viewports synced when window resizes
  useEffect(() => {
    const myCanvas = myCanvasRef.current
    const opponentCanvas = opponentCanvasRef.current
    
    const observer = new ResizeObserver(() => {
      myGameRef.current?.syncViewport()
      opponentGameRef.current?.syncViewport()
    })
    
    if (myCanvas?.parentElement) {
      observer.observe(myCanvas.parentElement)
    }
    if (opponentCanvas?.parentElement) {
      observer.observe(opponentCanvas.parentElement)
    }
    
    return () => observer.disconnect()
  }, [isPlaying])

  // Separate effect for game timer to avoid cleanup issues
  useEffect(() => {
    if (isPlaying && roomState === 'playing') {
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
    if (!lastGesture) {
      setTransformedGesture(null)
      return
    }

    // On mobile (< 1024px), the layout is full-screen like solo mode
    // So we use original coordinates without transformation
    // On desktop split-screen, we need to transform for the aspect ratio difference
    const isMobile = window.innerWidth < 1024
    
    const gestureToUse = isMobile 
      ? lastGesture 
      : transformGestureToCanvasSpace(lastGesture, videoElement, myCanvasRef.current)
    
    setTransformedGesture(gestureToUse)

    if (!isPlaying || !myGameRef.current) {
      return
    }

    // Use the appropriate gesture for hit detection
    let result = myGameRef.current.handleGesture(gestureToUse)
    
    // On desktop, also try original coordinates as fallback
    if (!result && !isMobile) {
      result = myGameRef.current.handleGesture(lastGesture)
    }
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
          reportSlice(result.fruitId, { x: gestureToUse.origin.x, y: gestureToUse.origin.y })
        }
      }
    }
  }, [lastGesture, isPlaying, myScore, myCombo, myMaxCombo, videoElement])

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

    // Trigger slice effect on opponent's game using fruit ID for reliable matching
    // Falls back to position if ID doesn't match (e.g., timing differences)
    opponentGameRef.current.triggerSliceEffectById?.(
      slice.fruitId,
      slice.position.x,
      slice.position.y
    )
  }, [isPlaying, opponent?.lastSlice])

  const handleGameEnd = useCallback(async () => {
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
      handleGameEnd()
    }
  }, [gameTime, isPlaying, gameEnded, handleGameEnd])

  const handleRematch = useCallback(async () => {
    // Reconnect WebRTC if connection is not healthy
    if (connectionState !== 'connected' && connectionState !== 'connecting') {
      reconnectWebRTC()
    }
    
    // Reset room state in Firebase (triggers countdown for both players)
    // Local state reset is handled by the useEffect that watches for roomState === 'countdown'
    const success = await rematch()
    if (!success) {
      console.error('[MultiplayerPlayfield] Rematch failed')
    }
  }, [rematch, connectionState, reconnectWebRTC])

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

  // Waiting room - show lobby UI but keep video element mounted for WebRTC setup
  if (roomState === 'waiting') {
    return (
      <div className="multiplayer-playfield multiplayer-playfield--waiting">
        {/* Hidden video element to capture stream for WebRTC during waiting */}
        <video
          ref={handleVideoRef}
          className="multiplayer-playfield__video multiplayer-playfield__video--hidden"
          autoPlay
          playsInline
          muted
        />
        {/* Waiting room overlay */}
        <WaitingRoom onBack={handleLeave} isVideoConnected={connectionState === 'connected'} />
        {/* WebRTC connection status - shown during waiting */}
        <div className="multiplayer-playfield__webrtc-status">
          <span className={`webrtc-status-dot webrtc-status-dot--${
            handTrackerStatus === 'permission-denied' ? 'failed' 
            : !localStream ? 'initializing' 
            : connectionState
          }`} />
          {handTrackerStatus === 'initializing'
            ? 'Loading camera...'
            : handTrackerStatus === 'permission-denied'
              ? 'Camera access denied'
              : !localStream 
                ? 'Starting camera...'
                : connectionState === 'connected' 
                  ? 'Video connected' 
                  : connectionState === 'connecting' 
                    ? 'Connecting video...'
                    : opponent 
                      ? 'Waiting for opponent video...'
                      : 'Camera ready'}
        </div>
      </div>
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
          <GestureTrailCanvas gesture={transformedGesture} />
          {bombHit && <div className="bomb-flash-overlay" />}
          <div className="multiplayer-playfield__label">YOU</div>
        </div>

        {/* Divider */}
        <div className="multiplayer-playfield__divider" />

        {/* Opponent's game (right side) */}
        <div className="multiplayer-playfield__opponent-game">
          {/* Opponent's webcam feed via WebRTC */}
          <video
            ref={setOpponentVideoElement}
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

