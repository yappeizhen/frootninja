import { useEffect, useRef, useCallback, useState } from 'react'
import { FruitGame } from '@/game'
import { useGestureDetection } from '@/services/useGestureDetection'
import { useGameStore } from '@/state/gameStore'
import { GestureTrailCanvas } from '@/ui/components/GestureTrailCanvas'
import { GameHUD } from '@/ui/components/GameHUD'

export const FruitLayer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<FruitGame | undefined>(undefined)
  const resizeObserverRef = useRef<ResizeObserver | undefined>(undefined)
  const { lastGesture } = useGestureDetection()
  const { isPlaying, lives, registerSlice, setLives, endRound, resetCombo } = useGameStore()
  const [bombHit, setBombHit] = useState(false)
  const [pointsDocked, setPointsDocked] = useState(false)

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
    if (!lastGesture || !isPlaying) return
    const result = gameRef.current?.handleGesture(lastGesture)
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
  }, [lastGesture, isPlaying, lives, registerSlice, setLives, endRound, resetCombo])

  useEffect(() => {
    handleGesture()
  }, [handleGesture])

  return (
    <div className="playfield-overlay">
      <canvas ref={canvasRef} className="playfield-fruit-canvas" />
      <GestureTrailCanvas gesture={lastGesture ?? null} />
      {isPlaying && <GameHUD bombHit={bombHit} pointsDocked={pointsDocked} />}
      
      {/* Bomb hit flash overlay */}
      {bombHit && <div className="bomb-flash-overlay" />}
    </div>
  )
}
