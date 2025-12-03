import { useEffect, useRef } from 'react'
import type { GestureEvent } from '@/types'

const TRAIL_LIFESPAN = 450

interface GestureTrail {
  id: string
  createdAt: number
  start: { x: number; y: number }
  end: { x: number; y: number }
  color: string
  width: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export const GestureTrailCanvas = ({ gesture }: { gesture: GestureEvent | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trailsRef = useRef<GestureTrail[]>([])
  const lastGestureId = useRef<string>()
  const rafRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const parent = canvas.parentElement
      const width = parent ? parent.clientWidth : canvas.clientWidth
      const height = parent ? parent.clientHeight : canvas.clientHeight
      const dpr = window.devicePixelRatio ?? 1
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr
        canvas.height = height * dpr
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const now = performance.now()
      trailsRef.current = trailsRef.current.filter((trail) => {
        const age = now - trail.createdAt
        const progress = age / TRAIL_LIFESPAN
        if (progress >= 1) {
          return false
        }
        ctx.globalAlpha = 1 - progress
        ctx.lineWidth = trail.width * dpr * (1 - progress * 0.5)
        ctx.lineCap = 'round'
        ctx.strokeStyle = trail.color
        ctx.beginPath()
        ctx.moveTo(trail.start.x * canvas.width, trail.start.y * canvas.height)
        ctx.lineTo(trail.end.x * canvas.width, trail.end.y * canvas.height)
        ctx.stroke()
        ctx.globalAlpha = 1
        return true
      })

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!gesture || gesture.id === lastGestureId.current) return
    lastGestureId.current = gesture.id

    const color = gesture.hand === 'Left' ? '#7dd3fc' : '#f472b6'
    const length = 0.18 + gesture.strength * 0.35
    const endX = clamp01(gesture.origin.x + gesture.direction.x * length)
    const endY = clamp01(gesture.origin.y + gesture.direction.y * length)

    trailsRef.current.push({
      id: gesture.id,
      createdAt: performance.now(),
      start: { x: clamp01(gesture.origin.x), y: clamp01(gesture.origin.y) },
      end: { x: endX, y: endY },
      color,
      width: 10 + gesture.strength * 6,
    })
  }, [gesture])

  return <canvas ref={canvasRef} className="game-trail-canvas" />
}

