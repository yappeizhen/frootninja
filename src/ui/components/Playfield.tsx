import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHandData } from '@/cv'
import { useGameStore } from '@/state/gameStore'
import { usePlayerStore } from '@/state/playerStore'
import { FruitLayer } from '@/ui/components/FruitCanvas'
import { StartScreen, GameOverScreen, VersusGameOverScreen } from '@/ui/components/GameScreens'

const STATUS_COPY: Record<string, string> = {
  idle: 'Waiting for camera...',
  initializing: 'Loading MediaPipe Hands...',
  ready: 'Tracking active',
  'permission-denied': 'Camera permission denied',
  error: 'Tracking error - check console',
}

export const Playfield = () => {
  const { frame, status, error, videoRef, restart, maxHands } = useHandData()
  const [localVideo, setLocalVideo] = useState<HTMLVideoElement | null>(null)
  const { phase, isPlaying, score, highScore, gameMode, startRound, tickTimer, reset } = useGameStore()
  const { resetPlayers } = usePlayerStore()
  const timerRef = useRef<number | null>(null)
  const [prevHighScore, setPrevHighScore] = useState(highScore)

  const handsDetected = frame?.hands.length ?? 0
  const fpsLabel = frame ? frame.fps.toFixed(0) : '0'

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
    resetPlayers()
    startRound()
  }, [startRound, highScore, resetPlayers])

  const handleRestart = useCallback(() => {
    setPrevHighScore(highScore)
    reset()
    resetPlayers()
    startRound()
  }, [reset, startRound, highScore, resetPlayers])

  const handleBackToMenu = useCallback(() => {
    reset()
    resetPlayers()
  }, [reset, resetPlayers])

  const isNewHighScore = phase === 'game-over' && score > prevHighScore

  const banner = useMemo(() => {
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
  }, [status, error, handsDetected, phase])

  return (
    <section className="playfield-card">
      <div className="playfield-stage">
        <video
          ref={handleVideoRef}
          className="playfield-video"
          autoPlay
          muted
          playsInline
        />
        <FruitLayer />
        
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
        
        {/* Game screens overlay */}
        {phase === 'idle' && status === 'ready' && (
          <StartScreen onStart={handleStart} />
        )}
        {phase === 'game-over' && gameMode === 'solo' && (
          <GameOverScreen onRestart={handleRestart} onChangeMode={handleBackToMenu} isNewHighScore={isNewHighScore} />
        )}
        {phase === 'game-over' && gameMode === 'versus' && (
          <VersusGameOverScreen onRestart={handleRestart} onChangeMode={handleBackToMenu} />
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
      </div>
      <footer className="playfield-footer">
        <div>
          <span className="playfield-label">Status</span>
          <strong>{STATUS_COPY[status] ?? status}</strong>
        </div>
        <div>
          <span className="playfield-label">FPS</span>
          <strong>{fpsLabel}</strong>
        </div>
        <div>
          <span className="playfield-label">Hands</span>
          <strong>
            {handsDetected}/{maxHands}
          </strong>
        </div>
      </footer>
    </section>
  )
}
