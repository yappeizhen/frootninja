import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHandData } from '@/cv'
import { useGameStore } from '@/state/gameStore'
import { useMultiplayerStore } from '@/state/multiplayerStore'
import { useInputModeStore } from '@/state/inputModeStore'
import { FruitLayer } from '@/ui/components/FruitCanvas'
import { StartScreen, GameOverScreen } from '@/ui/components/GameScreens'
import { ChallengeBanner } from '@/ui/components/ChallengeBanner'
import { LoadingScreen } from '@/ui/components/LoadingScreen'

const STATUS_COPY: Record<string, string> = {
  idle: 'Waiting for camera...',
  initializing: 'Loading MediaPipe Hands...',
  ready: 'Tracking active',
  'permission-denied': 'Camera permission denied',
  error: 'Tracking error - check console',
}

export const Playfield = () => {
  const { frame, status, error, videoRef, restart } = useHandData()
  const [localVideo, setLocalVideo] = useState<HTMLVideoElement | null>(null)
  const { phase, isPlaying, score, highScore, challengeTarget, setChallengeTarget, syncHighScore, startRound, tickTimer, reset } = useGameStore()
  const { roomId, roomState } = useMultiplayerStore()
  const { inputMode } = useInputModeStore()
  const timerRef = useRef<number | null>(null)
  const [prevHighScore, setPrevHighScore] = useState(highScore)

  const handsDetected = frame?.hands.length ?? 0
  const isFallbackMode = inputMode === 'fallback'
  
  // Check if multiplayer is active (in a room and game is in progress)
  const isMultiplayerActive = roomId && (roomState === 'countdown' || roomState === 'playing' || roomState === 'finished')

  // Sync high score with Firebase on mount
  useEffect(() => {
    syncHighScore()
  }, [syncHighScore])

  // Detect challenge parameter from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const challengeParam = params.get('challenge')
    
    if (challengeParam) {
      const target = parseInt(challengeParam, 10)
      if (!isNaN(target) && target > 0 && target <= 10000) {
        setChallengeTarget(target)
        // Clean up URL without reloading
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [setChallengeTarget])

  const handleVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef(node)
      setLocalVideo(node)
    },
    [videoRef],
  )

  useEffect(() => {
    if (!localVideo) return
    const updateSize = () => {
      // no-op placeholder if future sizing logic needed
    }
    localVideo.addEventListener('loadedmetadata', updateSize)
    return () => {
      localVideo.removeEventListener('loadedmetadata', updateSize)
    }
  }, [localVideo])

  // Timer tick effect
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = window.setInterval(() => {
        tickTimer()
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isPlaying, tickTimer])

  const handleStart = useCallback(() => {
    setPrevHighScore(highScore)
    startRound()
  }, [startRound, highScore])

  const handleRestart = useCallback(() => {
    setPrevHighScore(highScore)
    reset()
    startRound()
  }, [reset, startRound, highScore])

  const handleBackToMenu = useCallback(() => {
    reset()
  }, [reset])

  const isNewHighScore = phase === 'game-over' && score > prevHighScore

  const banner = useMemo(() => {
    // In fallback mode, don't show camera-related banners
    if (isFallbackMode) {
      return null
    }
    if (error) {
      return {
        tone: 'warning' as const,
        message: error,
        action: 'Retry',
      }
    }
    if (status !== 'ready') {
      return {
        tone: 'muted' as const,
        message: STATUS_COPY[status] ?? 'Initializing...',
      }
    }
    if (handsDetected === 0 && phase === 'idle') {
      return {
        tone: 'info' as const,
        message: 'Show your hand to verify tracking',
      }
    }
    return null
  }, [status, error, handsDetected, phase, isFallbackMode])

  // Don't render solo playfield content when multiplayer is active
  if (isMultiplayerActive) {
    return null
  }

  return (
    <section className={`playfield-stage ${isFallbackMode ? 'playfield-stage--fallback' : ''}`}>
        {/* Only show video when using camera mode */}
        {!isFallbackMode && (
          <video
            ref={handleVideoRef}
            className="playfield-video"
            autoPlay
            muted
            playsInline
          />
        )}
        
        {/* Show gradient background in fallback mode */}
        {isFallbackMode && <div className="playfield-fallback-bg" />}
        
        <FruitLayer />
        
        {/* Challenge banner during gameplay */}
        {phase === 'running' && challengeTarget !== null && (
          <ChallengeBanner />
        )}
        
        {/* Back to Menu button during gameplay */}
        {phase === 'running' && (
          <button 
            className="game-menu-btn"
            onClick={handleBackToMenu}
            aria-label="Back to menu"
          >
            ✕
          </button>
        )}
        
        {/* Loading screen overlay - skip in fallback mode */}
        {status !== 'ready' && !isFallbackMode && (
          <LoadingScreen status={status} error={error} onRetry={restart} />
        )}
        
        {/* Game screens overlay - show in fallback mode even if camera not ready */}
        {phase === 'idle' && (status === 'ready' || isFallbackMode) && (
          <StartScreen onStart={handleStart} />
        )}
        {phase === 'game-over' && (
          <GameOverScreen onRestart={handleRestart} onChangeMode={handleBackToMenu} isNewHighScore={isNewHighScore} />
        )}
        
        {banner && phase !== 'idle' ? (
          <div className={`playfield-banner playfield-banner--${banner.tone}`}>
            <span>{banner.message}</span>
            {banner.action ? (
              <button type="button" onClick={restart}>
                {banner.action}
              </button>
            ) : null}
          </div>
        ) : null}
    </section>
  )
}
