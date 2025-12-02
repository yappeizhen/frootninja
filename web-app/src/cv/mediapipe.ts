import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision'
import type { VisionHand } from '../types/vision'

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22'
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/hand_landmarker.task'

export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
]

export class MediaPipeHandTracker {
  private landmarker?: HandLandmarker
  private loadPromise?: Promise<void>

  async ensureLoaded() {
    if (this.landmarker) {
      return
    }
    if (!this.loadPromise) {
      this.loadPromise = this.load()
    }
    await this.loadPromise
  }

  private async load() {
    const filesetResolver = await FilesetResolver.forVisionTasks(`${WASM_URL}/wasm`)
    this.landmarker = await HandLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath: HAND_MODEL_URL,
      },
      runningMode: 'VIDEO',
      numHands: 2,
    })
  }

  async detect(video: HTMLVideoElement, timestamp: number): Promise<VisionHand[]> {
    await this.ensureLoaded()
    if (!this.landmarker) {
      return []
    }
    const result = this.landmarker.detectForVideo(video, timestamp)
    return mapResultToHands(result, timestamp)
  }

  close() {
    this.landmarker?.close()
    this.landmarker = undefined
    this.loadPromise = undefined
  }
}

export const mapResultToHands = (
  result: HandLandmarkerResult,
  timestamp: number,
): VisionHand[] => {
  if (!result.landmarks?.length) {
    return []
  }
  return result.landmarks.map((landmarks, index) => {
    const handedness = result.handedness?.[index]?.[0]
    const id = result.handedness?.[index]?.[0]?.categoryName ?? `hand-${index}`
    return {
      id: `${id}-${index}`,
      landmarks,
      handedness: (handedness?.categoryName as VisionHand['handedness']) ?? 'Unknown',
      score: handedness?.score ?? 0,
      worldLandmarks: result.worldLandmarks?.[index],
      timestamp,
    }
  })
}

