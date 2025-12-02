export type HandTrackingStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'permission-denied'
  | 'error'

export type Handedness = 'Left' | 'Right'

export interface HandLandmark {
  x: number
  y: number
  z: number
}

export interface HandPrediction {
  landmarks: HandLandmark[]
  handedness: Handedness
  score: number
}

export interface HandFrame {
  hands: HandPrediction[]
  timestamp: number
  fps: number
}

export interface TrackingDiagnostics {
  fps: number
  latencyMs: number
  droppedFrames: number
}

