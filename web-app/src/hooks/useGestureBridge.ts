import { useEffect, useRef } from 'react'
import { SliceDetector } from '../gestures/sliceDetector'
import { useVisionStore } from '../state/useVisionStore'
import type { GameController } from '../game/GameController'

export const useGestureBridge = (controller?: GameController) => {
  const hands = useVisionStore((state) => state.hands)
  const detectorRef = useRef(new SliceDetector())

  useEffect(() => {
    if (!controller) {
      return
    }
    const detector = detectorRef.current
    const primaryHand = hands[0]
    const event = detector.update(primaryHand)
    if (event) {
      controller.handleSlice(event)
    }
  }, [controller, hands])
}

