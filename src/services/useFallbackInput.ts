import { useCallback, useRef, useEffect } from 'react'
import type { GestureEvent, Handedness } from '@/types'

const SLICE_SPEED_THRESHOLD = 0.8 // Lower threshold for mouse (easier to slice)
const MIN_DISTANCE = 0.015
const COOLDOWN_MS = 100

interface PointerState {
  lastX: number
  lastY: number
  lastTimestamp: number
  lastGestureAt: number
  isDown: boolean
}

interface UseFallbackInputOptions {
  enabled: boolean
  onGesture: (gesture: GestureEvent) => void
}

/**
 * Hook to provide mouse/touch input as a fallback when camera tracking isn't available.
 * Generates gesture events similar to the hand tracking system.
 */
export const useFallbackInput = ({ enabled, onGesture }: UseFallbackInputOptions) => {
  const containerRef = useRef<HTMLElement | null>(null)
  const stateRef = useRef<PointerState>({
    lastX: 0,
    lastY: 0,
    lastTimestamp: 0,
    lastGestureAt: 0,
    isDown: false,
  })
  const idCounterRef = useRef(0)

  const normalizePosition = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current
    if (!container) return { x: 0.5, y: 0.5 }
    
    const rect = container.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    }
  }, [])

  const createGesture = useCallback((
    x: number,
    y: number,
    dx: number,
    dy: number,
    speed: number
  ): GestureEvent => {
    const id = `fallback-slice-${idCounterRef.current++}`
    const directionMagnitude = Math.max(Math.hypot(dx, dy), Number.EPSILON)
    
    return {
      id,
      type: 'slice',
      hand: 'Right' as Handedness,
      speed,
      strength: Math.min(1, (speed - SLICE_SPEED_THRESHOLD) / SLICE_SPEED_THRESHOLD),
      direction: {
        x: dx / directionMagnitude,
        y: dy / directionMagnitude,
      },
      timestamp: performance.now(),
      origin: { x, y, z: 0.5 },
    }
  }, [])

  const processMovement = useCallback((clientX: number, clientY: number, timestamp: number) => {
    const state = stateRef.current
    if (!state.isDown) return
    
    const { x, y } = normalizePosition(clientX, clientY)
    
    if (state.lastTimestamp === 0) {
      state.lastX = x
      state.lastY = y
      state.lastTimestamp = timestamp
      return
    }
    
    const dtMs = timestamp - state.lastTimestamp
    if (dtMs <= 0) {
      state.lastX = x
      state.lastY = y
      state.lastTimestamp = timestamp
      return
    }
    
    const dtSeconds = dtMs / 1000
    const dx = x - state.lastX
    const dy = y - state.lastY
    const distance = Math.hypot(dx, dy)
    const speed = distance / dtSeconds
    
    const isOffCooldown = timestamp - state.lastGestureAt >= COOLDOWN_MS
    
    if (distance >= MIN_DISTANCE && speed >= SLICE_SPEED_THRESHOLD && isOffCooldown) {
      const gesture = createGesture(x, y, dx, dy, speed)
      onGesture(gesture)
      state.lastGestureAt = timestamp
    }
    
    state.lastX = x
    state.lastY = y
    state.lastTimestamp = timestamp
  }, [normalizePosition, createGesture, onGesture])

  const handlePointerDown = useCallback((e: PointerEvent) => {
    stateRef.current.isDown = true
    stateRef.current.lastTimestamp = 0 // Reset to start fresh
    const { x, y } = normalizePosition(e.clientX, e.clientY)
    stateRef.current.lastX = x
    stateRef.current.lastY = y
    stateRef.current.lastTimestamp = performance.now()
  }, [normalizePosition])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!stateRef.current.isDown) return
    processMovement(e.clientX, e.clientY, performance.now())
  }, [processMovement])

  const handlePointerUp = useCallback(() => {
    stateRef.current.isDown = false
    stateRef.current.lastTimestamp = 0
  }, [])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      stateRef.current.isDown = true
      stateRef.current.lastTimestamp = 0
      const { x, y } = normalizePosition(touch.clientX, touch.clientY)
      stateRef.current.lastX = x
      stateRef.current.lastY = y
      stateRef.current.lastTimestamp = performance.now()
    }
  }, [normalizePosition])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!stateRef.current.isDown || e.touches.length === 0) return
    const touch = e.touches[0]
    processMovement(touch.clientX, touch.clientY, performance.now())
  }, [processMovement])

  const handleTouchEnd = useCallback(() => {
    stateRef.current.isDown = false
    stateRef.current.lastTimestamp = 0
  }, [])

  const attachTo = useCallback((element: HTMLElement | null) => {
    // Clean up previous listeners
    const prevContainer = containerRef.current
    if (prevContainer) {
      prevContainer.removeEventListener('pointerdown', handlePointerDown)
      prevContainer.removeEventListener('pointermove', handlePointerMove)
      prevContainer.removeEventListener('pointerup', handlePointerUp)
      prevContainer.removeEventListener('pointerleave', handlePointerUp)
      prevContainer.removeEventListener('touchstart', handleTouchStart)
      prevContainer.removeEventListener('touchmove', handleTouchMove)
      prevContainer.removeEventListener('touchend', handleTouchEnd)
    }

    containerRef.current = element

    // Attach new listeners if enabled
    if (element && enabled) {
      element.addEventListener('pointerdown', handlePointerDown)
      element.addEventListener('pointermove', handlePointerMove)
      element.addEventListener('pointerup', handlePointerUp)
      element.addEventListener('pointerleave', handlePointerUp)
      element.addEventListener('touchstart', handleTouchStart, { passive: true })
      element.addEventListener('touchmove', handleTouchMove, { passive: true })
      element.addEventListener('touchend', handleTouchEnd)
    }
  }, [
    enabled,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ])

  // Cleanup on unmount or when disabled
  useEffect(() => {
    return () => {
      const container = containerRef.current
      if (container) {
        container.removeEventListener('pointerdown', handlePointerDown)
        container.removeEventListener('pointermove', handlePointerMove)
        container.removeEventListener('pointerup', handlePointerUp)
        container.removeEventListener('pointerleave', handlePointerUp)
        container.removeEventListener('touchstart', handleTouchStart)
        container.removeEventListener('touchmove', handleTouchMove)
        container.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ])

  return { attachTo }
}

