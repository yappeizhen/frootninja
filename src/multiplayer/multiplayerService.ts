/**
 * Multiplayer Service
 * Firestore operations for room management and game sync
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb, isFirebaseEnabled } from '@/services/firebase'
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
    console.warn('Make sure you have set up Firebase environment variables.')
    return null
  }

  const db = getDb()
  if (!db) {
    console.error('Failed to get Firestore database instance')
    return null
  }

  const playerId = getPlayerId()
  const roomCode = generateRoomCode()
  const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  console.log('Creating room:', { roomId, roomCode, playerId, playerName })

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
    await setDoc(doc(db, 'rooms', roomId), roomData)
    console.log('Room created successfully:', roomCode)

    return {
      id: roomId,
      ...roomData,
    }
  } catch (error) {
    console.error('Failed to create room:', error)
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error name:', error.name)
      if ('code' in error) {
        console.error('Error code:', (error as { code: string }).code)
      }
    }
    return null
  }
}

/**
 * Find room by code
 */
export async function findRoomByCode(code: string): Promise<Room | null> {
  if (!isFirebaseEnabled()) return null

  const db = getDb()
  if (!db) return null

  const upperCode = code.toUpperCase()

  try {
    const roomsRef = collection(db, 'rooms')
    const q = query(roomsRef, where('code', '==', upperCode), where('state', '==', 'waiting'))
    const snapshot = await getDocs(q)

    if (snapshot.empty) return null

    const roomDoc = snapshot.docs[0]
    const data = roomDoc.data() as RoomData

    return {
      id: roomDoc.id,
      ...data,
    }
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

  const db = getDb()
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
    const roomRef = doc(db, 'rooms', roomId)
    const snapshot = await getDoc(roomRef)

    if (!snapshot.exists()) return false

    const roomData = snapshot.data() as RoomData
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
    await updateDoc(roomRef, {
      [`players.${playerId}`]: newPlayer,
    })

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

  const db = getDb()
  if (!db) return

  const playerId = getPlayerId()

  try {
    const roomRef = doc(db, 'rooms', roomId)
    const snapshot = await getDoc(roomRef)

    if (!snapshot.exists()) return

    const roomData = snapshot.data() as RoomData
    const playerCount = Object.keys(roomData.players || {}).length

    if (playerCount <= 1) {
      // Last player leaving, delete the room
      await deleteDoc(roomRef)
    } else {
      // Remove just this player by creating new players object without this player
      const updatedPlayers = { ...roomData.players }
      delete updatedPlayers[playerId]

      const updates: Record<string, unknown> = { players: updatedPlayers }

      // If host is leaving, transfer host to remaining player
      if (roomData.hostId === playerId) {
        const remainingPlayers = Object.keys(updatedPlayers)
        if (remainingPlayers.length > 0) {
          updates.hostId = remainingPlayers[0]
        }
      }

      await updateDoc(roomRef, updates)
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

  const db = getDb()
  if (!db) return

  const playerId = getPlayerId()

  try {
    const roomRef = doc(db, 'rooms', roomId)
    await updateDoc(roomRef, {
      [`players.${playerId}.ready`]: ready,
      [`players.${playerId}.lastActivity`]: Date.now(),
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

  const db = getDb()
  if (!db) return false

  const playerId = getPlayerId()

  try {
    const roomRef = doc(db, 'rooms', roomId)
    const snapshot = await getDoc(roomRef)

    if (!snapshot.exists()) return false

    const roomData = snapshot.data() as RoomData

    // Only host can start
    if (roomData.hostId !== playerId) return false

    // Check we have 2 players (players are implicitly ready when they join)
    const players = Object.values(roomData.players || {})
    if (players.length < 2) return false

    // Start countdown
    await updateDoc(roomRef, {
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

  const db = getDb()
  if (!db) return

  try {
    const roomRef = doc(db, 'rooms', roomId)
    await updateDoc(roomRef, { state })
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

  const db = getDb()
  if (!db) return

  const playerId = getPlayerId()

  try {
    const roomRef = doc(db, 'rooms', roomId)
    await updateDoc(roomRef, {
      [`players.${playerId}.score`]: score,
      [`players.${playerId}.combo`]: combo,
      [`players.${playerId}.maxCombo`]: maxCombo,
      [`players.${playerId}.lastActivity`]: Date.now(),
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

  const db = getDb()
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
    // Store last slice in player data (simpler than subcollection for now)
    const roomRef = doc(db, 'rooms', roomId)
    await updateDoc(roomRef, {
      [`players.${playerId}.lastSlice`]: sliceEvent,
    })
  } catch (error) {
    console.error('Failed to report slice:', error)
  }
}

/**
 * End game and declare winner
 */
export async function endGame(roomId: string): Promise<void> {
  if (!isFirebaseEnabled()) return

  const db = getDb()
  if (!db) return

  try {
    const roomRef = doc(db, 'rooms', roomId)
    const snapshot = await getDoc(roomRef)

    if (!snapshot.exists()) return

    const roomData = snapshot.data() as RoomData
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

    await updateDoc(roomRef, {
      state: 'finished' as RoomState,
      endedAt: Date.now(),
      winnerId: winnerId || null,
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
  const db = getDb()
  if (!db) {
    callback(null)
    return () => {}
  }

  const roomRef = doc(db, 'rooms', roomId)

  return onSnapshot(
    roomRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null)
        return
      }

      const data = snapshot.data() as RoomData
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
 * Update player connection status
 */
export async function setPlayerConnected(
  roomId: string,
  connected: boolean
): Promise<void> {
  if (!isFirebaseEnabled()) return

  const db = getDb()
  if (!db) return

  const playerId = getPlayerId()

  try {
    const roomRef = doc(db, 'rooms', roomId)
    await updateDoc(roomRef, {
      [`players.${playerId}.connected`]: connected,
      [`players.${playerId}.lastActivity`]: Date.now(),
    })
  } catch (error) {
    console.error('Failed to update connection status:', error)
  }
}

/**
 * Clean up old/abandoned rooms (call periodically or on app start)
 */
export async function cleanupStaleRooms(): Promise<void> {
  if (!isFirebaseEnabled()) return

  const db = getDb()
  if (!db) return

  const STALE_THRESHOLD = 10 * 60 * 1000 // 10 minutes

  try {
    const roomsRef = collection(db, 'rooms')
    const snapshot = await getDocs(roomsRef)

    const now = Date.now()
    const deletePromises: Promise<void>[] = []

    snapshot.forEach((docSnap) => {
      const room = docSnap.data() as RoomData
      const age = now - room.createdAt

      // Delete rooms that are stale and still in waiting state
      if (room.state === 'waiting' && age > STALE_THRESHOLD) {
        deletePromises.push(deleteDoc(doc(db, 'rooms', docSnap.id)))
      }

      // Delete finished rooms older than threshold
      if (room.state === 'finished' && room.endedAt) {
        const finishedAge = now - room.endedAt
        if (finishedAge > STALE_THRESHOLD) {
          deletePromises.push(deleteDoc(doc(db, 'rooms', docSnap.id)))
        }
      }
    })

    await Promise.all(deletePromises)
    if (deletePromises.length > 0) {
      console.log(`Cleaned up ${deletePromises.length} stale rooms`)
    }
  } catch (error) {
    console.error('Failed to cleanup stale rooms:', error)
  }
}
