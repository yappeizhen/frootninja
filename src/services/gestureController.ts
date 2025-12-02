import type { GestureEvent, GestureType, HandFrame, HandLandmark, Handedness } from '@/types'

const INDEX_FINGER_TIP = 8

export interface GestureControllerConfig {
  sliceSpeedThreshold: number
  minDistance: number
  cooldownMs: number
}

const defaultConfig: GestureControllerConfig = {
  sliceSpeedThreshold: 1.6,
  minDistance: 0.015,
  cooldownMs: 250,
}

interface MotionState {
  lastPoint?: HandLandmark
  lastTimestamp?: number
  lastGestureAt?: number
}

export class GestureController {
  private config: GestureControllerConfig
  private handStates = new Map<Handedness, MotionState>()
  private idCounter = 0

  constructor(config: Partial<GestureControllerConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  reset() {
    this.handStates.clear()
  }

  processFrame(frame: HandFrame | null): GestureEvent[] {
    if (!frame) {
      this.reset()
      return []
    }

    const events: GestureEvent[] = []
    frame.hands.forEach((hand) => {
      const tip = hand.landmarks[INDEX_FINGER_TIP]
      if (!tip) return

      const state = this.ensureState(hand.handedness)
      const timestamp = frame.timestamp
      if (!state.lastPoint || !state.lastTimestamp) {
        state.lastPoint = tip
        state.lastTimestamp = timestamp
        return
      }

      const dtMs = timestamp - state.lastTimestamp
      if (dtMs <= 0) {
        state.lastPoint = tip
        state.lastTimestamp = timestamp
        return
      }

      const dtSeconds = dtMs / 1000
      const dx = tip.x - state.lastPoint.x
      const dy = tip.y - state.lastPoint.y
      const distance = Math.hypot(dx, dy)
      const speed = distance / dtSeconds

      if (
        distance >= this.config.minDistance &&
        speed >= this.config.sliceSpeedThreshold &&
        this.isOffCooldown(state, timestamp)
      ) {
        const directionMagnitude = Math.max(distance, Number.EPSILON)
        const direction = {
          x: dx / directionMagnitude,
          y: dy / directionMagnitude,
        }
        const strength = Math.min(
          1,
          (speed - this.config.sliceSpeedThreshold) / this.config.sliceSpeedThreshold,
        )
        events.push(
          this.buildEvent('slice', hand.handedness, {
            speed,
            strength,
            direction,
            timestamp,
          }),
        )
        state.lastGestureAt = timestamp
      }

      state.lastPoint = tip
      state.lastTimestamp = timestamp
    })

    return events
  }

  private ensureState(hand: Handedness): MotionState {
    if (!this.handStates.has(hand)) {
      this.handStates.set(hand, {})
    }
    return this.handStates.get(hand)!
  }

  private isOffCooldown(state: MotionState, timestamp: number) {
    if (!state.lastGestureAt) return true
    return timestamp - state.lastGestureAt >= this.config.cooldownMs
  }

  private buildEvent(
    type: GestureType,
    hand: Handedness,
    payload: Omit<GestureEvent, 'id' | 'type' | 'hand'>,
  ): GestureEvent {
    return {
      id: `${type}-${hand}-${this.idCounter++}`,
      type,
      hand,
      ...payload,
    }
  }
}

