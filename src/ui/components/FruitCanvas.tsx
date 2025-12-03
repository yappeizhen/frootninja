import { useEffect, useRef } from 'react'
import { FruitGame } from '@/game'
import { useGestureDetection } from '@/services/useGestureDetection'
import { GestureTrailCanvas } from '@/ui/components'

export const FruitCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<FruitGame>()
  const { lastGesture } = useGestureDetection()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new FruitGame(canvas)
    game.start()
    gameRef.current = game
    return () => {
      game.dispose()
      gameRef.current = undefined
    }
  }, [])

  useEffect(() => {
    if (!lastGesture) return
    gameRef.current?.handleGesture(lastGesture)
  }, [lastGesture])

  return (
    <section className="game-card">
      <header className="game-card__header">
        <div>
          <p className="eyebrow">Three.js</p>
          <h2>Fruit playground</h2>
        </div>
      </header>
      <div className="game-stage">
        <canvas ref={canvasRef} className="game-canvas" />
        <GestureTrailCanvas gesture={lastGesture ?? null} />
      </div>
      <p className="game-hint">Swipe fast to slice the next fruit spawn.</p>
    </section>
  )
}

