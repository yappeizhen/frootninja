import { create } from 'zustand'
import type { Handedness } from '@/types'

export interface PlayerData {
  score: number
  combo: number
  maxCombo: number
  sliceCount: number
}

interface PlayerStore {
  player1: PlayerData
  player2: PlayerData
  registerPlayerSlice: (hand: Handedness, scoreDelta: number) => void
  resetPlayers: () => void
  getWinner: () => 'player1' | 'player2' | 'tie'
}

const initialPlayerData: PlayerData = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  sliceCount: 0,
}

export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  player1: { ...initialPlayerData },
  player2: { ...initialPlayerData },

  registerPlayerSlice: (hand, scoreDelta) => {
    set((state) => {
      // Left hand = Player 1, Right hand = Player 2
      const playerKey = hand === 'Left' ? 'player1' : 'player2'
      const player = state[playerKey]
      
      const newCombo = scoreDelta > 0 ? player.combo + 1 : 0
      const newScore = Math.max(0, player.score + scoreDelta)
      
      return {
        [playerKey]: {
          score: newScore,
          combo: newCombo,
          maxCombo: Math.max(player.maxCombo, newCombo),
          sliceCount: player.sliceCount + 1,
        },
      }
    })
  },

  resetPlayers: () =>
    set({
      player1: { ...initialPlayerData },
      player2: { ...initialPlayerData },
    }),

  getWinner: () => {
    const { player1, player2 } = get()
    if (player1.score > player2.score) return 'player1'
    if (player2.score > player1.score) return 'player2'
    return 'tie'
  },
}))

