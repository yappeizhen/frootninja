import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type HandednessLabel = 'Left' | 'Right' | 'Unknown'

export interface VisionHand {
  id: string
  handedness: HandednessLabel
  score: number
  landmarks: NormalizedLandmark[]
  worldLandmarks?: NormalizedLandmark[]
  timestamp: number
}

export interface VisionFrame {
  hands: VisionHand[]
  inferenceMs: number
  fps: number
  timestamp: number
}

export interface GestureEvent {
  id: string
  hand: HandednessLabel
  point: { x: number; y: number }
  velocity: { x: number; y: number }
  magnitude: number
  timestamp: number
}

