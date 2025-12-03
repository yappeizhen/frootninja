import { useEffect, useRef, useCallback } from 'react'
import { FruitGame } from '@/game'
import { useGestureDetection } from '@/services/useGestureDetection'
import { useGameStore } from '@/state/gameStore'
import { usePlayerStore } from '@/state/playerStore'
import { GestureTrailCanvas } from '@/ui/components/GestureTrailCanvas'
import { GameHUD } from '@/ui/components/GameHUD'
import { PlayerScores } from '@/ui/components/PlayerScores'

export const FruitLayer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<FruitGame | undefined>(undefined)
  const resizeObserverRef = useRef<ResizeObserver | undefined>(undefined)
  const { lastGesture } = useGestureDetection()
  const { isPlaying, gameMode, lives, registerSlice, setLives, endRound } = useGameStore()
  const { registerPlayerSlice } = usePlayerStore()

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

  const handleGesture = useCallback(() => {
    if (!lastGesture || !isPlaying) return
    const result = gameRef.current?.handleGesture(lastGesture)
    if (result) {
      if (result.isBomb) {
        // Hit a bomb - lose a life!
        const newLives = lives - 1
        setLives(newLives)
        
        // End game if no lives left
        if (newLives <= 0) {
          endRound()
        }
      } else {
        const scoreDelta = 10
        
        if (gameMode === 'solo') {
          registerSlice({
            fruitId: result.fruitId,
            scoreDelta,
            slicedAt: Date.now(),
          })
        } else {
          // Versus mode: register to player store based on hand
          registerPlayerSlice(result.hand, scoreDelta)
        }
      }
    }
  }, [lastGesture, isPlaying, gameMode, lives, registerSlice, registerPlayerSlice, setLives, endRound])

  useEffect(() => {
    handleGesture()
  }, [handleGesture])

  return (
    <div className="playfield-overlay">
      <canvas ref={canvasRef} className="playfield-fruit-canvas" />
      <GestureTrailCanvas gesture={lastGesture ?? null} />
      {isPlaying && gameMode === 'solo' && <GameHUD />}
      {isPlaying && gameMode === 'versus' && <PlayerScores />}
    </div>
  )
}
