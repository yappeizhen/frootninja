import { create } from 'zustand'
import type { VisionFrame, VisionHand } from '../types/vision'

interface VisionState {
  isReady: boolean
  isStreaming: boolean
  lastFrame?: VisionFrame
  hands: VisionHand[]
  fps: number
  inferenceMs: number
  error?: string
  setReady: (flag: boolean) => void
  setStreaming: (flag: boolean) => void
  setFrame: (frame: VisionFrame) => void
  setError: (message?: string) => void
}

export const useVisionStore = create<VisionState>((set) => ({
  isReady: false,
  isStreaming: false,
  hands: [],
  fps: 0,
  inferenceMs: 0,
  setReady: (flag) => set({ isReady: flag }),
  setStreaming: (flag) => set({ isStreaming: flag }),
  setFrame: (frame) =>
    set({
      lastFrame: frame,
      hands: frame.hands,
      fps: frame.fps,
      inferenceMs: frame.inferenceMs,
    }),
  setError: (message) => set({ error: message }),
}))

