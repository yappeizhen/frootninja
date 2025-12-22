import { useEffect, useRef, useCallback, useState } from 'react'
import { FruitGame } from '@/game'
import { useGestureDetection } from '@/services/useGestureDetection'
import { useFallbackInput } from '@/services/useFallbackInput'
import { useGameStore } from '@/state/gameStore'
import { useInputModeStore } from '@/state/inputModeStore'
import { GestureTrailCanvas } from '@/ui/components/GestureTrailCanvas'
import { GameHUD } from '@/ui/components/GameHUD'
import type { GestureEvent } from '@/types'

export const FruitLayer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<FruitGame | undefined>(undefined)
  const resizeObserverRef = useRef<ResizeObserver | undefined>(undefined)
  const { lastGesture } = useGestureDetection()
  const { isPlaying, lives, registerSlice, registerGesture, setLives, endRound, resetCombo } = useGameStore()
  const { inputMode, enableCameraMode } = useInputModeStore()
  const [bombHit, setBombHit] = useState(false)
  const [pointsDocked, setPointsDocked] = useState(false)
  const [fallbackGesture, setFallbackGesture] = useState<GestureEvent | null>(null)
  
  const isFallbackMode = inputMode === 'fallback'

  // Callback for fallback input gestures
  const handleFallbackGesture = useCallback((gesture: GestureEvent) => {
    if (!isPlaying) return
    setFallbackGesture(gesture)
    registerGesture(gesture)
  }, [isPlaying, registerGesture])

  // Set up fallback input
  const { attachTo: attachFallbackInput } = useFallbackInput({
    enabled: isFallbackMode && isPlaying,
    onGesture: handleFallbackGesture,
  })

  // Attach fallback input to container
  useEffect(() => {
    if (isFallbackMode) {
      attachFallbackInput(containerRef.current)
    } else {
      attachFallbackInput(null)
    }
  }, [isFallbackMode, attachFallbackInput])

  // Use either camera gesture or fallback gesture
  // For fallback mode, mirror X coordinate since canvas has scaleX(-1) transform
  const activeGesture = isFallbackMode && fallbackGesture
    ? {
        ...fallbackGesture,
        origin: {
          ...fallbackGesture.origin,
          x: 1 - fallbackGesture.origin.x,
        },
        direction: {
          x: -fallbackGesture.direction.x,
          y: fallbackGesture.direction.y,
        },
      }
    : isFallbackMode ? null : lastGesture

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new FruitGame(canvas)
    game.start()
    game.syncViewport()
    gameRef.current = game
    return () => {
      game.dispose()
      gameRef.current = undefined
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const game = gameRef.current
    if (!canvas || !game) return
    const target = canvas.parentElement ?? canvas
    const observer = new ResizeObserver(() => {
      game.syncViewport()
    })
    observer.observe(target)
    resizeObserverRef.current = observer
    return () => observer.disconnect()
  }, [])

  // Control spawning based on game state
  useEffect(() => {
    gameRef.current?.setSpawning(isPlaying)
    if (!isPlaying) {
      gameRef.current?.clearFruits()
    }
  }, [isPlaying])

  // Set up missed fruit callback to reset combo
  useEffect(() => {
    const game = gameRef.current
    if (!game) return
    
    game.setOnFruitMissed(() => {
      if (isPlaying) {
        resetCombo()
      }
    })
    
    return () => {
      game.setOnFruitMissed(null)
    }
  }, [isPlaying, resetCombo])

  const handleGesture = useCallback(() => {
    if (!activeGesture || !isPlaying) return
    const result = gameRef.current?.handleGesture(activeGesture)
    if (result) {
      if (result.isBomb) {
        // Hit a bomb - lose a life, reset combo, and dock points!
        const newLives = lives - 1
        setLives(newLives)
        resetCombo()
        
        // Dock 10 points for hitting a bomb
        registerSlice({
          fruitId: result.fruitId,
          scoreDelta: -10,
          slicedAt: Date.now(),
        })
        
        // Trigger bomb hit visual feedback
        setBombHit(true)
        setPointsDocked(true)
        setTimeout(() => {
          setBombHit(false)
          setPointsDocked(false)
        }, 600)
        
        // End game if no lives left
        if (newLives <= 0) {
          endRound()
        }
      } else {
        const scoreDelta = 10
        registerSlice({
          fruitId: result.fruitId,
          scoreDelta,
          slicedAt: Date.now(),
        })
      }
    }
  }, [activeGesture, isPlaying, lives, registerSlice, setLives, endRound, resetCombo])

  useEffect(() => {
    handleGesture()
  }, [handleGesture])

  // Clear fallback gesture after processing
  useEffect(() => {
    if (fallbackGesture) {
      const timer = setTimeout(() => setFallbackGesture(null), 50)
      return () => clearTimeout(timer)
    }
  }, [fallbackGesture])

  return (
    <div className="playfield-overlay" ref={containerRef}>
      <canvas ref={canvasRef} className="playfield-fruit-canvas" />
      <GestureTrailCanvas gesture={activeGesture ?? null} />
      {isPlaying && <GameHUD bombHit={bombHit} pointsDocked={pointsDocked} />}
      
      {/* Fallback mode indicator */}
      {isFallbackMode && isPlaying && (
        <div className="fallback-mode-badge">
          <span className="fallback-mode-badge__icon">🖱️</span>
          <span className="fallback-mode-badge__text">Mouse Mode</span>
          <button 
            className="fallback-mode-badge__switch"
            onClick={enableCameraMode}
          >
            Use Camera
          </button>
        </div>
      )}
      
      {/* Bomb hit flash overlay */}
      {bombHit && <div className="bomb-flash-overlay" />}
    </div>
  )
}
