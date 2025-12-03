import { useEffect, useRef } from 'react'
import type { GestureEvent } from '@/types'

const TRAIL_LIFESPAN = 300 // Short, fast trails

interface GestureTrail {
  id: string
  createdAt: number
  start: { x: number; y: number }
  end: { x: number; y: number }
  color: string
  glowColor: string
  width: number
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

export const GestureTrailCanvas = ({ gesture }: { gesture: GestureEvent | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trailsRef = useRef<GestureTrail[]>([])
  const lastGestureId = useRef<string | undefined>(undefined)
  const rafRef = useRef<number | undefined>(undefined)

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
        
        const dprWidth = trail.width * dpr
        
        // Sharp, aggressive fade
        ctx.globalAlpha = 1 - Math.pow(progress, 0.5)
        
        // Main Laser Beam
        ctx.lineWidth = dprWidth * (1 - progress)
        ctx.lineCap = 'butt' // Sharp ends
        ctx.lineJoin = 'miter'
        
        // Outer Glow (Neon)
        ctx.shadowBlur = 25 * dpr
        ctx.shadowColor = trail.glowColor
        ctx.strokeStyle = trail.glowColor
        
        ctx.beginPath()
        ctx.moveTo(trail.start.x * canvas.width, trail.start.y * canvas.height)
        ctx.lineTo(trail.end.x * canvas.width, trail.end.y * canvas.height)
        ctx.stroke()
        
        // Inner Core (White Hot)
        ctx.shadowBlur = 5 * dpr
        ctx.shadowColor = '#ffffff'
        ctx.lineWidth = dprWidth * 0.3 * (1 - progress)
        ctx.strokeStyle = '#ffffff'
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

    // Black-Pink High Contrast Colors
    // Left Hand: Cyan/Ice | Right Hand: Electric Purple
    const glowColor = gesture.hand === 'Left' ? '#00ffff' : '#bf00ff'
    
    const length = 0.25 + gesture.strength * 0.4 // Longer, faster slices
    const endX = clamp01(gesture.origin.x + gesture.direction.x * length)
    const endY = clamp01(gesture.origin.y + gesture.direction.y * length)

    trailsRef.current.push({
      id: gesture.id,
      createdAt: performance.now(),
      start: { x: clamp01(gesture.origin.x), y: clamp01(gesture.origin.y) },
      end: { x: endX, y: endY },
      color: '#ffffff',
      glowColor,
      width: 12 + gesture.strength * 8, // Razor thin to medium
    })
  }, [gesture])

  return <canvas ref={canvasRef} className="playfield-trail-canvas" />
}
