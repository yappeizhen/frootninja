import { create } from 'zustand'

export type Vec3 = [number, number, number]

export interface Fruit {
  id: string
  position: Vec3
  velocity: Vec3
  sliced: boolean
  bornAt: number
  slicedAt?: number
}

interface GameState {
  fruits: Fruit[]
  score: number
  combo: number
  lastSliceAt?: number
  spawnFruit: () => void
  sliceAt: (point: { x: number; y: number }, magnitude: number) => void
  tick: (deltaMs: number) => void
  reset: () => void
}

const GRAVITY = -4.5
const COMBO_WINDOW_MS = 800
const SLICE_RADIUS = 0.65

let fruitCounter = 0
const nextFruitId = () => `fruit-${fruitCounter++}`

const worldFromNormalized = (point: { x: number; y: number }) => ({
  x: (point.x - 0.5) * 3.5,
  y: (0.5 - point.y) * 3.5,
})

export const useGameStore = create<GameState>((set) => ({
  fruits: [],
  score: 0,
  combo: 0,
  spawnFruit: () =>
    set((state) => ({
      fruits: [
        ...state.fruits,
        {
          id: nextFruitId(),
          position: [Math.random() * 2 - 1, -1.5, 0],
          velocity: [
            (Math.random() - 0.5) * 1.2,
            2.6 + Math.random(),
            (Math.random() - 0.5) * 0.4,
          ],
          sliced: false,
          bornAt: Date.now(),
        },
      ],
    })),
  sliceAt: (point, magnitude) =>
    set((state) => {
      const worldPoint = worldFromNormalized(point)
      let sliced = false
      const updatedFruits = state.fruits.map((fruit) => {
        if (fruit.sliced) {
          return fruit
        }
        const distance = Math.hypot(
          fruit.position[0] - worldPoint.x,
          fruit.position[1] - worldPoint.y,
        )
        if (distance < SLICE_RADIUS) {
          sliced = true
          return {
            ...fruit,
            sliced: true,
            slicedAt: Date.now(),
          }
        }
        return fruit
      })

      if (!sliced) {
        return state
      }

      const now = Date.now()
      const withinCombo = state.lastSliceAt && now - state.lastSliceAt < COMBO_WINDOW_MS
      const combo = withinCombo ? state.combo + 1 : 1
      const bonus = Math.max(1, Math.round(magnitude))
      return {
        ...state,
        fruits: updatedFruits,
        score: state.score + 10 * combo + bonus,
        combo,
        lastSliceAt: now,
      }
    }),
  tick: (deltaMs) =>
    set((state) => {
      const dt = Math.min(deltaMs, 32) / 1000
      const fruits = state.fruits
        .map((fruit) => {
          const velocity: Vec3 = [
            fruit.velocity[0],
            fruit.velocity[1] + GRAVITY * dt,
            fruit.velocity[2],
          ]
          const position: Vec3 = [
            fruit.position[0] + velocity[0] * dt,
            fruit.position[1] + velocity[1] * dt,
            fruit.position[2] + velocity[2] * dt,
          ]
          return { ...fruit, velocity, position }
        })
        .filter((fruit) => fruit.position[1] > -3)

      const combo = state.lastSliceAt && Date.now() - state.lastSliceAt > COMBO_WINDOW_MS ? 0 : state.combo

      return {
        ...state,
        fruits,
        combo,
      }
    }),
  reset: () =>
    set({
      fruits: [],
      score: 0,
      combo: 0,
      lastSliceAt: undefined,
    }),
}))

export const selectScore = (state: GameState) => state.score
export const selectCombo = (state: GameState) => state.combo
export const selectFruits = (state: GameState) => state.fruits

