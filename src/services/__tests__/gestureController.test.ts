import { GestureController } from '@/services/gestureController'
import type { HandFrame, HandLandmark } from '@/types'

const makeLandmarks = (point: HandLandmark) => {
  const template: HandLandmark = { x: 0, y: 0, z: 0 }
  const landmarks = Array.from({ length: 21 }, () => ({ ...template }))
  landmarks[8] = point
  return landmarks
}

const createFrame = (timestamp: number, point: HandLandmark): HandFrame => ({
  hands: [
    {
      handedness: 'Right',
      score: 1,
      landmarks: makeLandmarks(point),
    },
  ],
  timestamp,
  fps: 60,
})

describe('GestureController', () => {
  it('emits a slice gesture when speed exceeds threshold', () => {
    const controller = new GestureController({
      sliceSpeedThreshold: 0.5,
      minDistance: 0.01,
      cooldownMs: 0,
    })

    expect(controller.processFrame(createFrame(0, { x: 0.1, y: 0.1, z: 0 }))).toHaveLength(0)
    const events = controller.processFrame(createFrame(50, { x: 0.5, y: 0.1, z: 0 }))

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'slice',
      hand: 'Right',
    })
    expect(events[0].direction.x).toBeGreaterThan(0)
  })

  it('respects cooldown between gestures', () => {
    const controller = new GestureController({
      sliceSpeedThreshold: 0.5,
      minDistance: 0.01,
      cooldownMs: 200,
    })

    controller.processFrame(createFrame(0, { x: 0.1, y: 0.1, z: 0 }))
    const first = controller.processFrame(createFrame(50, { x: 0.5, y: 0.1, z: 0 }))
    expect(first).toHaveLength(1)

    const second = controller.processFrame(createFrame(80, { x: 0.9, y: 0.1, z: 0 }))
    expect(second).toHaveLength(0)

    const third = controller.processFrame(createFrame(300, { x: 0.3, y: 0.3, z: 0 }))
    expect(third).toHaveLength(1)
  })

  it('resets internal state when frame is null', () => {
    const controller = new GestureController({
      sliceSpeedThreshold: 0.5,
      minDistance: 0.01,
      cooldownMs: 0,
    })

    controller.processFrame(createFrame(0, { x: 0.1, y: 0.1, z: 0 }))
    controller.processFrame(null)
    const events = controller.processFrame(createFrame(50, { x: 0.5, y: 0.1, z: 0 }))

    expect(events).toHaveLength(0)
  })

  it('tracks multiple hands independently', () => {
    const controller = new GestureController({
      sliceSpeedThreshold: 0.5,
      minDistance: 0.01,
      cooldownMs: 0,
    })

    const dualFrame = (timestamp: number, left: HandLandmark, right: HandLandmark): HandFrame => ({
      hands: [
        {
          handedness: 'Left',
          score: 1,
          landmarks: makeLandmarks(left),
        },
        {
          handedness: 'Right',
          score: 1,
          landmarks: makeLandmarks(right),
        },
      ],
      timestamp,
      fps: 60,
    })

    controller.processFrame(dualFrame(0, { x: 0.1, y: 0.1, z: 0 }, { x: 0.2, y: 0.2, z: 0 }))
    const events = controller.processFrame(
      dualFrame(40, { x: 0.6, y: 0.1, z: 0 }, { x: 0.2, y: 0.9, z: 0 }),
    )

    expect(events).toHaveLength(2)
    const hands = events.map((event) => event.hand).sort()
    expect(hands).toEqual(['Left', 'Right'])
  })
})

