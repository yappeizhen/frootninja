import { create } from 'zustand'
import type { GamePhase, GameState, GestureEvent, SliceEvent } from '@/types'

const initialState: GameState = {
  phase: 'idle',
  score: 0,
  combo: 0,
  lives: 5,
  level: 1,
  activeFruits: [],
}

interface GameStore extends GameState {
  setPhase: (phase: GamePhase) => void
  setLives: (lives: number) => void
  registerSlice: (event: SliceEvent) => void
  registerGesture: (event: GestureEvent) => void
  reset: () => void
}

export const useGameStore = create<GameStore>()((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setLives: (lives) => set({ lives }),
  registerSlice: (event) =>
    set((state) => ({
      score: Math.max(0, state.score + event.scoreDelta),
      combo: event.scoreDelta > 0 ? state.combo + 1 : 0,
      recentSlice: event,
    })),
  registerGesture: (event) => set({ lastGesture: event }),
  reset: () => set(initialState),
}))

