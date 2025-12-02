import type { VisionHand } from '../types/vision'

export interface SliceEvent {
  id: string
  hand: VisionHand['handedness']
  point: { x: number; y: number }
  velocity: { x: number; y: number }
  magnitude: number
  timestamp: number
}

const MIN_SPEED = 3
const MIN_VERTICAL_COMPONENT = 1

export class SliceDetector {
  private previous?: { point: { x: number; y: number }; timestamp: number }

  public reset() {
    this.previous = undefined
  }

  public update(hand?: VisionHand): SliceEvent | null {
    if (!hand) {
      this.reset()
      return null
    }

    const tip = hand.landmarks?.[8]
    if (!tip) {
      return null
    }

    const timestamp = hand.timestamp ?? performance.now()

    if (!this.previous) {
      this.previous = { point: { x: tip.x, y: tip.y }, timestamp }
      return null
    }

    const deltaT = (timestamp - this.previous.timestamp) / 1000
    if (deltaT <= 0) {
      return null
    }

    const velocity = {
      x: (tip.x - this.previous.point.x) / deltaT,
      y: (tip.y - this.previous.point.y) / deltaT,
    }
    const magnitude = Math.hypot(velocity.x, velocity.y)
    const verticalComponent = Math.abs(velocity.y)

    this.previous = { point: { x: tip.x, y: tip.y }, timestamp }

    if (magnitude < MIN_SPEED || verticalComponent < MIN_VERTICAL_COMPONENT) {
      return null
    }

    return {
      id: `${hand.id}-${timestamp}`,
      hand: hand.handedness,
      point: { x: 1 - tip.x, y: tip.y },
      velocity,
      magnitude,
      timestamp,
    }
  }
}

