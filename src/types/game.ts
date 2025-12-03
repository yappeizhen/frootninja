import type { Handedness } from './cv'

export type FruitKind =
  | 'apple'
  | 'orange'
  | 'banana'
  | 'kiwi'
  | 'bomb'

export interface FruitSpawn {
  id: string
  kind: FruitKind
  createdAt: number
  sliced: boolean
  expiresAt: number
}

export type GamePhase = 'idle' | 'calibrating' | 'running' | 'paused' | 'game-over'

export interface SliceEvent {
  fruitId: string
  scoreDelta: number
  slicedAt: number
}

export type GestureType = 'slice'

export interface GestureEvent {
  id: string
  type: GestureType
  hand: Handedness
  speed: number
  strength: number
  direction: { x: number; y: number }
  timestamp: number
  origin: { x: number; y: number; z: number }
}

export interface GameState {
  phase: GamePhase
  score: number
  combo: number
  lives: number
  level: number
  activeFruits: FruitSpawn[]
  recentSlice?: SliceEvent
  lastGesture?: GestureEvent
}

