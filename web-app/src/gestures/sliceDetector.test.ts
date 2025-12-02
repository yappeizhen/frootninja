import { describe, expect, it } from 'vitest'
import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { SliceDetector } from './sliceDetector'
import type { VisionHand } from '../types/vision'

const createLandmarks = (tip: { x: number; y: number }): NormalizedLandmark[] => {
  return Array.from({ length: 21 }, (_, index) => ({
    x: index === 8 ? tip.x : 0.5,
    y: index === 8 ? tip.y : 0.5,
    z: 0,
    visibility: 1,
    presence: 1,
  }))
}

const createHand = (tip: { x: number; y: number }, timestamp: number): VisionHand => ({
  id: 'hand-0',
  handedness: 'Right',
  score: 0.9,
  landmarks: createLandmarks(tip),
  timestamp,
})

describe('SliceDetector', () => {
  it('emits a slice event for fast movement', () => {
    const detector = new SliceDetector()
    expect(detector.update(createHand({ x: 0.2, y: 0.8 }, 0))).toBeNull()
    const event = detector.update(createHand({ x: 0.7, y: 0.2 }, 80))
    expect(event).not.toBeNull()
    expect(event?.magnitude).toBeGreaterThan(3)
    expect(event?.point.x).toBeCloseTo(0.3, 1)
  })

  it('ignores slow or jittery movement', () => {
    const detector = new SliceDetector()
    detector.update(createHand({ x: 0.4, y: 0.6 }, 0))
    const event = detector.update(createHand({ x: 0.42, y: 0.58 }, 120))
    expect(event).toBeNull()
  })

  it('resets when hands leave the frame', () => {
    const detector = new SliceDetector()
    detector.update(createHand({ x: 0.1, y: 0.9 }, 0))
    detector.update(undefined)
    const event = detector.update(createHand({ x: 0.8, y: 0.1 }, 100))
    expect(event).toBeNull()
  })
})

