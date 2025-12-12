/**
 * Multiplayer Store
 * Zustand store for multiplayer game state
 */

import { create } from 'zustand'
import type { Room, RoomPlayer, RoomState, SliceEventMP } from '@/multiplayer/types'

interface MultiplayerStore {
  // Connection state
  roomId: string | null
  roomCode: string | null
  isHost: boolean
  isConnected: boolean
  localPlayerId: string | null

  // Room data
  room: Room | null
  roomState: RoomState
  seed: number | null

  // Opponent data
  opponentId: string | null
  opponent: RoomPlayer | null
  opponentSlices: SliceEventMP[]

  // Setters
  setRoomId: (roomId: string | null) => void
  setRoomCode: (roomCode: string | null) => void
  setIsHost: (isHost: boolean) => void
  setIsConnected: (isConnected: boolean) => void
  setLocalPlayerId: (playerId: string) => void
  setRoom: (room: Room | null) => void
  setRoomState: (state: RoomState) => void
  setSeed: (seed: number | null) => void
  setOpponent: (opponent: RoomPlayer | null) => void
  addOpponentSlice: (slice: SliceEventMP) => void
  clearOpponentSlices: () => void

  // Reset
  reset: () => void
}

const initialState = {
  roomId: null,
  roomCode: null,
  isHost: false,
  isConnected: false,
  localPlayerId: null,
  room: null,
  roomState: 'waiting' as RoomState,
  seed: null,
  opponentId: null,
  opponent: null,
  opponentSlices: [],
}

export const useMultiplayerStore = create<MultiplayerStore>()((set) => ({
  ...initialState,

  setRoomId: (roomId) => set({ roomId, isConnected: !!roomId }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setIsHost: (isHost) => set({ isHost }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setLocalPlayerId: (localPlayerId) => set({ localPlayerId }),
  setRoom: (room) => set({ room }),
  setRoomState: (roomState) => set({ roomState }),
  setSeed: (seed) => set({ seed }),
  setOpponent: (opponent) =>
    set({ opponent, opponentId: opponent?.id || null }),
  addOpponentSlice: (slice) =>
    set((state) => ({
      opponentSlices: [...state.opponentSlices.slice(-20), slice], // Keep last 20 slices
    })),
  clearOpponentSlices: () => set({ opponentSlices: [] }),

  reset: () => set(initialState),
}))

