/**
 * useMultiplayerRoom Hook
 * React hook for subscribing to room state and managing multiplayer game
 */

import { useEffect, useCallback, useRef } from 'react'
import { useMultiplayerStore } from '@/state/multiplayerStore'
import {
  createRoom,
  findRoomByCode,
  joinRoom,
  leaveRoom,
  setPlayerReady,
  startGame,
  syncPlayerScore,
  reportSlice,
  endGame,
  subscribeToRoom,
  getPlayerId,
  cleanupStaleRooms,
} from './multiplayerService'
import type { RoomPlayer } from './types'

export function useMultiplayerRoom() {
  const store = useMultiplayerStore()
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Subscribe to room updates when roomId changes
  useEffect(() => {
    if (!store.roomId) {
      // Clean up any existing subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      return
    }

    // Subscribe to room updates
    unsubscribeRef.current = subscribeToRoom(store.roomId, (room) => {
      if (!room) {
        // Room was deleted
        store.reset()
        return
      }

      const playerId = getPlayerId()
      const players = Object.values(room.players || {})
      const opponent = players.find((p) => p.id !== playerId) || null

      store.setRoom(room)
      store.setOpponent(opponent)
      store.setRoomState(room.state)
      store.setSeed(room.seed)

      // Check if we're the host
      store.setIsHost(room.hostId === playerId)
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [store.roomId])

  // Cleanup stale rooms on mount
  useEffect(() => {
    cleanupStaleRooms()
  }, [])

  const handleCreateRoom = useCallback(
    async (playerName: string): Promise<string | null> => {
      const room = await createRoom(playerName)
      if (room) {
        store.setRoomId(room.id)
        store.setRoomCode(room.code)
        store.setIsHost(true)
        store.setLocalPlayerId(getPlayerId())
        return room.code
      }
      return null
    },
    [store]
  )

  const handleJoinRoom = useCallback(
    async (code: string, playerName: string): Promise<boolean> => {
      const room = await findRoomByCode(code)
      if (!room) {
        return false
      }

      const success = await joinRoom(room.id, playerName)
      if (success) {
        store.setRoomId(room.id)
        store.setRoomCode(room.code)
        store.setIsHost(false)
        store.setLocalPlayerId(getPlayerId())
        return true
      }
      return false
    },
    [store]
  )

  const handleLeaveRoom = useCallback(async () => {
    if (store.roomId) {
      await leaveRoom(store.roomId)
    }
    store.reset()
  }, [store])

  const handleSetReady = useCallback(
    async (ready: boolean) => {
      if (store.roomId) {
        await setPlayerReady(store.roomId, ready)
      }
    },
    [store.roomId]
  )

  const handleStartGame = useCallback(async (): Promise<boolean> => {
    console.log('[handleStartGame] roomId:', store.roomId, 'isHost:', store.isHost)
    if (!store.roomId || !store.isHost) {
      console.log('[handleStartGame] Precondition failed')
      return false
    }
    const result = await startGame(store.roomId)
    console.log('[handleStartGame] Result:', result)
    return result
  }, [store.roomId, store.isHost])

  const handleSyncScore = useCallback(
    async (score: number, combo: number, maxCombo: number) => {
      if (store.roomId) {
        await syncPlayerScore(store.roomId, score, combo, maxCombo)
      }
    },
    [store.roomId]
  )

  const handleReportSlice = useCallback(
    async (fruitId: string, position: { x: number; y: number }) => {
      if (store.roomId) {
        await reportSlice(store.roomId, fruitId, position)
      }
    },
    [store.roomId]
  )

  const handleEndGame = useCallback(async () => {
    if (store.roomId) {
      await endGame(store.roomId)
    }
  }, [store.roomId])

  // Get local player from room
  const getLocalPlayer = useCallback((): RoomPlayer | null => {
    if (!store.room) return null
    const playerId = getPlayerId()
    return store.room.players[playerId] || null
  }, [store.room])

  // Check if both players are ready
  const areBothPlayersReady = useCallback((): boolean => {
    if (!store.room) return false
    const players = Object.values(store.room.players || {})
    return players.length === 2 && players.every((p) => p.ready)
  }, [store.room])

  // Get winner info
  const getWinner = useCallback((): {
    isWinner: boolean
    isTie: boolean
    winnerId: string | null
  } => {
    if (!store.room || store.room.state !== 'finished') {
      return { isWinner: false, isTie: false, winnerId: null }
    }

    const playerId = getPlayerId()
    const winnerId = store.room.winnerId || null
    const isTie = !winnerId
    const isWinner = winnerId === playerId

    return { isWinner, isTie, winnerId }
  }, [store.room])

  return {
    // State
    roomId: store.roomId,
    roomCode: store.roomCode,
    roomState: store.roomState,
    isHost: store.isHost,
    isConnected: store.isConnected,
    opponent: store.opponent,
    seed: store.seed,
    room: store.room,

    // Derived state
    localPlayer: getLocalPlayer(),
    areBothPlayersReady: areBothPlayersReady(),
    winner: getWinner(),

    // Actions
    createRoom: handleCreateRoom,
    joinRoom: handleJoinRoom,
    leaveRoom: handleLeaveRoom,
    setReady: handleSetReady,
    startGame: handleStartGame,
    syncScore: handleSyncScore,
    reportSlice: handleReportSlice,
    endGame: handleEndGame,
  }
}

