import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from './useGameStore'

beforeEach(() => {
  useGameStore.getState().reset()
})

describe('useGameStore', () => {
  it('spawns fruit with upward velocity', () => {
    useGameStore.getState().spawnFruit()
    const fruits = useGameStore.getState().fruits
    expect(fruits).toHaveLength(1)
    expect(fruits[0].velocity[1]).toBeGreaterThan(0)
  })

  it('slices fruit near gesture point and updates score', () => {
    useGameStore.setState((state) => ({
      ...state,
      fruits: [
        {
          id: 'test',
          position: [0, 0, 0],
          velocity: [0, 0, 0],
          sliced: false,
          bornAt: 0,
        },
      ],
    }))
    useGameStore.getState().sliceAt({ x: 0.5, y: 0.5 }, 4)
    const { fruits, score, combo } = useGameStore.getState()
    expect(fruits[0].sliced).toBe(true)
    expect(score).toBeGreaterThan(0)
    expect(combo).toBeGreaterThan(0)
  })

  it('drops fruit that fall below the arena', () => {
    useGameStore.setState((state) => ({
      ...state,
      fruits: [
        {
          id: 'low',
          position: [0, -3.2, 0],
          velocity: [0, -1, 0],
          sliced: false,
          bornAt: 0,
        },
      ],
    }))
    useGameStore.getState().tick(32)
    expect(useGameStore.getState().fruits).toHaveLength(0)
  })
})

