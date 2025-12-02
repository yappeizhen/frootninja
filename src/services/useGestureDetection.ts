import { useEffect, useMemo, useRef } from 'react'
import { GestureController } from '@/services/gestureController'
import { useHandData } from '@/cv'
import { useGameStore } from '@/state/gameStore'

export const useGestureDetection = () => {
  const controllerRef = useRef(new GestureController())
  const { frame } = useHandData()
  const registerGesture = useGameStore((state) => state.registerGesture)
  const lastGesture = useGameStore((state) => state.lastGesture)

  useEffect(() => {
    const controller = controllerRef.current
    return () => controller.reset()
  }, [])

  useEffect(() => {
    if (!frame) {
      controllerRef.current.reset()
      return
    }
    const events = controllerRef.current.processFrame(frame)
    events.forEach((event) => registerGesture(event))
  }, [frame, registerGesture])

  return useMemo(() => ({ lastGesture }), [lastGesture])
}

