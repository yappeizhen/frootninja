import { useEffect } from 'react'
import { useGameStore } from '../state/useGameStore'

export const useGameLoop = () => {
  const tick = useGameStore((state) => state.tick)

  useEffect(() => {
    let rafId = 0
    let last = performance.now()
    const loop = (time: number) => {
      tick(time - last)
      last = time
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [tick])
}

