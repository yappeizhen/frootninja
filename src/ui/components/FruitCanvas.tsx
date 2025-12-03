import { useEffect, useRef } from 'react'
import { FruitGame } from '@/game'
import { useGestureDetection } from '@/services/useGestureDetection'
import { GestureTrailCanvas } from '@/ui/components/GestureTrailCanvas'

export const FruitLayer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<FruitGame>()
  const resizeObserverRef = useRef<ResizeObserver>()
  const { lastGesture } = useGestureDetection()

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

  useEffect(() => {
    if (!lastGesture) return
    gameRef.current?.handleGesture(lastGesture)
  }, [lastGesture])

  return (
    <div className="playfield-overlay">
      <canvas ref={canvasRef} className="playfield-fruit-canvas" />
      <GestureTrailCanvas gesture={lastGesture ?? null} />
    </div>
  )
}

