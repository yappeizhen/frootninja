/**
 * Multiplayer Service
 * Firebase RTDB operations for room management and game sync
 */

import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  onDisconnect,
  push,
  query,
  orderByChild,
  equalTo,
  type Unsubscribe,
} from 'firebase/database'
import { getRtdb, isFirebaseEnabled } from '@/services/firebase'
import type { Room, RoomData, RoomPlayer, SliceEventMP, RoomState } from './types'
import { generateSeed } from './SeededRNG'

// Room code generation
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude similar chars (I,1,O,0)
const ROOM_CODE_LENGTH = 4

export function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }
  return code
}

// Generate a unique player ID (persisted per device)
export function getPlayerId(): string {
  const key = 'frootninja_player_id'
  let playerId = localStorage.getItem(key)
  if (!playerId) {
    playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem(key, playerId)
  }
  return playerId
}

// Get player name from user store or generate default
export function getPlayerName(): string {
  const stored = localStorage.getItem('frootninja_username')
  return stored || `Player${Math.floor(Math.random() * 1000)}`
}

/**
 * Create a new multiplayer room
 */
export async function createRoom(playerName: string): Promise<Room | null> {
  if (!isFirebaseEnabled()) {
    console.warn('Firebase not configured for multiplayer')
    return null
  }

  const db = getRtdb()
  if (!db) return null

  const playerId = getPlayerId()
  const roomCode = generateRoomCode()
  const roomId = push(ref(db, 'rooms')).key

  if (!roomId) return null

  const initialPlayer: RoomPlayer = {
    id: playerId,
    name: playerName,
    elo: 1000, // Default starting ELO
    ready: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    connected: true,
    lastActivity: Date.now(),
  }

  const roomData: RoomData = {
    code: roomCode,
    state: 'waiting',
    hostId: playerId,
    seed: generateSeed(),
    createdAt: Date.now(),
    players: {
      [playerId]: initialPlayer,
    },
  }

  try {
    await set(ref(db, `rooms/${roomId}`), roomData)

    // Set up disconnect cleanup for this player
    const playerRef = ref(db, `rooms/${roomId}/players/${playerId}/connected`)
    await onDisconnect(playerRef).set(false)

    return {
      id: roomId,
      ...roomData,
    }
  } catch (error) {
    console.error('Failed to create room:', error)
    return null
  }
}

/**
 * Find room by code
 */
export async function findRoomByCode(code: string): Promise<Room | null> {
  if (!isFirebaseEnabled()) return null

  const db = getRtdb()
  if (!db) return null

  const upperCode = code.toUpperCase()

  try {
    const roomsRef = ref(db, 'rooms')
    const roomsQuery = query(roomsRef, orderByChild('code'), equalTo(upperCode))
    const snapshot = await get(roomsQuery)

    if (!snapshot.exists()) return null

    let foundRoom: Room | null = null
    snapshot.forEach((child) => {
      const data = child.val() as RoomData
      // Only return rooms that are still waiting for players
      if (data.state === 'waiting') {
        foundRoom = {
          id: child.key!,
          ...data,
        }
      }
    })

    return foundRoom
  } catch (error) {
    console.error('Failed to find room:', error)
    return null
  }
}

/**
 * Join an existing room
 */
export async function joinRoom(
  roomId: string,
  playerName: string
): Promise<boolean> {
  if (!isFirebaseEnabled()) return false

  const db = getRtdb()
  if (!db) return false

  const playerId = getPlayerId()

  const newPlayer: RoomPlayer = {
    id: playerId,
    name: playerName,
    elo: 1000,
    ready: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    connected: true,
    lastActivity: Date.now(),
  }

  try {
    // Check if room exists and has space
    const roomRef = ref(db, `rooms/${roomId}`)
    const snapshot = await get(roomRef)

    if (!snapshot.exists()) return false

    const roomData = snapshot.val() as RoomData
    const playerCount = Object.keys(roomData.players || {}).length

    if (playerCount >= 2) {
      console.warn('Room is full')
      return false
    }

    if (roomData.state !== 'waiting') {
      console.warn('Room is not accepting players')
      return false
    }

    // Add player to room
    await set(ref(db, `rooms/${roomId}/players/${playerId}`), newPlayer)

    // Set up disconnect cleanup
    const playerRef = ref(db, `rooms/${roomId}/players/${playerId}/connected`)
    await onDisconnect(playerRef).set(false)

    return true
  } catch (error) {
    console.error('Failed to join room:', error)
    return false
  }
}

/**
 * Leave a room
 */
export async function leaveRoom(roomId: string): Promise<void> {
  if (!isFirebaseEnabled()) return

  const db = getRtdb()
  if (!db) return

  const playerId = getPlayerId()

  try {
    const roomRef = ref(db, `rooms/${roomId}`)
    const snapshot = await get(roomRef)

    if (!snapshot.exists()) return

    const roomData = snapshot.val() as RoomData
    const playerCount = Object.keys(roomData.players || {}).length

    if (playerCount <= 1) {
      // Last player leaving, delete the room
      await remove(roomRef)
    } else {
      // Remove just this player
      await remove(ref(db, `rooms/${roomId}/players/${playerId}`))

      // If host is leaving, transfer host to remaining player
      if (roomData.hostId === playerId) {
        const remainingPlayers = Object.keys(roomData.players).filter(
          (id) => id !== playerId
        )
        if (remainingPlayers.length > 0) {
          await update(roomRef, { hostId: remainingPlayers[0] })
        }
      }
    }
  } catch (error) {
    console.error('Failed to leave room:', error)
  }
}

/**
 * Set player ready status
 */
export async function setPlayerReady(
  roomId: string,
  ready: boolean
): Promise<void> {
  if (!isFirebaseEnabled()) return

  const db = getRtdb()
  if (!db) return

  const playerId = getPlayerId()

  try {
    await update(ref(db, `rooms/${roomId}/players/${playerId}`), {
      ready,
      lastActivity: Date.now(),
    })
  } catch (error) {
    console.error('Failed to set ready status:', error)
  }
}

/**
 * Start the game (host only)
 */
export async function startGame(roomId: string): Promise<boolean> {
  if (!isFirebaseEnabled()) return false

  const db = getRtdb()
  if (!db) return false

  const playerId = getPlayerId()

  try {
    const roomRef = ref(db, `rooms/${roomId}`)
    const snapshot = await get(roomRef)

    if (!snapshot.exists()) return false

    const roomData = snapshot.val() as RoomData

    // Only host can start
    if (roomData.hostId !== playerId) return false

    // Check all players are ready
    const players = Object.values(roomData.players || {})
    if (players.length < 2) return false
    if (!players.every((p) => p.ready)) return false

    // Start countdown
    await update(roomRef, {
      state: 'countdown' as RoomState,
      startedAt: Date.now(),
    })

    return true
  } catch (error) {
    console.error('Failed to start game:', error)
    return false
  }
}

/**
 * Update room state
 */
export async function updateRoomState(
  roomId: string,
  state: RoomState
): Promise<void> {
  if (!isFirebaseEnabled()) return

  const db = getRtdb()
  if (!db) return

  try {
    await update(ref(db, `rooms/${roomId}`), { state })
  } catch (error) {
    console.error('Failed to update room state:', error)
  }
}

/**
 * Sync player score during game
 */
export async function syncPlayerScore(
  roomId: string,
  score: number,
  combo: number,
  maxCombo: number
): Promise<void> {
  if (!isFirebaseEnabled()) return

  const db = getRtdb()
  if (!db) return

  const playerId = getPlayerId()

  try {
    await update(ref(db, `rooms/${roomId}/players/${playerId}`), {
      score,
      combo,
      maxCombo,
      lastActivity: Date.now(),
    })
  } catch (error) {
    console.error('Failed to sync score:', error)
  }
}

/**
 * Report a slice event (for opponent visualization)
 */
export async function reportSlice(
  roomId: string,
  fruitId: string,
  position: { x: number; y: number }
): Promise<void> {
  if (!isFirebaseEnabled()) return

  const db = getRtdb()
  if (!db) return

  const playerId = getPlayerId()

  const sliceEvent: SliceEventMP = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    fruitId,
    playerId,
    timestamp: Date.now(),
    position,
  }

  try {
    // Use push to add slice events (auto-cleanup old ones)
    const slicesRef = ref(db, `rooms/${roomId}/players/${playerId}/slices`)
    await push(slicesRef, sliceEvent)
  } catch (error) {
    console.error('Failed to report slice:', error)
  }
}

/**
 * End game and declare winner
 */
export async function endGame(roomId: string): Promise<void> {
  if (!isFirebaseEnabled()) return

  const db = getRtdb()
  if (!db) return

  try {
    const roomRef = ref(db, `rooms/${roomId}`)
    const snapshot = await get(roomRef)

    if (!snapshot.exists()) return

    const roomData = snapshot.val() as RoomData
    const players = Object.values(roomData.players || {})

    // Determine winner
    let winnerId: string | undefined
    if (players.length === 2) {
      const [p1, p2] = players
      if (p1.score > p2.score) {
        winnerId = p1.id
      } else if (p2.score > p1.score) {
        winnerId = p2.id
      }
      // If tied, winnerId stays undefined
    }

    await update(roomRef, {
      state: 'finished' as RoomState,
      endedAt: Date.now(),
      winnerId,
    })
  } catch (error) {
    console.error('Failed to end game:', error)
  }
}

/**
 * Subscribe to room updates
 */
export function subscribeToRoom(
  roomId: string,
  callback: (room: Room | null) => void
): Unsubscribe {
  const db = getRtdb()
  if (!db) {
    callback(null)
    return () => {}
  }

  const roomRef = ref(db, `rooms/${roomId}`)

  return onValue(
    roomRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null)
        return
      }

      const data = snapshot.val() as RoomData
      callback({
        id: roomId,
        ...data,
      })
    },
    (error) => {
      console.error('Room subscription error:', error)
      callback(null)
    }
  )
}

/**
 * Clean up old/abandoned rooms (call periodically or on app start)
 */
export async function cleanupStaleRooms(): Promise<void> {
  if (!isFirebaseEnabled()) return

  const db = getRtdb()
  if (!db) return

  const STALE_THRESHOLD = 5 * 60 * 1000 // 5 minutes

  try {
    const roomsRef = ref(db, 'rooms')
    const snapshot = await get(roomsRef)

    if (!snapshot.exists()) return

    const now = Date.now()
    const deletePromises: Promise<void>[] = []

    snapshot.forEach((child) => {
      const room = child.val() as RoomData
      const age = now - room.createdAt

      // Delete rooms that are stale and still in waiting state
      if (room.state === 'waiting' && age > STALE_THRESHOLD) {
        deletePromises.push(remove(ref(db, `rooms/${child.key}`)))
      }

      // Delete finished rooms older than threshold
      if (room.state === 'finished' && room.endedAt) {
        const finishedAge = now - room.endedAt
        if (finishedAge > STALE_THRESHOLD) {
          deletePromises.push(remove(ref(db, `rooms/${child.key}`)))
        }
      }
    })

    await Promise.all(deletePromises)
  } catch (error) {
    console.error('Failed to cleanup stale rooms:', error)
  }
}

